/*
# Enforce admin role for admin panel access

## Summary
This migration ensures that the `profiles.role` column is populated for existing users
and adds a check constraint to enforce 'admin' or 'member' values. It also sets the
existing admin user's role to 'admin' and all other users to 'member'.

## Changes
### profiles table
- Added CHECK constraint on `role` column: must be 'admin' or 'member' (or NULL for backward compat)
- Updated existing rows: is_admin=true -> role='admin', is_admin=false -> role='member'

## Security
- No RLS changes needed (existing policies already cover admin access).
*/

-- Set role based on existing is_admin flag
UPDATE profiles SET role = 'admin' WHERE is_admin = true AND (role IS NULL OR role = '');
UPDATE profiles SET role = 'member' WHERE is_admin = false AND (role IS NULL OR role = '');

-- Add check constraint (allow NULL for backward compatibility with the role-as-job-title use case)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IS NULL OR role IN ('admin', 'member'));
