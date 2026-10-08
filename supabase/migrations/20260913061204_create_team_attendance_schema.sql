/*
# 草野球チーム出欠管理 - データベーススキーマ作成

## 概要
草野球チームの出欠管理アプリ用のデータベーススキーマを作成します。
ユーザーはSupabase Authで認証し、プロフィール（名前・管理者権限）を持ちます。
管理者はイベント（試合/練習）を作成し、メンバーが出欠を記録します。

## 新規テーブル
1. `profiles` - ユーザープロフィール
   - `id` (uuid, PK, auth.usersと同一) - ユーザーID
   - `name` (text, not null) - 表示名
   - `is_admin` (boolean, default false) - 管理者権限
   - `created_at` (timestamptz) - 作成日時

2. `events` - 試合・練習イベント
   - `id` (uuid, PK) - イベントID
   - `title` (text, not null) - イベント名
   - `type` (text, not null) - 種別（'game' = 試合, 'practice' = 練習）
   - `event_date` (timestamptz, not null) - 開催日時
   - `location` (text) - 開催場所
   - `note` (text) - メモ/詳細
   - `created_by` (uuid, not null) - 作成者（auth.users参照）
   - `created_at` (timestamptz) - 作成日時

3. `attendance` - 出欠記録
   - `id` (uuid, PK) - 出欠ID
   - `event_id` (uuid, not null) - イベントID（events参照）
   - `user_id` (uuid, not null) - ユーザーID（auth.users参照）
   - `status` (text, not null) - 出欠ステータス（'present' = 出席, 'absent' = 欠席, 'late' = 遅刻・早退, 'undecided' = 未定）
   - `comment` (text) - コメント
   - `updated_at` (timestamptz) - 更新日時
   - UNIQUE制約: (event_id, user_id) - 1ユーザー1イベントにつき1レコード

## セキュリティ (RLS)
- `profiles`: 全ユーザーが全プロフィールを閲覧可能（チームメンバー一覧のため）。更新は自分のプロフィールのみ。
- `events`: 全認証ユーザーが閲覧可能。作成・更新・削除は管理者のみ。
- `attendance`: 全認証ユーザーが全出欠を閲覧可能（メンバー出欠一覧のため）。作成・更新は自分のレコードのみ。

## 重要事項
1. プロフィールは新規ユーザー登録時に自動作成するトリガーを設定
2. 管理者権限のチェックはRLSポリシーで行う
3. 出欠は1ユーザー1イベントにつき1レコード（UNIQUE制約）
*/

-- ============================================
-- 1. profiles テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 全認証ユーザーが全プロフィールを閲覧可能（チームメンバー一覧のため）
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT TO authenticated USING (true);

-- 自分のプロフィールのみ更新可能
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 新規ユーザー登録時にプロフィールを自動作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. events テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('game', 'practice')),
  event_date timestamptz NOT NULL,
  location text,
  note text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_event_date ON events (event_date);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 全認証ユーザーがイベントを閲覧可能
DROP POLICY IF EXISTS "events_select_all" ON events;
CREATE POLICY "events_select_all" ON events
  FOR SELECT TO authenticated USING (true);

-- 管理者のみイベント作成可能
DROP POLICY IF EXISTS "events_insert_admin" ON events;
CREATE POLICY "events_insert_admin" ON events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- 管理者のみイベント更新可能
DROP POLICY IF EXISTS "events_update_admin" ON events;
CREATE POLICY "events_update_admin" ON events
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- 管理者のみイベント削除可能
DROP POLICY IF EXISTS "events_delete_admin" ON events;
CREATE POLICY "events_delete_admin" ON events
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================
-- 3. attendance テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'undecided')),
  comment text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON attendance (event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance (user_id);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 全認証ユーザーが全出欠を閲覧可能（メンバー出欠一覧のため）
DROP POLICY IF EXISTS "attendance_select_all" ON attendance;
CREATE POLICY "attendance_select_all" ON attendance
  FOR SELECT TO authenticated USING (true);

-- 自分の出欠のみ作成可能
DROP POLICY IF EXISTS "attendance_insert_own" ON attendance;
CREATE POLICY "attendance_insert_own" ON attendance
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 自分の出欠のみ更新可能
DROP POLICY IF EXISTS "attendance_update_own" ON attendance;
CREATE POLICY "attendance_update_own" ON attendance
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 自分の出欠のみ削除可能
DROP POLICY IF EXISTS "attendance_delete_own" ON attendance;
CREATE POLICY "attendance_delete_own" ON attendance
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_attendance_update ON attendance;
CREATE TRIGGER on_attendance_update
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();