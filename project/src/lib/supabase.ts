import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabaseの接続情報が設定されていません。.envファイルに VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: 'pkce',
  storageKey: 'baseball-team-auth',
  storage: {
      getItem: (key: string) => {
        const item = localStorage.getItem(key);
        return Promise.resolve(item);
      },
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
        return Promise.resolve();
      },
    },
  },
});

export type Profile = {
  id: string;
  name: string;
  is_admin: boolean;
  role: string | null;
  created_at: string;
};

export type Location = {
  id: string;
  name: string;
  created_at: string;
};

export type ActivityContent = {
  id: string;
  name: string;
  created_at: string;
};

export type EventType = 'sbl' | 'practice_game' | 'practice' | 'other';

export type TeamEvent = {
  id: string;
  title: string;
  type: EventType;
  event_date: string;
  end_time: string | null;
  meet_time: string | null;
  location: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'undecided';

export type Attendance = {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendanceStatus;
  comment: string;
  updated_at: string;
};

export type AttendanceWithProfile = Attendance & {
  profiles: Pick<Profile, 'id' | 'name'> | null;
};
