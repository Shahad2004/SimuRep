/** Map DB rows ↔ frontend types (classes.ts / liveSession.ts) */

export function labRowToClient(labRow, classRow) {
  const config = labRow.lab_config && typeof labRow.lab_config === 'object' ? labRow.lab_config : {};
  const clientId = config.id || labRow.id;

  return {
    id: clientId,
    dbId: labRow.id,
    classDbId: labRow.class_id,
    classClientId: classRow?.client_id || classRow?.id,
    templateId: labRow.template_id,
    scenario: config.scenario ?? {
      title: 'Lab',
      context: '',
      objectives: '',
      analysisGuidance: '',
      keyMetrics: [],
    },
    productionPlanning: config.productionPlanning,
    lineBalancing: config.lineBalancing,
    pin: labRow.session_pin,
    createdAt: labRow.created_at,
    status: labRow.status,
    feedbackFromInstructor: labRow.feedback_from_instructor ?? undefined,
    liveSession: config.liveSession,
  };
}

export function clientLabToRow(lab, classDbId, instructorId) {
  const { id, templateId, scenario, productionPlanning, lineBalancing, pin, createdAt, status, feedbackFromInstructor, liveSession } = lab;

  const labConfig = {
    id,
    scenario,
    productionPlanning,
    lineBalancing,
    liveSession,
  };

  return {
    class_id: classDbId,
    instructor_id: instructorId,
    template_id: templateId,
    session_pin: pin,
    status: status || 'draft',
    feedback_from_instructor: feedbackFromInstructor ?? null,
    lab_config: labConfig,
    created_at: createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function classRowToClient(classRow, labRows) {
  const labsForClass = (labRows || []).filter((l) => l.class_id === classRow.id);
  return {
    id: classRow.id,
    dbId: classRow.id,
    name: classRow.name,
    createdAt: classRow.created_at,
    labs: labsForClass.map((l) => labRowToClient(l, classRow)),
  };
}

export function playerRowToClient(row) {
  return {
    playerId: row.player_id,
    displayName: row.display_name,
    progress: row.progress,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
    characterId: row.character_id ?? undefined,
    totalScore: row.total_score != null ? Number(row.total_score) : undefined,
    balanceEfficiencyPct: row.balance_efficiency_pct != null ? Number(row.balance_efficiency_pct) : undefined,
    flowEfficiencyPct: row.flow_efficiency_pct != null ? Number(row.flow_efficiency_pct) : undefined,
    idleTimeReductionPct: row.idle_time_reduction_pct != null ? Number(row.idle_time_reduction_pct) : undefined,
    wasteReductionPct: row.waste_reduction_pct != null ? Number(row.waste_reduction_pct) : undefined,
    workstationScorePct: row.workstation_score_pct != null ? Number(row.workstation_score_pct) : undefined,
    speedScorePct: row.speed_score_pct != null ? Number(row.speed_score_pct) : undefined,
    rank: row.engineering_rank ?? undefined,
    completionSeconds: row.completion_seconds ?? undefined,
    finishedAt: row.finished_at ?? undefined,
  };
}

export function clientPlayerToRow(player, labSessionId, labDbId, pin) {
  return {
    lab_session_id: labSessionId,
    lab_id: labDbId,
    session_pin: pin,
    player_id: player.playerId,
    display_name: player.displayName,
    progress: player.progress,
    character_id: player.characterId ?? null,
    total_score: player.totalScore ?? null,
    balance_efficiency_pct: player.balanceEfficiencyPct ?? null,
    flow_efficiency_pct: player.flowEfficiencyPct ?? null,
    idle_time_reduction_pct: player.idleTimeReductionPct ?? null,
    waste_reduction_pct: player.wasteReductionPct ?? null,
    workstation_score_pct: player.workstationScorePct ?? null,
    speed_score_pct: player.speedScorePct ?? null,
    engineering_rank: player.rank ?? null,
    completion_seconds: player.completionSeconds ?? null,
    finished_at: player.finishedAt ?? null,
    joined_at: player.joinedAt || new Date().toISOString(),
    last_seen_at: player.lastSeenAt || new Date().toISOString(),
  };
}

export function liveSessionFromDb(labClient, sessionRow, playerRows) {
  const configSession = labClient.liveSession;
  if (configSession && typeof configSession === 'object' && configSession.players) {
    return {
      labId: labClient.id,
      pin: labClient.pin,
      level3Status: configSession.level3Status ?? sessionRow?.level3_status ?? 'idle',
      level3StartedAt: configSession.level3StartedAt ?? sessionRow?.level3_started_at ?? undefined,
      level3EndedAt: configSession.level3EndedAt ?? sessionRow?.level3_ended_at ?? undefined,
      updatedAt: configSession.updatedAt ?? sessionRow?.updated_at ?? new Date().toISOString(),
      players: configSession.players,
    };
  }

  const players = {};
  for (const row of playerRows || []) {
    players[row.player_id] = playerRowToClient(row);
  }

  return {
    labId: labClient.id,
    pin: labClient.pin,
    level3Status: sessionRow?.level3_status ?? 'idle',
    level3StartedAt: sessionRow?.level3_started_at ?? undefined,
    level3EndedAt: sessionRow?.level3_ended_at ?? undefined,
    updatedAt: sessionRow?.updated_at ?? new Date().toISOString(),
    players,
  };
}
