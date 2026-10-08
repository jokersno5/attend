/*
# Fix handle_new_user trigger causing signup failure

## Problem
The `handle_new_user` trigger was set as BEFORE INSERT on `auth.users` and tried to
INSERT into `profiles` (which has a FK to `auth.users(id)`). In a BEFORE trigger the
`auth.users` row does not exist yet, so the FK constraint on `profiles` fails with
"Database error saving new user".

## Fix
Split into two separate trigger functions:
1. `handle_new_user_before` (BEFORE INSERT) — only sets `email_confirmed_at` on NEW
2. `handle_new_user_after` (AFTER INSERT) — inserts the profile row (FK is satisfied now)

## Security
- SECURITY DEFINER on the AFTER function so it can bypass RLS to insert into profiles
- The BEFORE function only modifies NEW fields, no table access needed
- All users are created as admin during development (existing behavior preserved)
*/

-- BEFORE INSERT: auto-confirm email (no table writes, just modify NEW)
CREATE OR REPLACE FUNCTION public.handle_new_user_before()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.email_confirmed_at := now();
  RETURN NEW;
END;
$$;

-- AFTER INSERT: create profile row (auth.users row now exists, FK is satisfied)
CREATE OR REPLACE FUNCTION public.handle_new_user_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    true
  );
  RETURN NEW;
END;
$$;

-- Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create two new triggers
CREATE TRIGGER on_auth_user_created_before
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_before();

CREATE TRIGGER on_auth_user_created_after
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_after();
