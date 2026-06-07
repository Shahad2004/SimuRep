import { supabase } from '../lib/supabase.js';
import { getInstructorId } from '../lib/instructor.js';
import {
  classRowToClient,
  clientLabToRow,
  clientPlayerToRow,
  labRowToClient,
  liveSessionFromDb,
  playerRowToClient,
} from '../lib/mappers.js';

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

async function loadInstructorClassesData(instructorId) {
  const { data: classRows, error: classError } = await supabase
    .from('classes')
    .select('*')
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false });

  if (classError) throw classError;
  if (!classRows?.length) return [];

  const classDbIds = classRows.map((c) => c.id);
  const { data: labRows, error: labError } = await supabase
    .from('labs')
    .select('*')
    .in('class_id', classDbIds)
    .order('created_at', { ascending: false });

  if (labError) throw labError;

  return classRows.map((c) => classRowToClient(c, labRows || []));
}

async function findLabByClientOrDbId(labId) {
  const { data: byUuid } = await supabase.from('labs').select('*, classes(*)').eq('id', labId).maybeSingle();
  if (byUuid) {
    return { labRow: byUuid, classRow: byUuid.classes };
  }

  const { data: labs, error } = await supabase.from('labs').select('*, classes(*)');
  if (error) throw error;

  const match = (labs || []).find((l) => {
    const config = l.lab_config || {};
    return config.id === labId;
  });

  if (!match) return null;
  return { labRow: match, classRow: match.classes };
}

async function ensureLabSession(labRow, classRow, instructorId) {
  const { data: existing } = await supabase
    .from('lab_sessions')
    .select('*')
    .eq('lab_id', labRow.id)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('lab_sessions')
    .insert({
      lab_id: labRow.id,
      session_pin: labRow.session_pin,
      instructor_id: instructorId,
      scenario_id: labRow.scenario_id,
      level3_status: 'idle',
    })
    .select('*')
    .single();

  if (error) throw error;
  return created;
}

