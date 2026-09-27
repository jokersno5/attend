/*
# Enable pgcrypto extension

## Summary
パスワード変更機能で使用される `gen_salt()` および `crypt()` 関数を有効にするため、
pgcrypto 拡張をインストールします。

## Changes
- CREATE EXTENSION IF NOT EXISTS pgcrypto を実行
- これにより admin_update_user 関数内の gen_salt('bf') と crypt() が正常動作するようになる

## Security
- pgcrypto は Supabase 標準で利用可能な拡張
- 既存データへの影響なし
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;
