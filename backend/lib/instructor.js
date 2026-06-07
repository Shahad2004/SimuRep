import { supabase } from './supabase.js';

const DEMO_EMAIL = process.env.DEMO_INSTRUCTOR_EMAIL || 'instructor@simulab.local';
const DEMO_PASSWORD = process.env.DEMO_INSTRUCTOR_PASSWORD || 'SimuRep-Instructor-2026!';
const DEMO_NAME = process.env.DEMO_INSTRUCTOR_NAME || 'Demo Instructor';

let cachedInstructorId = process.env.DEMO_INSTRUCTOR_ID || null;

export async function getInstructorId() {
  if (cachedInstructorId) return cachedInstructorId;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', DEMO_EMAIL)
    .maybeSingle();

  if (profile?.id) {
    cachedInstructorId = profile.id;
    return cachedInstructorId;
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { name: DEMO_NAME, role: 'instructor' },
  });

  let userId = created?.user?.id;

  if (createError) {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u) => u.email === DEMO_EMAIL);
    if (!existing) throw createError;
    userId = existing.id;
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      role: 'instructor',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (profileError) throw profileError;

  cachedInstructorId = userId;
  return cachedInstructorId;
}
