import { useEffect, useState, useCallback } from 'react';
import { supabase, type TeamEvent, type AttendanceWithProfile, type AttendanceStatus, type Profile } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { STATUS_LABELS, STATUS_COLORS, STATUS_ORDER, formatDate, formatTime, isUpcoming, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '@/lib/utils';
import { Calendar, MapPin, Clock, ChevronDown, Users, Check, X, CircleAlert as AlertCircle, CircleHelp as HelpCircle, MessageSquare, Loader as Loader2, CalendarClock } from 'lucide-react';

type EventWithAttendance = {
  event: TeamEvent;
  attendanceList: AttendanceWithProfile[];
  myAttendance: AttendanceWithProfile | null;
};

const STATUS_ICONS: Record<AttendanceStatus, typeof Check> = {
  present: Check,
  absent: X,
  undecided: HelpCircle,
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<EventWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const [eventsResult, attendanceResult] = await Promise.all([
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      supabase.from('attendance').select('id, event_id, user_id, status, comment, updated_at, profiles:profiles!attendance_user_id_fkey(id, name)').order('updated_at', { ascending: false }),
    ]);

    if (eventsResult.error) {
      setLoadError(eventsResult.error.message);
      setLoading(false);
      return;
    }

    // If attendance query fails (e.g. schema cache not yet updated), still show events
    const eventData = eventsResult.data ?? [];
    let typedAttendance: AttendanceWithProfile[] = [];
    if (attendanceResult.error) {
      console.warn('Attendance fetch failed, showing events without attendance:', attendanceResult.error.message);
    } else {
      typedAttendance = (attendanceResult.data ?? []) as unknown as AttendanceWithProfile[];
    }

    const grouped: EventWithAttendance[] = eventData.map((ev) => {
      const attList = typedAttendance.filter((a) => a.event_id === ev.id);
      return {
        event: ev as TeamEvent,
        attendanceList: attList,
        myAttendance: attList.find((a) => a.user_id === profile?.id) ?? null,
      };
    });

    setEvents(grouped);

    const commentMap: Record<string, string> = {};
    grouped.forEach((g) => {
      if (g.myAttendance?.comment) commentMap[g.event.id] = g.myAttendance.comment;
    });
    setComments(commentMap);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateAttendance = async (eventId: string, status: AttendanceStatus) => {
    if (!profile) return;
    setUpdating(eventId);

    const existing = events.find((e) => e.event.id === eventId)?.myAttendance;
    const comment = comments[eventId] ?? '';

    if (existing) {
      await supabase
        .from('attendance')
        .update({ status, comment })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('attendance')
        .insert({ event_id: eventId, user_id: profile.id, status, comment });
    }

    setUpdating(null);
    loadData();
  };

  const saveComment = async (eventId: string) => {
    const existing = events.find((e) => e.event.id === eventId)?.myAttendance;
    if (!existing) return;
    const comment = comments[eventId] ?? '';
    setUpdating(eventId);
    await supabase.from('attendance').update({ comment }).eq('id', existing.id);
    setUpdating(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
        <p className="text-sm text-slate-400">イベントを読み込んでいます…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-600 font-medium">データの取得に失敗しました</p>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">{loadError}</p>
        <button
          onClick={() => loadData()}
          className="mt-4 px-4 py-2 rounded-lg bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 transition"
        >
          再読み込み
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <CalendarClock className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-700 font-medium">現在予定されているイベントはありません</p>
        <p className="text-sm text-slate-400 mt-1">管理者が日程を追加するとここに表示されます</p>
      </div>
    );
  }

  const upcoming = events
    .filter((e) => isUpcoming(e.event.event_date))
    .sort((a, b) => new Date(a.event.event_date).getTime() - new Date(b.event.event_date).getTime());
  const past = events.filter((e) => !isUpcoming(e.event.event_date));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-navy-600 mb-3 flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4" />
            今後の予定 ({upcoming.length})
          </h2>
          <div className="space-y-3">
            {upcoming.map((item) => (
              <EventCard
                key={item.event.id}
                item={item}
                profile={profile}
                expanded={expandedId === item.event.id}
                onToggle={() => setExpandedId(expandedId === item.event.id ? null : item.event.id)}
                comments={comments}
                onCommentChange={(val) => setComments((prev) => ({ ...prev, [item.event.id]: val }))}
                onStatusChange={(status) => updateAttendance(item.event.id, status)}
                onSaveComment={() => saveComment(item.event.id)}
                updating={updating === item.event.id}
              />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            過去のイベント ({past.length})
          </h2>
          <div className="space-y-3">
            {past.map((item) => (
              <EventCard
                key={item.event.id}
                item={item}
                profile={profile}
                expanded={expandedId === item.event.id}
                onToggle={() => setExpandedId(expandedId === item.event.id ? null : item.event.id)}
                comments={comments}
                onCommentChange={(val) => setComments((prev) => ({ ...prev, [item.event.id]: val }))}
                onStatusChange={(status) => updateAttendance(item.event.id, status)}
                onSaveComment={() => saveComment(item.event.id)}
                updating={updating === item.event.id}
                isPast
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type EventCardProps = {
  item: EventWithAttendance;
  profile: Profile | null;
  expanded: boolean;
  onToggle: () => void;
  comments: Record<string, string>;
  onCommentChange: (val: string) => void;
  onStatusChange: (status: AttendanceStatus) => void;
  onSaveComment: () => void;
  updating: boolean;
  isPast?: boolean;
};

function EventCard({ item, profile, expanded, onToggle, comments, onCommentChange, onStatusChange, onSaveComment, updating, isPast }: EventCardProps) {
  const { event, attendanceList, myAttendance } = item;

  const statusCounts = STATUS_ORDER.map((s) => ({
    status: s,
    count: attendanceList.filter((a) => a.status === s).length,
  }));

  const totalResponded = attendanceList.length;

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition ${isPast ? 'opacity-60' : ''}`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${EVENT_TYPE_COLORS[event.type] ?? EVENT_TYPE_COLORS.other}`}>
              {EVENT_TYPE_LABELS[event.type] ?? event.type}
            </span>
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{event.title}</h3>
          </div>
        </div>

        <div className="space-y-1.5 text-sm text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{formatDate(event.event_date)}</span>
            <Clock className="w-3.5 h-3.5 shrink-0 ml-1" />
            <span>{formatTime(event.event_date)}{event.end_time && `〜${formatTime(event.end_time)}`}</span>
            {event.meet_time && (
              <span className="text-navy-600 ml-1">集合 {formatTime(event.meet_time)}</span>
            )}
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {event.note && (
          <p className="mt-2.5 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{event.note}</p>
        )}

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {statusCounts.map(({ status, count }) => {
            const c = STATUS_COLORS[status];
            return (
              <div key={status} className={`flex items-center gap-1 text-xs font-medium ${c.text}`}>
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                {STATUS_LABELS[status]} {count}
              </div>
            );
          })}
          <div className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
            <Users className="w-3.5 h-3.5" />
            {totalResponded}名回答
          </div>
        </div>
      </div>

      {!isPast && profile && (
        <div className="px-4 sm:px-5 pb-4">
          <div className="grid grid-cols-3 gap-2">
            {STATUS_ORDER.map((status) => {
              const Icon = STATUS_ICONS[status];
              const c = STATUS_COLORS[status];
              const active = myAttendance?.status === status;
              return (
                <button
                  key={status}
                  onClick={() => onStatusChange(status)}
                  disabled={updating}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    active
                      ? `${c.bg} ${c.text} ${c.border} shadow-sm`
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  } disabled:opacity-50`}
                >
                  <Icon className="w-4 h-4" />
                  {STATUS_LABELS[status]}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400 mt-2.5 shrink-0" />
            <textarea
              value={comments[event.id] ?? ''}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="コメント（任意）"
              rows={2}
              className="flex-1 text-sm rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 transition resize-none"
            />
            <button
              onClick={onSaveComment}
              disabled={updating || !myAttendance}
              className="px-3 py-2 text-xs font-semibold text-white bg-navy-600 rounded-lg hover:bg-navy-700 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              保存
            </button>
          </div>
          {!myAttendance && (
            <p className="text-xs text-slate-400 mt-1.5 ml-6">出欠を選ぶとコメントも保存できます</p>
          )}
        </div>
      )}

      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition"
      >
        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          メンバーの出欠状況
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-200">
          {attendanceList.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400 text-center">まだ回答がありません</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {attendanceList.map((att) => {
                const c = STATUS_COLORS[att.status];
                const Icon = STATUS_ICONS[att.status];
                return (
                  <div key={att.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-500 to-navy-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {att.profiles?.name?.charAt(0) ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{att.profiles?.name ?? '不明'}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
                          <Icon className="w-3 h-3" />
                          {STATUS_LABELS[att.status]}
                        </span>
                      </div>
                      {att.comment && (
                        <p className="text-xs text-slate-500 mt-0.5">{att.comment}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
