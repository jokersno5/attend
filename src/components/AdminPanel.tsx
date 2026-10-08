import { useEffect, useState, useCallback } from 'react';
import { supabase, type TeamEvent, type Profile, type Location, type ActivityContent, type EventType } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatDate, formatTime, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, isUpcoming } from '@/lib/utils';
import { Calendar, MapPin, Clock, Trash2, Plus, Users, Loader as Loader2, FileText, Shield, ShieldCheck, Trophy, Target, Dumbbell, MoveHorizontal as MoreHorizontal, Pencil, X, Mail, KeyRound, Briefcase, Sparkles, CalendarClock } from 'lucide-react';

type Tab = 'events' | 'members' | 'locations' | 'activities';

const EVENT_TYPES: EventType[] = ['sbl', 'practice_game', 'practice', 'other'];
const EVENT_TYPE_ICONS: Record<EventType, typeof Trophy> = {
  sbl: Trophy,
  practice_game: Target,
  practice: Dumbbell,
  other: MoreHorizontal,
};

function addHoursToTime(timeStr: string, hours: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + hours * 60;
  const nh = ((Math.floor(total / 60) % 24) + 24) % 24;
  const nm = ((total % 60) + 60) % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function combineDateTime(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}`).toISOString();
}

function dateToLocalInput(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function timeToLocalInput(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('events');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 overflow-x-auto">
        <button
          onClick={() => setTab('events')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap ${tab === 'events' ? 'bg-navy-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Calendar className="w-4 h-4" /> 日程
        </button>
        <button
          onClick={() => setTab('members')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap ${tab === 'members' ? 'bg-navy-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Users className="w-4 h-4" /> メンバー
        </button>
        <button
          onClick={() => setTab('locations')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap ${tab === 'locations' ? 'bg-navy-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <MapPin className="w-4 h-4" /> 場所
        </button>
        <button
          onClick={() => setTab('activities')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap ${tab === 'activities' ? 'bg-navy-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Briefcase className="w-4 h-4" /> 内容
        </button>
      </div>

      {tab === 'events' && <EventManager />}
      {tab === 'members' && <MemberManager />}
      {tab === 'locations' && <MasterManager table="locations" label="活動場所" />}
      {tab === 'activities' && <MasterManager table="activity_contents" label="活動内容" />}
    </div>
  );
}

// ─── Event Manager ───────────────────────────────────────────

type EventFormState = {
  title: string;
  type: EventType;
  date: string;
  startTime: string;
  endTime: string;
  meetTime: string;
  location: string;
  note: string;
};

function emptyForm(): EventFormState {
  return { title: '', type: 'practice', date: '', startTime: '09:00', endTime: '11:00', meetTime: '08:00', location: '', note: '' };
}

function EventManager() {
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: eventData }, { data: locData }] = await Promise.all([
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      supabase.from('locations').select('*').order('name', { ascending: true }),
    ]);
    setEvents((eventData ?? []) as TeamEvent[]);
    setLocations((locData ?? []) as Location[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm(emptyForm());
    setFormError(null);
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (event: TeamEvent) => {
    setEditingId(event.id);
    setShowForm(true);
    setForm({
      title: event.title,
      type: event.type,
      date: dateToLocalInput(event.event_date),
      startTime: timeToLocalInput(event.event_date),
      endTime: event.end_time ? timeToLocalInput(event.end_time) : addHoursToTime(timeToLocalInput(event.event_date), 2),
      meetTime: event.meet_time ? timeToLocalInput(event.meet_time) : addHoursToTime(timeToLocalInput(event.event_date), -1),
      location: event.location ?? '',
      note: event.note ?? '',
    });
    setFormError(null);
  };

  const handleStartTimeChange = (newStart: string) => {
    setForm((p) => ({
      ...p,
      startTime: newStart,
      endTime: addHoursToTime(newStart, 2),
      meetTime: addHoursToTime(newStart, -1),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
    setSubmitting(true);

    const eventDate = combineDateTime(form.date, form.startTime);
    const endTime = combineDateTime(form.date, form.endTime);
    const meetTime = combineDateTime(form.date, form.meetTime);

    const payload = {
      title: form.title,
      type: form.type,
      event_date: eventDate,
      end_time: endTime,
      meet_time: meetTime,
      location: form.location || null,
      note: form.note || null,
    };

    if (editingId) {
      const { error } = await supabase.from('events').update(payload).eq('id', editingId);
      if (error) { setFormError(error.message); setSubmitting(false); return; }
    } else {
      const { error } = await supabase.from('events').insert(payload);
      if (error) { setFormError(error.message); setSubmitting(false); return; }
    }

    setSubmitting(false);
    resetForm();
    loadData();
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from('events').delete().eq('id', id);
    setDeleting(null);
    if (error) setFormError(error.message);
    loadData();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-navy-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {!showForm ? (
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()); }}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-navy-500 to-navy-700 text-white text-sm font-bold rounded-2xl shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" /> 新しい日程を追加
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">{editingId ? '日程を編集' : '日程を追加'}</h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-700 text-sm">キャンセル</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">タイトル</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="例: 練習試合 vs ○○町"
                  required
                  className="flex-1 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition"
                />
                <button
                  type="button"
                  onClick={() => {
                    const typeLabel = EVENT_TYPE_LABELS[form.type] ?? '';
                    const loc = form.location ?? '';
                    const autoTitle = loc ? `${typeLabel}@${loc}` : typeLabel;
                    setForm((p) => ({ ...p, title: autoTitle }));
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-navy-50 text-navy-700 text-xs font-bold rounded-lg border border-navy-200 hover:bg-navy-100 transition shrink-0 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  自動入力
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">種類</label>
              <div className="grid grid-cols-4 gap-2">
                {EVENT_TYPES.map((et) => {
                  const Icon = EVENT_TYPE_ICONS[et];
                  const active = form.type === et;
                  return (
                    <button
                      key={et}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, type: et }))}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-semibold transition ${active ? 'bg-navy-50 text-navy-700 border-navy-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                    >
                      <Icon className="w-4 h-4" /> {EVENT_TYPE_LABELS[et]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">日付</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                required
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">開始時間</label>
                <input type="time" value={form.startTime} onChange={(e) => handleStartTimeChange(e.target.value)} required
                  className="w-full px-2 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">終了時間</label>
                <input type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                  className="w-full px-2 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">集合時間</label>
                <input type="time" value={form.meetTime} onChange={(e) => setForm((p) => ({ ...p, meetTime: e.target.value }))}
                  className="w-full px-2 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition" />
              </div>
            </div>
            <p className="text-xs text-slate-400 -mt-1">終了時間・集合時間は開始時間から自動計算されます（変更可能）</p>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-xs font-medium text-slate-600">集合時間のクイック入力</label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, meetTime: addHoursToTime(form.startTime, -1) }))}
                  className="flex-1 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-navy-50 hover:text-navy-700 hover:border-navy-200 transition"
                >
                  開始の1時間前
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, meetTime: addHoursToTime(form.startTime, -0.5) }))}
                  className="flex-1 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-navy-50 hover:text-navy-700 hover:border-navy-200 transition"
                >
                  開始の30分前
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">場所（任意）</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="例: ○○公園野球場"
                list="location-list"
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition"
              />
              <datalist id="location-list">
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">メモ（任意）</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="例: 集合は30分前にお願いします"
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition resize-none"
              />
            </div>

            {formError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy-600 text-white text-sm font-bold rounded-lg hover:bg-navy-700 transition disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingId ? '更新する' : '追加する'}
            </button>
          </form>
        </div>
      )}

      {(() => {
        if (events.length === 0 && !showForm) {
          return (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">日程がまだありません</p>
            </div>
          );
        }

        const upcoming = events
          .filter((e) => isUpcoming(e.event_date))
          .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
        const past = events
          .filter((e) => !isUpcoming(e.event_date))
          .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

        const renderEventItem = (event: TeamEvent, isPast: boolean) => (
          <div key={event.id} className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 ${isPast ? 'opacity-60' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${EVENT_TYPE_COLORS[event.type] ?? EVENT_TYPE_COLORS.other}`}>
                  {EVENT_TYPE_LABELS[event.type] ?? event.type}
                </span>
                <h4 className="text-sm font-semibold text-slate-900 truncate">{event.title}</h4>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(event.event_date)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(event.event_date)}{event.end_time && `〜${formatTime(event.end_time)}`}</span>
                {event.meet_time && <span className="text-navy-600">集合 {formatTime(event.meet_time)}</span>}
                {event.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" /> {event.location}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => startEdit(event)}
                className="p-2 rounded-lg text-slate-400 hover:text-navy-600 hover:bg-navy-50 transition"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(event.id)}
                disabled={deleting === event.id}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
              >
                {deleting === event.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        );

        return (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-navy-600 flex items-center gap-1.5 px-1">
                  <CalendarClock className="w-4 h-4" />
                  今後の予定 ({upcoming.length})
                </h3>
                {upcoming.map((event) => renderEventItem(event, false))}
              </div>
            )}
            {past.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-1.5 px-1">
                  <Calendar className="w-4 h-4" />
                  過去のイベント ({past.length})
                </h3>
                {past.map((event) => renderEventItem(event, true))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Master Manager (locations / activity_contents) ──────────

function MasterManager({ table, label }: { table: 'locations' | 'activity_contents'; label: string }) {
  const [items, setItems] = useState<(Location | ActivityContent)[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from(table).select('*').order('name', { ascending: true });
    setItems((data ?? []) as (Location | ActivityContent)[]);
    setLoading(false);
  }, [table]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from(table).insert({ name: newName.trim() });
    setSubmitting(false);
    if (error) { setError(error.message); return; }
    setNewName('');
    setError(null);
    load();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from(table).delete().eq('id', id);
    setDeletingId(null);
    if (error) setError(error.message);
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-navy-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={`${label}を追加`}
          className="flex-1 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition"
        />
        <button
          type="submit"
          disabled={submitting || !newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-navy-600 text-white text-sm font-bold rounded-lg hover:bg-navy-700 transition disabled:opacity-50 shrink-0"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          追加
        </button>
      </form>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">{label}がまだありません</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-900 font-medium">{item.name}</span>
              <button
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50 shrink-0"
              >
                {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Member Manager ──────────────────────────────────────────

function MemberManager() {
  const { profile: myProfile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', email: '', password: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    const profiles = (data ?? []) as Profile[];
    setMembers(profiles);
    setLoading(false);
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const toggleAdmin = async (member: Profile) => {
    setToggling(member.id);
    await supabase.from('profiles').update({ is_admin: !member.is_admin }).eq('id', member.id);
    setToggling(null);
    loadMembers();
  };

  const startEdit = async (member: Profile) => {
    setEditingId(member.id);
    setEditForm({ name: member.name, role: member.role ?? '', email: '', password: '' });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setEditError(null);

    // Update profile (name, role)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name: editForm.name, role: editForm.role || null })
      .eq('id', editingId);

    if (profileError) {
      setEditError(profileError.message);
      setSaving(false);
      return;
    }

    // Update email and/or password via Edge Function (Supabase Auth Admin API)
    if (editForm.email || editForm.password) {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`;
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          target_user_id: editingId,
          new_email: editForm.email || null,
          new_password: editForm.password || null,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: '更新に失敗しました' }));
        setEditError(errBody.error || '更新に失敗しました');
        setSaving(false);
        return;
      }

      const result = await response.json();
      if (result && result.success === false) {
        setEditError(result.error || '権限エラー');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setEditingId(null);
    loadMembers();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-navy-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-600 mb-1 px-1">
        <Users className="w-4 h-4" />
        <span>登録メンバー: {members.length}名</span>
      </div>

      {members.map((member) => (
        <div key={member.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {editingId === member.id ? (
            <form onSubmit={saveEdit} className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-900">メンバー編集</span>
                <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-700 text-sm">キャンセル</button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">名前</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">役割（任意）</label>
                <input
                  type="text"
                  value={editForm.role}
                  onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                  placeholder="例: 主将、コーチ、マネージャー"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-3">
                <p className="text-xs text-slate-500 font-medium">認証情報の変更（任意）</p>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> 新しいメールアドレス</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="変更する場合のみ入力"
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><KeyRound className="w-3 h-3" /> 新しいパスワード</label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="変更する場合のみ入力"
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition"
                  />
                </div>
              </div>

              {editError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy-600 text-white text-sm font-bold rounded-lg hover:bg-navy-700 transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                保存する
              </button>
            </form>
          ) : (
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-500 to-navy-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {member.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 truncate">{member.name}</span>
                    {member.id === myProfile?.id && <span className="text-xs text-slate-400">(あなた)</span>}
                    {member.role && <span className="text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{member.role}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {member.is_admin ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-navy-600"><ShieldCheck className="w-3 h-3" /> 管理者</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Shield className="w-3 h-3" /> 一般</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => startEdit(member)}
                  className="p-2 rounded-lg text-slate-400 hover:text-navy-600 hover:bg-navy-50 transition"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {member.id !== myProfile?.id && (
                  <button
                    onClick={() => toggleAdmin(member)}
                    disabled={toggling === member.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${member.is_admin ? 'text-slate-500 bg-slate-100 hover:bg-slate-200' : 'text-navy-600 bg-navy-50 hover:bg-navy-100'}`}
                  >
                    {toggling === member.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : member.is_admin ? '管理者解除' : '管理者にする'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
