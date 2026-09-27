-- Allow anon (unlogged-in) users to read events and attendance
-- so the dashboard works without login

DROP POLICY IF EXISTS "events_select_anon" ON events;
CREATE POLICY "events_select_anon" ON events
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "attendance_select_anon" ON attendance;
CREATE POLICY "attendance_select_anon" ON attendance
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "profiles_select_anon" ON profiles;
CREATE POLICY "profiles_select_anon" ON profiles
  FOR SELECT TO anon USING (true);
