-- 1. Add missing foreign key: attendance.user_id -> profiles.id
--    This fixes the "Could not find a relationship between 'attendance' and 'profiles'" error.

-- First, drop any existing constraint with the same name (in case of partial creation)
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;

-- Add the foreign key constraint
ALTER TABLE attendance
  ADD CONSTRAINT attendance_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Ensure public read access (SELECT) on all three tables for all users

-- events: already has "Allow public read access" policy for public role
-- Add explicit anon+authenticated if not present
DROP POLICY IF EXISTS "Allow public read access on events" ON events;
CREATE POLICY "Allow public read access on events" ON events
  FOR SELECT USING (true);

-- attendance: add public read access
DROP POLICY IF EXISTS "Allow public read access on attendance" ON attendance;
CREATE POLICY "Allow public read access on attendance" ON attendance
  FOR SELECT USING (true);

-- profiles: add public read access
DROP POLICY IF EXISTS "Allow public read access on profiles" ON profiles;
CREATE POLICY "Allow public read access on profiles" ON profiles
  FOR SELECT USING (true);
