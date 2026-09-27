/*
# events テーブルのRLSポリシーを全認証ユーザーに開放

## 背景
events テーブルの INSERT/UPDATE/DELETE ポリシーが管理者のみ（profiles.is_admin = true）に限定されていたため、
一般ユーザーが管理画面から日程を追加できなかった。UI上は誰でも管理画面を操作できるようになったため、
RLSポリシーもこれに合わせる。

## 変更内容
1. events_insert_admin → events_insert_all: 全認証ユーザーがイベントを作成可能
2. events_update_admin → events_update_all: 全認証ユーザーがイベントを更新可能
3. events_delete_admin → events_delete_all: 全認証ユーザーがイベントを削除可能
4. events_select_all は変更なし（既に全認証ユーザーが閲覧可能）

## セキュリティ
- 全てのポリシーは TO authenticated に限定（ログイン済みユーザーのみ）
- 匿名（anon）アクセスは不可
*/

-- INSERT: 全認証ユーザーが作成可能
DROP POLICY IF EXISTS "events_insert_admin" ON events;
DROP POLICY IF EXISTS "events_insert_all" ON events;
CREATE POLICY "events_insert_all" ON events
  FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: 全認証ユーザーが更新可能
DROP POLICY IF EXISTS "events_update_admin" ON events;
DROP POLICY IF EXISTS "events_update_all" ON events;
CREATE POLICY "events_update_all" ON events
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- DELETE: 全認証ユーザーが削除可能
DROP POLICY IF EXISTS "events_delete_admin" ON events;
DROP POLICY IF EXISTS "events_delete_all" ON events;
CREATE POLICY "events_delete_all" ON events
  FOR DELETE TO authenticated USING (true);

-- profiles の UPDATE も全認証ユーザーに開放（メンバー管理で管理者権限切替のため）
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_all" ON profiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
