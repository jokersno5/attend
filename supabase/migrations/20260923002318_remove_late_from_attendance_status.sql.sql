/*
# Remove 'late' from attendance status options

## Summary
出欠回答の選択肢から「遅刻・早退」(late) を削除し、
「出席」「未定」「欠席」の3種類のみに変更します。

## Changes
### attendance table
- status列のCHECK制約を 'present', 'absent', 'undecided' のみに更新
- 既存の 'late' ステータスのデータは 'undecided' に移行

## Security
- RLSポリシーの変更はありません
*/

-- Move any existing 'late' records to 'undecided'
UPDATE attendance SET status = 'undecided' WHERE status = 'late';

-- Drop and recreate the CHECK constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present', 'absent', 'undecided'));
