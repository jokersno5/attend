/*
# Make all new users admin during development

## Summary
開発初期段階として、新規登録されるすべてのユーザーに自動的に管理者権限を付与するように
handle_new_user トリガー関数を更新します。

## Changes
### handle_new_user function
- 既存ユーザー数に関わらず、新規ユーザーの is_admin を常に true に設定
- 開発が進んだ後に元に戻す場合は、この関数の is_admin を false に変更するか、
  最初のユーザーのみ true とする条件式に戻すことで対応可能

## Security
- SECURITY DEFINER で実行、RLS をバイパスして profiles を操作
- 開発初期段階の暫定措置
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Auto-confirm email so users can log in immediately
  NEW.email_confirmed_at := now();

  -- Insert profile; all users become admin during development
  INSERT INTO public.profiles (id, name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    true
  );

  RETURN NEW;
END;
$$;
