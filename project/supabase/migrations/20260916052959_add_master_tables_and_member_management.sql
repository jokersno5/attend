/*
# Add master tables, member management, and admin user-update function

## Summary
This migration adds two new master tables (locations and activity_contents) for use as dropdown
options in the event form, and a SECURITY DEFINER function that allows an admin user to update
another user's email and password. The profiles table gets a new `role` column.

## New Tables
### locations — id, name, created_at. Public read, admin write.
### activity_contents — id, name, created_at. Public read, admin write.

## Modified Tables
### profiles — added `role` text column.

## Security
- RLS on locations/activity_contents: SELECT public, INSERT/UPDATE/DELETE admin-only.
- admin_update_profiles policy: admins can update profiles.
- admin_update_user SECURITY DEFINER function: admin-only email/password update.
*/

-- 1. Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text;

-- 2. Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on locations" ON locations;
CREATE POLICY "Allow public read access on locations" ON locations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_insert_locations" ON locations;
CREATE POLICY "admin_insert_locations" ON locations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_locations" ON locations;
CREATE POLICY "admin_update_locations" ON locations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_locations" ON locations;
CREATE POLICY "admin_delete_locations" ON locations
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 3. Create activity_contents table
CREATE TABLE IF NOT EXISTS activity_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE activity_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on activity_contents" ON activity_contents;
CREATE POLICY "Allow public read access on activity_contents" ON activity_contents
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_insert_activity_contents" ON activity_contents;
CREATE POLICY "admin_insert_activity_contents" ON activity_contents
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_activity_contents" ON activity_contents;
CREATE POLICY "admin_update_activity_contents" ON activity_contents
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_activity_contents" ON activity_contents;
CREATE POLICY "admin_delete_activity_contents" ON activity_contents
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 4. Admin update policy for profiles
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- 5. SECURITY DEFINER function for admin to update user email and/or password
CREATE OR REPLACE FUNCTION admin_update_user(
  target_user_id uuid,
  new_email text DEFAULT NULL,
  new_password text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  SELECT is_admin INTO caller_is_admin FROM profiles WHERE id = auth.uid();
  IF NOT COALESCE(caller_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: admin only');
  END IF;

  IF new_email IS NOT NULL AND new_email <> '' THEN
    UPDATE auth.users SET email = new_email, email_change = now() WHERE id = target_user_id;
  END IF;

  IF new_password IS NOT NULL AND new_password <> '' THEN
    UPDATE auth.users
      SET encrypted_password = crypt(new_password, gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now())
      WHERE id = target_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION admin_update_user(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_user(uuid, text, text) TO authenticated;
