-- Ensure public read access on events for all users (anon + authenticated)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON events;
CREATE POLICY "Allow public read access" ON events
  FOR SELECT USING (true);
