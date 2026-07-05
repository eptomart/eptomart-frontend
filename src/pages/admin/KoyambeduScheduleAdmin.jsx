// ============================================================
// KOYAMBEDU DELIVERY SCHEDULE ADMIN
// Super Admin only — manage delivery dates and slot availability
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── Helpers ──────────────────────────────────────────────────
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmtDate = iso => {
  const d = new Date(iso + 'T00:00:00');
  return `${DAY_NAMES[d.getDay()]}, ${d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`;
};

// Status pill
const StatusPill = ({ label, color }) => (
  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
);

// ── Toggle switch ─────────────────────────────────────────────
const Toggle = ({ checked, onChange, disabled }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-green-500' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

// ── Capacity input inline ─────────────────────────────────────
const CapacityInput = ({ schedId, slotKey, initial, current, onSaved }) => {
  const [val, setVal] = useState(String(initial));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = parseInt(val);
    if (isNaN(n) || n < 1) { toast.error('Enter a valid capacity'); return; }
    setSaving(true);
    try {
      await api.patch(`/koyambedu/admin/schedule/${schedId}/slots/${slotKey}/capacity`, { maxCapacity: n });
      toast.success('Capacity updated');
      onSaved(n);
    } catch { toast.error('Failed to update capacity'); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number" min={1} value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => e.key === 'Enter' && save()}
        className="w-16 text-center text-xs font-bold border border-gray-200 rounded-lg px-1 py-1 focus:outline-none focus:border-green-400"
      />
      {saving && <span className="text-[10px] text-gray-400">saving…</span>}
    </div>
  );
};

// ── Single Schedule Card ──────────────────────────────────────
const ScheduleCard = ({ sched, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [togglingDate, setTogglingDate]   = useState(false);
  const [togglingSlot, setTogglingSlot]   = useState(null); // slotKey

  const handleDateToggle = async () => {
    setTogglingDate(true);
    const newStatus = sched.status === 'open' ? 'closed' : 'open';
    try {
      await api.patch(`/koyambedu/admin/schedule/${sched._id}/status`, { status: newStatus });
      toast.success(`${sched.dateISO} is now ${newStatus}`);
      onRefresh();
    } catch { toast.error('Failed to update'); }
    finally { setTogglingDate(false); }
  };

  const handleSlotToggle = async (sl) => {
    setTogglingSlot(sl.key);
    try {
      await api.patch(`/koyambedu/admin/schedule/${sched._id}/slots/${sl.key}/status`, { isEnabled: !sl.isEnabled });
      toast.success(`${sl.label} ${sl.isEnabled ? 'disabled' : 'enabled'}`);
      onRefresh();
    } catch { toast.error('Failed to update slot'); }
    finally { setTogglingSlot(null); }
  };

  const handleCapacitySaved = () => onRefresh();

  const totalOrders   = sched.slots.reduce((s, sl) => s + (sl.currentOrders || 0), 0);
  const totalCapacity = sched.slots.reduce((s, sl) => s + sl.maxCapacity, 0);
  const enabledSlots  = sched.slots.filter(sl => sl.isEnabled).length;
  const isOpen        = sched.status === 'open';

  return (
    <div className="bg-white rounded-2xl overflow-hidden mb-3"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: isOpen ? '1.5px solid #bbf7d0' : '1.5px solid #fca5a5' }}>

      {/* Date header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded(e => !e)} className="flex-1 text-left min-w-0">
          <p className="font-black text-gray-800 text-sm">{fmtDate(sched.dateISO)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {enabledSlots}/{sched.slots.length} slots enabled · {totalOrders}/{totalCapacity} orders
          </p>
        </button>
        <StatusPill
          label={isOpen ? '✅ Open' : '❌ Closed'}
          color={isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
        />
        <Toggle checked={isOpen} onChange={handleDateToggle} disabled={togglingDate} />
        <button onClick={() => setExpanded(e => !e)} className="text-gray-400 text-lg leading-none">
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded slots */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
            <span className="col-span-3">Slot</span>
            <span className="col-span-2 text-center">Cap.</span>
            <span className="col-span-2 text-center">Orders</span>
            <span className="col-span-2 text-center">Left</span>
            <span className="col-span-2 text-center">Status</span>
            <span className="col-span-1" />
          </div>
          {sched.slots.map(sl => {
            const remaining = sl.maxCapacity - (sl.currentOrders || 0);
            const isFull    = remaining <= 0;
            return (
              <div key={sl.key}
                className={`grid grid-cols-12 gap-1 items-center px-4 py-2.5 border-t border-gray-50 ${!sl.isEnabled ? 'opacity-60' : ''}`}>
                <span className="col-span-3 text-xs font-bold text-gray-700">{sl.label}</span>
                <span className="col-span-2 text-center">
                  <CapacityInput
                    schedId={sched._id}
                    slotKey={sl.key}
                    initial={sl.maxCapacity}
                    current={sl.currentOrders || 0}
                    onSaved={handleCapacitySaved}
                  />
                </span>
                <span className="col-span-2 text-center text-xs font-bold text-gray-700">{sl.currentOrders || 0}</span>
                <span className={`col-span-2 text-center text-xs font-bold ${isFull ? 'text-red-600' : 'text-green-600'}`}>
                  {isFull ? 'Full' : remaining}
                </span>
                <span className="col-span-2 text-center">
                  {!sl.isEnabled ? (
                    <StatusPill label="Disabled" color="bg-red-100 text-red-600" />
                  ) : isFull ? (
                    <StatusPill label="Full" color="bg-amber-100 text-amber-700" />
                  ) : (
                    <StatusPill label="Active" color="bg-green-100 text-green-700" />
                  )}
                </span>
                <span className="col-span-1 flex justify-end">
                  <Toggle
                    checked={sl.isEnabled}
                    onChange={() => handleSlotToggle(sl)}
                    disabled={togglingSlot === sl.key}
                  />
                </span>
              </div>
            );
          })}
          {/* Audit log — last 5 entries */}
          {sched.auditLog?.length > 0 && (
            <div className="px-4 pb-3 pt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Recent Changes</p>
              <div className="space-y-1">
                {[...sched.auditLog].reverse().slice(0, 5).map((log, i) => (
                  <p key={i} className="text-[10px] text-gray-500">
                    <span className="font-bold text-gray-700">{log.updatedByName || 'Admin'}</span>
                    {' · '}{log.action?.replace(/_/g, ' ')}
                    {log.slotKey ? ` (${log.slotKey})` : ''}
                    {log.prevValue !== null && log.prevValue !== undefined ? ` · ${log.prevValue} → ${log.newValue}` : ''}
                    {' · '}{new Date(log.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
export default function KoyambeduScheduleAdmin() {
  const [schedules, setSchedules] = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [filterStatus,     setFilterStatus]     = useState('');  // '' | 'open' | 'closed'
  const [filterSlotStatus, setFilterSlotStatus] = useState('');  // '' | 'enabled' | 'disabled'
  const [filterFrom,       setFilterFrom]       = useState('');
  const [filterTo,         setFilterTo]         = useState('');
  const [expandAll,        setExpandAll]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus)     params.set('status', filterStatus);
      if (filterSlotStatus) params.set('slotStatus', filterSlotStatus);
      if (filterFrom)       params.set('from', filterFrom);
      if (filterTo)         params.set('to', filterTo);

      const [schRes, stRes] = await Promise.all([
        api.get(`/koyambedu/admin/schedule?${params}`),
        api.get('/koyambedu/admin/schedule/stats'),
      ]);
      setSchedules(schRes.data.schedules || []);
      setStats(stRes.data.stats || null);
    } catch { toast.error('Failed to load schedules'); }
    finally  { setLoading(false); }
  }, [filterStatus, filterSlotStatus, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/koyambedu/admin/schedule/generate', { days: 14 });
      toast.success(data.message);
      load();
    } catch { toast.error('Failed to generate schedules'); }
    finally  { setGenerating(false); }
  };

  // Stat card
  const StatCard = ({ label, value, color = 'text-gray-800' }) => (
    <div className="bg-white rounded-xl p-3 text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <p className={`font-black text-xl ${color}`}>{value ?? '—'}</p>
      <p className="text-[10px] text-gray-400 font-semibold mt-0.5 leading-snug">{label}</p>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Stats dashboard ── */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Total Dates"      value={stats.totalDates} />
          <StatCard label="Open Dates"       value={stats.activeDates}    color="text-green-600" />
          <StatCard label="Closed Dates"     value={stats.closedDates}    color="text-red-500" />
          <StatCard label="Today Orders"     value={stats.todayOrders}    color="text-blue-600" />
          <StatCard label="Tomorrow Orders"  value={stats.tomorrowOrders} color="text-purple-600" />
          <StatCard label="Today Status"     value={stats.todayStatus === 'open' ? '✅ Open' : stats.todayStatus === 'closed' ? '❌ Closed' : '—'} />
          <StatCard label="Tomorrow Status"  value={stats.tomorrowStatus === 'open' ? '✅ Open' : stats.tomorrowStatus === 'closed' ? '❌ Closed' : '—'} />
          <div className="col-span-1">
            <button onClick={handleGenerate} disabled={generating}
              className="w-full h-full rounded-xl text-white text-xs font-bold transition active:scale-95"
              style={{ background: 'linear-gradient(135deg,#16a34a,#059669)', minHeight: 60 }}>
              {generating ? 'Generating…' : '+ Generate\nNext 14 Days'}
            </button>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl px-4 py-3 space-y-2" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-bold text-gray-600 shrink-0">Filters:</p>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-400">
            <option value="">All Dates</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          <select value={filterSlotStatus} onChange={e => setFilterSlotStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-400">
            <option value="">All Slots</option>
            <option value="enabled">Has Enabled Slots</option>
            <option value="disabled">Has Disabled Slots</option>
          </select>

          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-400" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-400" />

          <button onClick={() => { setFilterStatus(''); setFilterSlotStatus(''); setFilterFrom(''); setFilterTo(''); }}
            className="text-xs text-gray-400 underline">Clear</button>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setExpandAll(e => !e)}
              className="text-xs text-green-700 font-bold underline">
              {expandAll ? 'Collapse All' : 'Expand All'}
            </button>
            <button onClick={load}
              className="text-xs bg-gray-100 text-gray-600 font-bold px-3 py-1.5 rounded-lg">
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Schedule list ── */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400 text-sm mb-3">No schedules found.</p>
          <button onClick={handleGenerate} disabled={generating}
            className="text-white font-bold px-5 py-2.5 rounded-xl text-sm"
            style={{ background: 'linear-gradient(135deg,#16a34a,#059669)' }}>
            {generating ? 'Generating…' : '+ Generate Next 14 Days'}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-[11px] text-gray-400 mb-2">{schedules.length} schedule(s) found</p>
          {schedules.map(sched => (
            <ScheduleCardWrapper
              key={sched._id}
              sched={sched}
              forceExpand={expandAll}
              onRefresh={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Wrapper to support forceExpand
function ScheduleCardWrapper({ sched, forceExpand, onRefresh }) {
  // When forceExpand changes we propagate it as a key trick isn't clean,
  // so we pass it as a prop and let ScheduleCard manage it.
  return <ScheduleCardInner sched={sched} forceExpand={forceExpand} onRefresh={onRefresh} />;
}

function ScheduleCardInner({ sched, forceExpand, onRefresh }) {
  const [togglingDate, setTogglingDate]   = useState(false);
  const [togglingSlot, setTogglingSlot]   = useState(null);
  const [expanded, setExpanded]           = useState(forceExpand);

  useEffect(() => { setExpanded(forceExpand); }, [forceExpand]);

  const handleDateToggle = async () => {
    setTogglingDate(true);
    const newStatus = sched.status === 'open' ? 'closed' : 'open';
    try {
      await api.patch(`/koyambedu/admin/schedule/${sched._id}/status`, { status: newStatus });
      toast.success(`${sched.dateISO} is now ${newStatus}`);
      onRefresh();
    } catch { toast.error('Failed to update'); }
    finally  { setTogglingDate(false); }
  };

  const handleSlotToggle = async (sl) => {
    setTogglingSlot(sl.key);
    try {
      await api.patch(`/koyambedu/admin/schedule/${sched._id}/slots/${sl.key}/status`, { isEnabled: !sl.isEnabled });
      toast.success(`${sl.label} ${sl.isEnabled ? 'disabled' : 'enabled'}`);
      onRefresh();
    } catch { toast.error('Failed to update slot'); }
    finally  { setTogglingSlot(null); }
  };

  const totalOrders   = sched.slots.reduce((s, sl) => s + (sl.currentOrders || 0), 0);
  const totalCapacity = sched.slots.reduce((s, sl) => s + sl.maxCapacity, 0);
  const enabledSlots  = sched.slots.filter(sl => sl.isEnabled).length;
  const isOpen        = sched.status === 'open';

  return (
    <div className="bg-white rounded-2xl overflow-hidden mb-3"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: isOpen ? '1.5px solid #bbf7d0' : '1.5px solid #fca5a5' }}>

      {/* Date header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded(e => !e)} className="flex-1 text-left min-w-0">
          <p className="font-black text-gray-800 text-sm">{fmtDate(sched.dateISO)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {enabledSlots}/{sched.slots.length} slots enabled · {totalOrders}/{totalCapacity} orders booked
          </p>
        </button>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isOpen ? '✅ Open' : '❌ Closed'}
        </span>
        <Toggle checked={isOpen} onChange={handleDateToggle} disabled={togglingDate} />
        <button onClick={() => setExpanded(e => !e)} className="text-gray-400 text-sm shrink-0">
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Slots */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-gray-50">
            {['Slot','Max','Orders','Left','Status',''].map((h, i) => (
              <span key={i} className={`text-[10px] font-bold text-gray-400 uppercase tracking-wide ${
                i === 0 ? 'col-span-3' : i === 5 ? 'col-span-1' : 'col-span-2 text-center'
              }`}>{h}</span>
            ))}
          </div>

          {sched.slots.map(sl => {
            const remaining = sl.maxCapacity - (sl.currentOrders || 0);
            const isFull    = remaining <= 0;
            return (
              <div key={sl.key}
                className={`grid grid-cols-12 gap-1 items-center px-4 py-2.5 border-t border-gray-50 ${!sl.isEnabled ? 'bg-gray-50/70' : ''}`}>
                <div className="col-span-3">
                  <p className={`text-xs font-bold ${sl.isEnabled ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{sl.label}</p>
                </div>
                <div className="col-span-2 flex justify-center">
                  <CapacityInput
                    schedId={sched._id}
                    slotKey={sl.key}
                    initial={sl.maxCapacity}
                    current={sl.currentOrders || 0}
                    onSaved={onRefresh}
                  />
                </div>
                <span className="col-span-2 text-center text-xs font-bold text-gray-700">{sl.currentOrders || 0}</span>
                <span className={`col-span-2 text-center text-xs font-bold ${isFull ? 'text-red-600' : remaining < 20 ? 'text-amber-600' : 'text-green-600'}`}>
                  {isFull ? '🔴 Full' : remaining}
                </span>
                <div className="col-span-2 flex justify-center">
                  {!sl.isEnabled ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Off</span>
                  ) : isFull ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Full</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">On</span>
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Toggle
                    checked={sl.isEnabled}
                    onChange={() => handleSlotToggle(sl)}
                    disabled={togglingSlot === sl.key}
                  />
                </div>
              </div>
            );
          })}

          {/* Audit log */}
          {sched.auditLog?.length > 0 && (
            <div className="px-4 pb-3 pt-2 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Audit Log</p>
              <div className="space-y-1">
                {[...sched.auditLog].reverse().slice(0, 8).map((log, i) => (
                  <p key={i} className="text-[10px] text-gray-500 flex gap-1 flex-wrap">
                    <span className="font-bold text-gray-700">{log.updatedByName || 'Admin'}</span>
                    <span>{log.action?.replace(/_/g,' ')}</span>
                    {log.slotKey && <span className="text-green-600">({log.slotKey})</span>}
                    {(log.prevValue !== null && log.prevValue !== undefined) && (
                      <span>{String(log.prevValue)} → {String(log.newValue)}</span>
                    )}
                    <span className="text-gray-300">·</span>
                    <span>{new Date(log.timestamp).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
