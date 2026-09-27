-- 1. Drop old type check constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

-- 2. Add end_time and meet_time columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;
ALTER TABLE events ADD COLUMN IF NOT EXISTS meet_time timestamp with time zone;

-- 3. Migrate existing type values: 'game' -> 'sbl', 'practice' -> 'practice'
UPDATE events SET type = 'sbl' WHERE type = 'game';

-- 4. Add new check constraint with 4 types
ALTER TABLE events ADD CONSTRAINT events_type_check
  CHECK (type IN ('sbl', 'practice_game', 'practice', 'other'));
