/*
# Auto-assign admin role to the first registered user

## Summary
最初に登録されたユーザーを自動的に管理者（is_admin = true）にするロジックを
handle_new_user トリガー関数に追加します。これにより、開発・初期設定時に
管理者がいない問題を解決します。

## Changes
### handle_new_user function
- 新規ユーザー作成時に profiles テーブルの既存行数を確認
- 既存ユーザーが0人の場合（最初のユーザー）、is_admin = true でプロフィールを作成
- 2人目以降は is_admin = false（一般メンバー）として作成

## Security
- この処理は SECURITY DEFINER で実行されるため、RLSをバイパスして profiles を確認できる
- 最初のユーザーのみが自動的に管理者になる
- 既存ユーザーは影響を受けない
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_count integer;
BEGIN
  -- Auto-confirm email so users can log in immediately
  NEW.email_confirmed_at := now();

  -- Count existing profiles to determine if this is the first user
  SELECT count(*) INTO existing_count FROM public.profiles;

  -- Insert profile; first user becomes admin
  INSERT INTO public.profiles (id, name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    (existing_count = 0)
  );

  RETURN NEW;
END;
$$;

-- Ensure trigger is up to date
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
