import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Play, Square, Plus, X, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatDuration(minutes) {
  if (!minutes || minutes < 1) return "0m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimeTracker({ card, user }) {
  const [entries, setEntries] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null); // { id, hours, minutes }
  const timerRef = useRef(null);

  const loadEntries = async () => {
    const data = await base44.entities.CardTimeEntry.filter({ card_id: card.id }, "-created_date");
    setEntries(data);
    const active = data.find((e) => !e.end_time && e.user_email === user?.email);
    setActiveEntry(active || null);
    if (active) {
      const diff = Math.floor((Date.now() - new Date(active.start_time).getTime()) / 1000);
      setElapsed(diff);
    }
  };

  useEffect(() => {
    loadEntries();
    return () => clearInterval(timerRef.current);
  }, [card.id]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (activeEntry) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [activeEntry]);

  const startTimer = async () => {
    const entry = await base44.entities.CardTimeEntry.create({
      card_id: card.id,
      board_id: card.board_id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      start_time: new Date().toISOString(),
    });
    setActiveEntry(entry);
    setElapsed(0);
    setEntries((prev) => [entry, ...prev]);
  };

  const stopTimer = async () => {
    if (!activeEntry) return;
    const endTime = new Date();
    const durationMinutes = (endTime - new Date(activeEntry.start_time)) / 60000;
    await base44.entities.CardTimeEntry.update(activeEntry.id, {
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
    });
    setActiveEntry(null);
    setElapsed(0);
    loadEntries();
  };

  const saveManual = async () => {
    const h = parseFloat(manualHours) || 0;
    const m = parseFloat(manualMinutes) || 0;
    const total = h * 60 + m;
    if (total <= 0) return;
    setSaving(true);
    const startTime = new Date(manualDate);
    const endTime = new Date(startTime.getTime() + total * 60000);
    await base44.entities.CardTimeEntry.create({
      card_id: card.id,
      board_id: card.board_id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: total,
    });
    setManualHours("");
    setManualMinutes("");
    setManualDate(new Date().toISOString().split("T")[0]);
    setShowManual(false);
    setSaving(false);
    loadEntries();
  };

  const deleteEntry = async (id) => {
    await base44.entities.CardTimeEntry.delete(id);
    loadEntries();
  };

  const startEditEntry = (e) => {
    const h = Math.floor((e.duration_minutes || 0) / 60);
    const m = Math.round((e.duration_minutes || 0) % 60);
    setEditingEntry({ id: e.id, hours: String(h), minutes: String(m) });
  };

  const saveEditEntry = async () => {
    const h = parseFloat(editingEntry.hours) || 0;
    const m = parseFloat(editingEntry.minutes) || 0;
    const total = h * 60 + m;
    if (total <= 0) return;
    await base44.entities.CardTimeEntry.update(editingEntry.id, { duration_minutes: total });
    setEditingEntry(null);
    loadEntries();
  };

  const totalMinutes = entries
    .filter((e) => e.duration_minutes)
    .reduce((sum, e) => sum + e.duration_minutes, 0);

  return (
    <div className="flex items-start gap-3 mb-5">
      <Clock className="h-5 w-5 text-gray-500 mt-1 shrink-0" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Time Tracking</h3>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[#0079BF] rounded-full transition-all"
              style={{ width: totalMinutes > 0 ? "100%" : "0%" }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 shrink-0">
            {formatDuration(totalMinutes)} logged
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeEntry ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-[#0079BF] bg-blue-50 px-2 py-1 rounded">
                {formatElapsed(elapsed)}
              </span>
              <Button
                size="sm"
                onClick={stopTimer}
                className="bg-red-500 hover:bg-red-600 text-white h-7 px-3"
              >
                <Square className="h-3 w-3 mr-1 fill-white" />
                Stop
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={startTimer}
              className="bg-[#0079BF] hover:bg-[#026AA7] text-white h-7 px-3"
            >
              <Play className="h-3 w-3 mr-1 fill-white" />
              Start timer
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowManual((v) => !v)}
            className="h-7 px-3 text-gray-600"
          >
            <Plus className="h-3 w-3 mr-1" />
            Log time
          </Button>
        </div>

        {showManual && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600">Log time manually</span>
              <button onClick={() => setShowManual(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  className="w-14 text-xs border border-gray-200 rounded px-2 py-1 text-center"
                />
                <span className="text-xs text-gray-500">h</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  className="w-14 text-xs border border-gray-200 rounded px-2 py-1 text-center"
                />
                <span className="text-xs text-gray-500">m</span>
              </div>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 flex-1"
              />
            </div>
            <Button
              size="sm"
              onClick={saveManual}
              disabled={saving || ((!manualHours || manualHours == 0) && (!manualMinutes || manualMinutes == 0))}
              className="bg-[#0079BF] hover:bg-[#026AA7] text-white h-7 w-full"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}

        {entries.filter((e) => e.duration_minutes).length > 0 && (
          <div className="mt-3 space-y-1">
            {entries.filter((e) => e.duration_minutes).slice(0, 10).map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-xs text-gray-500 bg-white rounded px-2 py-1 border border-gray-100 group/entry">
                <span className="flex-1 truncate">{e.user_name || e.user_email}</span>
                {editingEntry?.id === e.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number" min="0" placeholder="0"
                      value={editingEntry.hours}
                      onChange={(ev) => setEditingEntry((prev) => ({ ...prev, hours: ev.target.value }))}
                      className="w-10 border border-gray-300 rounded px-1 py-0.5 text-center text-xs"
                    />
                    <span className="text-gray-400">h</span>
                    <input
                      type="number" min="0" max="59" placeholder="0"
                      value={editingEntry.minutes}
                      onChange={(ev) => setEditingEntry((prev) => ({ ...prev, minutes: ev.target.value }))}
                      className="w-10 border border-gray-300 rounded px-1 py-0.5 text-center text-xs"
                    />
                    <span className="text-gray-400">m</span>
                    <button onClick={saveEditEntry} className="p-0.5 hover:text-green-600">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingEntry(null)} className="p-0.5 hover:text-gray-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-700 shrink-0">{formatDuration(e.duration_minutes)}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/entry:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => startEditEntry(e)} className="p-0.5 hover:text-blue-600" title="Edit">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => deleteEntry(e.id)} className="p-0.5 hover:text-red-500" title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}