/*
# Fix role column constraint

## Summary
The `role` column was previously used for free-text job titles (主将, コーチ, etc.).
The previous migration incorrectly added a CHECK constraint limiting it to 'admin'/'member'.
This migration drops that constraint and restores the role column to free-text use.
Admin access control will use the existing `is_admin` boolean column instead.

## Changes
### profiles table
- Drop CHECK constraint `profiles_role_check`
- Reset role to NULL for all users (the 'admin'/'member' values were set incorrectly)
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE profiles SET role = NULL WHERE role IN ('admin', 'member');