export function registerApiRoutes(app) {
  app.get('/api/classes', async (_req, res) => {
    try {
      const instructorId = await getInstructorId();
      const classes = await loadInstructorClassesData(instructorId);
      res.json({ ok: true, classes });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.put('/api/classes', async (req, res) => {
    try {
      const instructorId = await getInstructorId();
      const incoming = Array.isArray(req.body?.classes) ? req.body.classes : [];

      const { data: existingClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('instructor_id', instructorId);

      const { data: existingLabs } = await supabase
        .from('labs')
        .select('id, class_id, lab_config')
        .eq('instructor_id', instructorId);

      const incomingClassIds = new Set(incoming.map((c) => c.id));
      const incomingLabClientIds = new Set(incoming.flatMap((c) => c.labs.map((l) => l.id)));

      for (const cls of existingClasses || []) {
        if (!incomingClassIds.has(cls.id)) {
          await supabase.from('classes').delete().eq('id', cls.id);
        }
      }

      for (const lab of existingLabs || []) {
        const clientId = lab.lab_config?.id || lab.id;
        if (!incomingLabClientIds.has(clientId) && !incomingLabClientIds.has(lab.id)) {
          await supabase.from('labs').delete().eq('id', lab.id);
        }
      }

      const classIdMap = new Map();

      for (const cls of incoming) {
        const existing = (existingClasses || []).find((c) => c.id === cls.id);

        if (existing) {
          await supabase
            .from('classes')
            .update({ name: cls.name, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          classIdMap.set(cls.id, existing.id);
        } else {
          const { data: created, error } = await supabase
            .from('classes')
            .insert({
              instructor_id: instructorId,
              name: cls.name,
              created_at: cls.createdAt || new Date().toISOString(),
            })
            .select('id')
            .single();
          if (error) throw error;
          classIdMap.set(cls.id, created.id);
        }
      }

      for (const cls of incoming) {
        const classDbId = classIdMap.get(cls.id);
        if (!classDbId) continue;

        for (const lab of cls.labs) {
          const existingLab = (existingLabs || []).find(
            (l) => l.lab_config?.id === lab.id || (isUuid(lab.id) && l.id === lab.id),
          );

          const row = clientLabToRow(lab, classDbId, instructorId);

          if (existingLab) {
            const { data: current } = await supabase
              .from('labs')
              .select('lab_config')
              .eq('id', existingLab.id)
              .single();
            row.lab_config = {
              ...(current?.lab_config || {}),
              ...row.lab_config,
              id: lab.id,
            };
            const { error } = await supabase.from('labs').update(row).eq('id', existingLab.id);
            if (error) throw error;
          } else {
            row.lab_config = { ...row.lab_config, id: lab.id };
            const { error } = await supabase.from('labs').insert(row);
            if (error) throw error;
          }
        }
      }

      const classes = await loadInstructorClassesData(instructorId);
      res.json({ ok: true, classes });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/labs/:labId', async (req, res) => {
    try {
      const found = await findLabByClientOrDbId(req.params.labId);
      if (!found) return res.status(404).json({ ok: false, error: 'Lab not found' });
      const lab = labRowToClient(found.labRow, found.classRow);
      const cls = classRowToClient(found.classRow, [found.labRow]);
      res.json({ ok: true, class: cls, lab });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/labs/pin/:pin', async (req, res) => {
    try {
      const pin = req.params.pin.trim();
      const { data: labRow, error } = await supabase
        .from('labs')
        .select('*, classes(*)')
        .eq('session_pin', pin)
        .maybeSingle();

      if (error) throw error;
      if (!labRow) return res.status(404).json({ ok: false, error: 'Invalid PIN' });

      const lab = labRowToClient(labRow, labRow.classes);
      const cls = classRowToClient(labRow.classes, [labRow]);
      res.json({ ok: true, class: cls, lab });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/enrollments/:playerId', async (req, res) => {
    try {
      const playerId = req.params.playerId;
      const { data, error } = await supabase
        .from('student_enrollments')
        .select('*, labs!lab_id(lab_config, template_id, session_pin, feedback_from_instructor, status), classes!class_id(name)')
        .eq('player_id', playerId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const enrollments = (data || []).map((row) => {
        const labConfig = row.labs?.lab_config || {};
        return {
          classId: row.class_id,
          labId: labConfig.id || row.lab_id,
          className: row.classes?.name || 'Class',
          labTitle: labConfig.scenario?.title || 'Lab',
          templateId: row.labs?.template_id,
          joinedAt: row.joined_at,
          feedback: row.labs?.feedback_from_instructor ?? undefined,
        };
      });

      res.json({ ok: true, enrollments });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.put('/api/enrollments/:playerId', async (req, res) => {
    try {
      const playerId = req.params.playerId;
      const entries = Array.isArray(req.body?.enrollments) ? req.body.enrollments : [];

      await supabase.from('student_enrollments').delete().eq('player_id', playerId);

      for (const entry of entries) {
        const found = await findLabByClientOrDbId(entry.labId);
        if (!found) continue;

        await supabase.from('student_enrollments').insert({
          lab_id: found.labRow.id,
          session_pin: found.labRow.session_pin,
          class_id: found.classRow.id,
          player_id: playerId,
          display_name: entry.className ? `${entry.className} · Student` : 'Student',
        });
      }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/join', async (req, res) => {
    try {
      const { pin, playerId, displayName } = req.body || {};
      if (!pin || !playerId) {
        return res.status(400).json({ ok: false, error: 'pin and playerId required' });
      }

      const { data: labRow, error } = await supabase
        .from('labs')
        .select('*, classes(*)')
        .eq('session_pin', String(pin).trim())
        .maybeSingle();

      if (error) throw error;
      if (!labRow) return res.status(404).json({ ok: false, error: 'Invalid PIN' });

      const instructorId = await getInstructorId();
      await ensureLabSession(labRow, labRow.classes, instructorId);

      const { error: enrollError } = await supabase.from('student_enrollments').upsert(
        {
          lab_id: labRow.id,
          session_pin: labRow.session_pin,
          class_id: labRow.class_id,
          player_id: playerId,
          display_name: displayName || 'Student',
        },
        { onConflict: 'lab_id,player_id' },
      );

      if (enrollError) throw enrollError;

      const lab = labRowToClient(labRow, labRow.classes);
      const cls = classRowToClient(labRow.classes, [labRow]);
      const entry = {
        classId: cls.id,
        labId: lab.id,
        className: cls.name,
        labTitle: lab.scenario.title,
        templateId: lab.templateId,
        joinedAt: new Date().toISOString(),
        feedback: lab.feedbackFromInstructor,
      };

      res.json({ ok: true, class: cls, lab, entry });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/live-session/:labId', async (req, res) => {
    try {
      const labId = req.params.labId;
      const pin = String(req.query.pin || '').trim();
      const found = await findLabByClientOrDbId(labId);
      if (!found) return res.status(404).json({ ok: false, error: 'Lab not found' });

      if (pin && found.labRow.session_pin !== pin) {
        return res.status(403).json({ ok: false, error: 'Invalid PIN' });
      }

      const instructorId = await getInstructorId();
      const sessionRow = await ensureLabSession(found.labRow, found.classRow, instructorId);
      const labClient = labRowToClient(found.labRow, found.classRow);

      const { data: playerRows } = await supabase
        .from('session_players')
        .select('*')
        .eq('lab_id', found.labRow.id);

      const session = liveSessionFromDb(labClient, sessionRow, playerRows || []);
      res.json({ ok: true, session });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.put('/api/live-session/:labId', async (req, res) => {
    try {
      const labId = req.params.labId;
      const session = req.body;
      if (!session?.pin) return res.status(400).json({ ok: false, error: 'Invalid session payload' });

      const found = await findLabByClientOrDbId(labId);
      if (!found) return res.status(404).json({ ok: false, error: 'Lab not found' });
      if (found.labRow.session_pin !== session.pin) {
        return res.status(403).json({ ok: false, error: 'Invalid PIN' });
      }

      const instructorId = await getInstructorId();
      const sessionRow = await ensureLabSession(found.labRow, found.classRow, instructorId);

      session.updatedAt = new Date().toISOString();

      const labConfig = {
        ...(found.labRow.lab_config || {}),
        id: found.labRow.lab_config?.id || labId,
        liveSession: session,
      };

      await supabase
        .from('labs')
        .update({ lab_config: labConfig, updated_at: new Date().toISOString() })
        .eq('id', found.labRow.id);

      await supabase
        .from('lab_sessions')
        .update({
          level3_status: session.level3Status,
          level3_started_at: session.level3StartedAt ?? null,
          level3_ended_at: session.level3EndedAt ?? null,
          updated_at: session.updatedAt,
        })
        .eq('id', sessionRow.id);

      const players = Object.values(session.players || {});
      for (const player of players) {
        const row = clientPlayerToRow(player, sessionRow.id, found.labRow.id, session.pin);
        const { error } = await supabase
          .from('session_players')
          .upsert(row, { onConflict: 'lab_session_id,player_id' });

        if (error && error.message?.includes('character_id')) {
          delete row.character_id;
          await supabase.from('session_players').upsert(row, { onConflict: 'lab_session_id,player_id' });
        } else if (error) {
          throw error;
        }
      }

      res.json({ ok: true, session });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/labs/:labId/performance', async (req, res) => {
    try {
      const found = await findLabByClientOrDbId(req.params.labId);
      if (!found) return res.status(404).json({ ok: false, error: 'Lab not found' });

      const result = req.body || {};
      const playerId = result.playerId || 'unknown';
      const metrics = result.metrics || {};

      const { data: enrollment } = await supabase
        .from('student_enrollments')
        .select('id')
        .eq('lab_id', found.labRow.id)
        .eq('player_id', playerId)
        .maybeSingle();

      const progressRow = {
        enrollment_id: enrollment?.id,
        lab_id: found.labRow.id,
        session_pin: found.labRow.session_pin,
        player_id: playerId,
        display_name: result.displayName || 'Student',
        progress: 'level1_complete',
        balance_efficiency_pct: metrics.efficiencyPct ?? null,
        idle_time_sec: metrics.idleTimeSec ?? null,
        workstation_count: metrics.stationsUsed ?? null,
        efficiency_pct: metrics.efficiencyPct ?? null,
        min_stations: metrics.minStations ?? null,
        overloaded_stations: metrics.overloadedStations ?? null,
        all_tasks_assigned: metrics.allTasksAssigned ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('student_progress')
        .select('id, enrollment_id')
        .eq('lab_id', found.labRow.id)
        .eq('player_id', playerId)
        .maybeSingle();

      if (existing) {
        if (!progressRow.enrollment_id) progressRow.enrollment_id = existing.enrollment_id;
        const { error } = await supabase.from('student_progress').update(progressRow).eq('id', existing.id);
        if (error) throw error;
      } else if (enrollment?.id) {
        const { error } = await supabase.from('student_progress').insert({
          ...progressRow,
          enrollment_id: enrollment.id,
        });
        if (error) throw error;
      }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/labs/:labId/leaderboard', async (req, res) => {
    try {
      const found = await findLabByClientOrDbId(req.params.labId);
      if (!found) return res.status(404).json({ ok: false, error: 'Lab not found' });

      const { data: entries, error } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .eq('lab_id', found.labRow.id)
        .order('position', { ascending: true });

      if (error) throw error;

      if (entries?.length) {
        res.json({
          ok: true,
          entries: entries.map((e) => ({
            id: e.player_id,
            playerName: e.display_name,
            totalScore: Number(e.total_score),
            balanceEfficiencyPct: Number(e.balance_efficiency_pct ?? 0),
            flowEfficiencyPct: Number(e.flow_efficiency_pct ?? 0),
            wasteReductionPct: Number(e.waste_reduction_pct ?? 0),
            completionSeconds: e.completion_seconds ?? 0,
            rank: e.engineering_rank ?? 'Factory Trainee',
            submittedAt: e.submitted_at,
            labId: found.labRow.lab_config?.id || req.params.labId,
          })),
        });
        return;
      }

      const { data: playerRows } = await supabase
        .from('session_players')
        .select('*')
        .eq('lab_id', found.labRow.id)
        .not('total_score', 'is', null)
        .order('total_score', { ascending: false });

      res.json({
        ok: true,
        entries: (playerRows || []).map((p) => ({
          id: p.player_id,
          playerName: p.display_name,
          totalScore: Number(p.total_score ?? 0),
          balanceEfficiencyPct: Number(p.balance_efficiency_pct ?? 0),
          flowEfficiencyPct: Number(p.flow_efficiency_pct ?? 0),
          wasteReductionPct: Number(p.waste_reduction_pct ?? 0),
          completionSeconds: p.completion_seconds ?? 0,
          rank: p.engineering_rank ?? 'Factory Trainee',
          submittedAt: p.finished_at ?? p.last_seen_at,
          labId: found.labRow.lab_config?.id || req.params.labId,
        })),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/labs/:labId/leaderboard', async (req, res) => {
    try {
      const found = await findLabByClientOrDbId(req.params.labId);
      if (!found) return res.status(404).json({ ok: false, error: 'Lab not found' });

      const entry = req.body;
      const { data: existing } = await supabase
        .from('leaderboard_entries')
        .select('id')
        .eq('lab_id', found.labRow.id)
        .eq('player_id', entry.id)
        .maybeSingle();

      const row = {
        lab_id: found.labRow.id,
        session_pin: found.labRow.session_pin,
        player_id: entry.id,
        display_name: entry.playerName,
        position: entry.position ?? 1,
        total_score: entry.totalScore,
        balance_efficiency_pct: entry.balanceEfficiencyPct,
        flow_efficiency_pct: entry.flowEfficiencyPct,
        waste_reduction_pct: entry.wasteReductionPct,
        completion_seconds: entry.completionSeconds,
        engineering_rank: entry.rank,
        submitted_at: entry.submittedAt || new Date().toISOString(),
      };

      if (existing) {
        await supabase.from('leaderboard_entries').update(row).eq('id', existing.id);
      } else {
        await supabase.from('leaderboard_entries').insert(row);
      }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/labs/create-pin', (_req, res) => {
    res.json({ ok: true, pin: generatePin() });
  });
}
