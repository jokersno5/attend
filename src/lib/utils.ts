import type { AttendanceStatus, EventType } from './supabase';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  sbl: 'SBL',
  practice_game: '練習試合',
  practice: '練習',
  other: 'その他',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  sbl: 'bg-navy-100 text-navy-700',
  practice_game: 'bg-blue-100 text-blue-700',
  practice: 'bg-slate-100 text-slate-600',
  other: 'bg-purple-100 text-purple-700',
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: '出席',
  absent: '欠席',
  undecided: '未定',
};

export const STATUS_COLORS: Record<AttendanceStatus, { bg: string; text: string; border: string; dot: string }> = {
  present: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  absent: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  undecided: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300', dot: 'bg-slate-400' },
};

export const STATUS_ORDER: AttendanceStatus[] = ['present', 'undecided', 'absent'];

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

export function isUpcoming(dateStr: string): boolean {
  return new Date(dateStr).getTime() >= Date.now();
}

export function toLocalDateTimeInput(dateStr: string): string {
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}
