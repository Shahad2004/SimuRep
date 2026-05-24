-- =============================================================================
-- Seed: Default T-shirt line balancing + Nashama World Cup scenarios
-- Matches FIXED_LINE_BALANCING_TASKS and NASHAMA_TASKS in the frontend
-- =============================================================================

INSERT INTO public.scenarios (
  id,
  scenario_name,
  template_id,
  cycle_time_sec,
  workstation_cost_coins,
  difficulty,
  title,
  product_name,
  context,
  objectives,
  analysis_guidance,
  is_builtin
) VALUES (
  'a0000001-0000-4000-8000-000000000001',
  'T-Shirt Factory Line Balancing',
  'line-balancing',
  60,
  100,
  'standard',
  'T-Shirt Production Line',
  'T-shirt',
  'A small T-shirt factory must balance cutting, sewing, quality, and packing within cycle time.',
  'Balance workloads, minimize idle time, avoid overload.',
  'Use contiguous task groups and respect shirt flow: cutting → sewing → QC → packing.',
  TRUE
),
(
  'a0000001-0000-4000-8000-000000000002',
  'Nashama World Cup Factory',
  'line-balancing',
  55,
  100,
  'world_cup',
  'Nashama World Cup Challenge',
  'Official Nashama fan shirt',
  'Jordan national team World Cup — high-volume fan shirt production under strict cycle time.',
  'Balance 18 tasks, minimize waste, compete on the live leaderboard.',
  'Forward flow only in the industrial optimal; backtracking adds transportation waste.',
  TRUE
);

-- Level 1/2 default tasks (10 tasks)
INSERT INTO public.scenario_tasks (scenario_id, task_id, task_name, duration_sec, category, sequence_order) VALUES
  ('a0000001-0000-4000-8000-000000000001', 't_cut_panels', 'Cut fabric panels', 18, 'Cutting', 1),
  ('a0000001-0000-4000-8000-000000000001', 't_trim_edges', 'Trim fabric edges', 12, 'Cutting', 2),
  ('a0000001-0000-4000-8000-000000000001', 't_mark_points', 'Mark stitch points', 10, 'Cutting', 3),
  ('a0000001-0000-4000-8000-000000000001', 't_sew_shoulders', 'Sew shoulder seams', 24, 'Sewing', 4),
  ('a0000001-0000-4000-8000-000000000001', 't_attach_sleeves', 'Attach sleeves', 28, 'Sewing', 5),
  ('a0000001-0000-4000-8000-000000000001', 't_close_sides', 'Close side seams', 22, 'Sewing', 6),
  ('a0000001-0000-4000-8000-000000000001', 't_hem_bottom', 'Hem bottom edge', 16, 'Sewing', 7),
  ('a0000001-0000-4000-8000-000000000001', 't_quality_check', 'Inspect shirt quality', 12, 'Quality Check', 8),
  ('a0000001-0000-4000-8000-000000000001', 't_fold_garment', 'Fold garment', 14, 'Packing', 9),
  ('a0000001-0000-4000-8000-000000000001', 't_pack_label', 'Pack and label', 16, 'Packing', 10);

-- Shirt flow precedence (linear + group order)
INSERT INTO public.task_precedence (scenario_id, task_id, depends_on_task_id)
SELECT 'a0000001-0000-4000-8000-000000000001', t2.task_id, t1.task_id
FROM public.scenario_tasks t1
JOIN public.scenario_tasks t2 ON t1.scenario_id = t2.scenario_id
  AND t2.sequence_order = t1.sequence_order + 1
WHERE t1.scenario_id = 'a0000001-0000-4000-8000-000000000001';

-- Nashama Level 3 tasks (18 tasks) — abbreviated insert; extend in app or add full list
INSERT INTO public.scenario_tasks (scenario_id, task_id, task_name, duration_sec, category, sequence_order) VALUES
  ('a0000001-0000-4000-8000-000000000002', 'n3_fabric', 'Receive fabric roll', 8, 'Cutting', 1),
  ('a0000001-0000-4000-8000-000000000002', 'n3_cut_front', 'Cut front shirt panel', 10, 'Cutting', 2),
  ('a0000001-0000-4000-8000-000000000002', 'n3_cut_back', 'Cut back shirt panel', 9, 'Cutting', 3),
  ('a0000001-0000-4000-8000-000000000002', 'n3_print_logo', 'Print Nashama logo', 12, 'Printing', 4),
  ('a0000001-0000-4000-8000-000000000002', 'n3_sleeves', 'Sew sleeves', 14, 'Sewing', 5),
  ('a0000001-0000-4000-8000-000000000002', 'n3_collar', 'Attach collar', 11, 'Assembly', 6),
  ('a0000001-0000-4000-8000-000000000002', 'n3_assemble', 'Assemble body', 15, 'Assembly', 7),
  ('a0000001-0000-4000-8000-000000000002', 'n3_side_seams', 'Close side seams', 13, 'Sewing', 8),
  ('a0000001-0000-4000-8000-000000000002', 'n3_hem', 'Hem bottom', 9, 'Sewing', 9),
  ('a0000001-0000-4000-8000-000000000002', 'n3_qc', 'Quality inspection', 10, 'Quality', 10),
  ('a0000001-0000-4000-8000-000000000002', 'n3_iron', 'Iron shirt', 11, 'Finishing', 11),
  ('a0000001-0000-4000-8000-000000000002', 'n3_fold', 'Fold shirt', 6, 'Finishing', 12),
  ('a0000001-0000-4000-8000-000000000002', 'n3_tag', 'Attach price tag', 5, 'Packing', 13),
  ('a0000001-0000-4000-8000-000000000002', 'n3_fan_pack', 'Place shirt in fan packaging', 8, 'Packing', 14),
  ('a0000001-0000-4000-8000-000000000002', 'n3_box', 'Pack into shipping box', 7, 'Packing', 15),
  ('a0000001-0000-4000-8000-000000000002', 'n3_label_box', 'Label shipping box', 5, 'Packing', 16),
  ('a0000001-0000-4000-8000-000000000002', 'n3_pallet', 'Stage on pallet', 6, 'Packing', 17),
  ('a0000001-0000-4000-8000-000000000002', 'n3_ship_box', 'Ship to stadium', 4, 'Packing', 18);

INSERT INTO public.task_precedence (scenario_id, task_id, depends_on_task_id)
SELECT 'a0000001-0000-4000-8000-000000000002', t2.task_id, t1.task_id
FROM public.scenario_tasks t1
JOIN public.scenario_tasks t2 ON t1.scenario_id = t2.scenario_id
  AND t2.sequence_order = t1.sequence_order + 1
WHERE t1.scenario_id = 'a0000001-0000-4000-8000-000000000002';
