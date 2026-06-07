import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { supabase } from './lib/supabase.js';
import { getInstructorId } from './lib/instructor.js';
import { registerApiRoutes } from './routes/api.js';

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'simurep-backend' });
});

app.get('/api/db-check', async (_req, res) => {
  const { data, error } = await supabase.from('scenarios').select('id, scenario_name').limit(5);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, scenarios: data });
});

registerApiRoutes(app);

async function start() {
  try {
    const instructorId = await getInstructorId();
    console.log(`Demo instructor ready (${instructorId})`);
  } catch (err) {
    console.error('Failed to bootstrap instructor:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`SimuRep backend http://localhost:${PORT}`);
    console.log(`  GET /health`);
    console.log(`  GET /api/db-check`);
    console.log(`  GET /api/classes`);
    console.log(`  GET /api/labs/pin/:pin`);
    console.log(`  GET /api/live-session/:labId`);
  });
}

start();
