import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'simurep-backend' });
});

/** Verify DB connection + seeded scenarios */
app.get('/api/db-check', async (_req, res) => {
  const { data, error } = await supabase.from('scenarios').select('id, scenario_name').limit(5);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, scenarios: data });
});

app.listen(PORT, () => {
  console.log(`SimuRep backend http://localhost:${PORT}`);
  console.log(`  GET /health`);
  console.log(`  GET /api/db-check`);
});
