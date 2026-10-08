/*
# Replace admin_update_user to remove gen_salt/crypt dependency

## Summary
admin_update_user 関数から gen_salt/crypt を使ったパスワードハッシュ化処理を削除し、
パスワードとメールアドレスの更新は Edge Function 経由で Supabase Auth Admin API を
使用するように変更します。

## Changes
### admin_update_user function
- パスワード更新処理（crypt/gen_salt）を削除
- メールアドレス更新のみ残す（auth.users の直接更新は Supabase でサポートされている）
- 今後パスワード変更は Edge Function (admin-update-user) が admin.updateUserById を使用

## Security
- SECURITY DEFINER は維持、admin のみ実行可能
- パスワードの直接ハッシュ化は削除され、Supabase Auth 標準APIに移行
*/

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

  -- Only update email here; password updates are now handled via
  -- the admin-update-user Edge Function using supabase.auth.admin.updateUserById
  IF new_email IS NOT NULL AND new_email <> '' THEN
    UPDATE auth.users SET email = new_email, email_change = now() WHERE id = target_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION admin_update_user(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_user(uuid, text, text) TO authenticated;
