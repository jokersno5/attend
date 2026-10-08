/*
# Auto-confirm email on signup

## Summary
Supabaseのメール確認（Email Confirmation）が有効な場合、新規登録後にログインできない問題を解決します。
handle_new_user トリガーを BEFORE INSERT に変更し、新規ユーザーの email_confirmed_at を自動設定します。

## Changes
### handle_new_user function
- トリガーを AFTER INSERT → BEFORE INSERT に変更
- NEW.email_confirmed_at に now() を設定してメール確認を自動完了
- profiles テーブルへの挿入はそのまま維持

### Trigger
- on_auth_user_created トリガーを BEFORE INSERT に再作成
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Auto-confirm email so users can log in immediately
  NEW.email_confirmed_at := now();
  -- Insert profile
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
