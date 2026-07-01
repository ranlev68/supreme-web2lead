import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Clock, CheckCircle2, Circle, ChevronRight, ChevronDown, Flag, Users, FileText, Play, Pause, Square, GripVertical, Palette, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import AssigneeSelector from "./AssigneeSelector";
import CardDetailModal from "./CardDetailModal";

const THEME_COLORS = [
  // Dark themes — distinct hues
  { label: "Charcoal", bg: "#1a1d2e", surface: "#252842", isLight: false },
  { label: "Midnight", bg: "#0c1a2e", surface: "#142844", isLight: false },
  { label: "Forest",   bg: "#14241c", surface: "#1e3328", isLight: false },
  { label: "Wine",     bg: "#241420", surface: "#34202a", isLight: false },
  { label: "Cocoa",    bg: "#241a12", surface: "#322620", isLight: false },
  // Light themes — distinct tints
  { label: "Cloud",    bg: "#e8eaf2", surface: "#f5f6fb", isLight: true },
  { label: "Sand",     bg: "#f5ecd6", surface: "#fcf7ec", isLight: true },
  { label: "Mint",     bg: "#dff0e8", surface: "#ecf7f1", isLight: true },
  { label: "Blush",    bg: "#fbe9ed", surface: "#fdf3f5", isLight: true },
];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "bg-red-500 text-white",    dot: "bg-red-500" },
  { value: "high",   label: "High",   color: "bg-orange-400 text-white", dot: "bg-orange-400" },
  { value: "medium", label: "Medium", color: "bg-amber-400 text-white",  dot: "bg-amber-400" },
  { value: "low",    label: "Low",    color: "bg-blue-400 text-white",   dot: "bg-blue-400" },
];

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function MeetingTimer({ isLight }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const textColor = isLight ? "text-gray-800" : "text-white";
  const mutedColor = isLight ? "text-gray-400" : "text-white/40";
  const hoverBg = isLight ? "hover:bg-gray-200" : "hover:bg-white/10";

  return (
    <div className="flex items-center gap-2">
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5">
        {running ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </>
        ) : (
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${mutedColor.replace("text-", "bg-")}`} />
        )}
      </span>
      <span className={`text-xl font-mono font-bold tabular-nums tracking-tight ${textColor}`}>
        {formatTime(seconds)}
      </span>
      <button
        onClick={() => setRunning(r => !r)}
        className={`p-1.5 rounded-lg transition-colors ${hoverBg} ${isLight ? "text-gray-600" : "text-white/70 hover:text-white"}`}
        title={running ? "Pause" : "Start"}
      >
        {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={() => { setSeconds(0); setRunning(false); }}
        className={`p-1.5 rounded-lg transition-colors ${hoverBg} ${isLight ? "text-gray-400" : "text-white/40 hover:text-white/60"}`}
        title="Reset"
      >
        <Square className="h-3 w-3" />
      </button>
    </div>
  );
}

function AgendaCard({ card, index, isActive, onActivate, onCardUpdate, currentUser, boardId, lists, dragHandleProps, onOpenCard, isLight }) {
  const [localCard, setLocalCard] = useState(card);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocalCard(card); }, [card]);

  const listTitle = lists.find(l => l.id === localCard.list_id)?.title || "";

  const logChange = async (field, oldVal, newVal) => {
    await base44.entities.Activity.create({
      card_id: localCard.id,
      board_id: localCard.board_id,
      type: "change",
      field_changed: field,
      old_value: String(oldVal || ""),
      new_value: String(newVal || ""),
      author_name: currentUser?.full_name || currentUser?.email || "Someone",
      author_email: currentUser?.email || "",
    });
  };

  const updateCard = async (updates, logEntry) => {
    setSaving(true);
    const updated = { ...localCard, ...updates };
    await base44.entities.Card.update(localCard.id, updates);
    if (logEntry) await logChange(logEntry.field, logEntry.old, logEntry.new);
    setLocalCard(updated);
    onCardUpdate(updated);
    setSaving(false);
  };

  const toggleComplete = () => {
    const next = !localCard.completed;
    updateCard({ completed: next }, { field: "completed", old: localCard.completed ? "Complete" : "Incomplete", new: next ? "Complete" : "Incomplete" });
  };

  const setPriority = (val) => {
    const next = localCard.priority === val ? null : val;
    updateCard({ priority: next }, { field: "priority", old: localCard.priority || "none", new: next || "none" });
  };

  const cardBg = isLight
    ? isActive ? "bg-white border-indigo-300 shadow-xl shadow-indigo-100/60" : "bg-white border-gray-200/60 shadow-md shadow-gray-300/40 hover:shadow-lg hover:shadow-gray-300/50 hover:border-gray-300"
    : isActive ? "bg-white/10 border-indigo-400/60 shadow-xl shadow-black/30" : "bg-white/5 border-white/10 shadow-md shadow-black/20 hover:shadow-lg hover:shadow-black/30 hover:border-white/20 hover:bg-white/8";

  const titleColor = isLight
    ? localCard.completed ? "text-gray-400 line-through" : "text-gray-800"
    : localCard.completed ? "text-white/30 line-through" : "text-white";

  const metaColor = isLight ? "text-gray-400" : "text-white/40";
  const expandedBg = isLight ? "border-gray-100 bg-gray-50/50" : "border-white/5 bg-white/3";
  const descBg = isLight ? "bg-gray-100 text-gray-600" : "bg-white/5 text-white/60";
  const sectionLabel = isLight ? "text-gray-400" : "text-white/40";
  const priorityInactive = isLight ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-white/8 text-white/50 hover:bg-white/12";

  return (
    <div className={`rounded-2xl border transition-all duration-200 ${cardBg}`}>
      {/* Card row */}
      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" onClick={() => onActivate(isActive ? null : card.id)}>
        <div
          {...dragHandleProps}
          onClick={e => e.stopPropagation()}
          className={`shrink-0 cursor-grab active:cursor-grabbing transition-colors ${isLight ? "text-gray-200 hover:text-gray-400" : "text-white/15 hover:text-white/30"}`}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 tabular-nums ${isLight ? "bg-gray-100 text-gray-400" : "bg-white/8 text-white/30"}`}>
          {index + 1}
        </span>

        <button onClick={(e) => { e.stopPropagation(); toggleComplete(); }} className="shrink-0 p-0.5 rounded-full transition-transform hover:scale-110">
          {localCard.completed
            ? <CheckCircle2 className="h-6 w-6 text-emerald-500 drop-shadow-sm" />
            : <Circle className={`h-6 w-6 transition-colors ${isLight ? "text-gray-300 hover:text-emerald-400" : "text-white/25 hover:text-emerald-400"}`} />
          }
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${titleColor}`}>{localCard.title}</p>
          <p className={`text-xs mt-0.5 ${metaColor}`}>
            {listTitle}{localCard.assigned_to_name ? <> · <span className="font-medium">{localCard.assigned_to_name}</span></> : ""}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {localCard.labels && localCard.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end">
              {localCard.labels.map((label, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name || ""}
                </span>
              ))}
            </div>
          )}
          {localCard.priority && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_OPTIONS.find(p => p.value === localCard.priority)?.color || ""}`}>
              {localCard.priority}
            </span>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); updateCard({ team_meeting: false }, { field: "team meeting", old: "Yes", new: "No" }); }}
          className={`shrink-0 p-1.5 rounded-lg transition-colors ${isLight ? "text-purple-600 bg-purple-100 hover:bg-purple-200" : "text-purple-300 bg-purple-500/20 hover:bg-purple-500/30"}`}
          title="Remove from agenda"
        >
          <Users className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onOpenCard(localCard); }}
          className={`shrink-0 p-1.5 rounded-lg transition-colors ${isLight ? "text-gray-300 hover:text-gray-600 hover:bg-gray-100" : "text-white/20 hover:text-white/60 hover:bg-white/8"}`}
          title="Open card"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>

        {saving && <div className={`h-3 w-3 border-2 border-t-transparent rounded-full animate-spin shrink-0 ${isLight ? "border-indigo-400" : "border-indigo-400"}`} />}

        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isActive ? "rotate-90" : ""} ${isLight ? "text-gray-300" : "text-white/20"}`} />
      </div>

      {/* Expanded */}
      {isActive && (
        <div className={`px-4 pb-4 pt-3 border-t space-y-4 ${expandedBg}`}>
          {localCard.description && (
            <p className={`text-sm rounded-xl p-3 leading-relaxed ${descBg}`}>{localCard.description}</p>
          )}
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1 ${sectionLabel}`}>
              <Flag className="h-3 w-3" /> Priority
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPriority(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    localCard.priority === opt.value ? opt.color : priorityInactive
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1 ${sectionLabel}`}>
              <Users className="h-3 w-3" /> Assigned To
            </p>
            <AssigneeSelector
              card={localCard}
              boardId={boardId}
              currentUser={currentUser}
              readOnly={false}
              onUpdate={(updated) => { setLocalCard(updated); onCardUpdate(updated); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetingMode({ cards, lists, boardId, currentUser, onClose, onCardUpdate, labelDefinitions = [], onLabelDefinitionsChange, memberRole = "editor", enableTimeTracking = false }) {
  const [meetingCards, setMeetingCards] = useState(
    cards.filter(c => c.team_meeting && !c.is_archived).sort((a, b) => a.position - b.position)
  );
  const [activeCardId, setActiveCardId] = useState(null);
  const [cardNotes, setCardNotes] = useState({});
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [minutesSaved, setMinutesSaved] = useState(false);
  const themeKey = `meeting-theme-${boardId}`;
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(themeKey);
    return THEME_COLORS.find(t => t.label === saved) || THEME_COLORS[0];
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [overlayCard, setOverlayCard] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const isLight = theme.isLight;
  const activeCard = meetingCards.find(c => c.id === activeCardId) || null;
  const minutes = activeCardId ? (cardNotes[activeCardId] || "") : "";
  const completedCount = meetingCards.filter(c => c.completed).length;

  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textMuted = isLight ? "text-gray-500" : "text-white/50";
  const borderColor = isLight ? "border-gray-200" : "border-white/8";
  const hoverBg = isLight ? "hover:bg-gray-100" : "hover:bg-white/8";
  const iconColor = isLight ? "text-gray-500" : "text-white/50";

  const handleCardUpdate = (updated) => {
    setMeetingCards(prev => {
      if (updated.team_meeting === false) return prev.filter(c => c.id !== updated.id);
      return prev.map(c => c.id === updated.id ? updated : c);
    });
    if (overlayCard?.id === updated.id) setOverlayCard(updated);
    onCardUpdate(updated);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = [...meetingCards];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setMeetingCards(reordered);
  };

  const saveMinutes = async () => {
    if (!minutes.trim() || !activeCardId) return;
    setSavingMinutes(true);
    await base44.entities.Activity.create({
      card_id: activeCardId,
      board_id: boardId,
      type: "comment",
      text: `📝 Meeting Notes:\n${minutes.trim()}`,
      author_name: currentUser?.full_name || currentUser?.email || "Meeting Host",
      author_email: currentUser?.email || "",
    });
    setSavingMinutes(false);
    setMinutesSaved(true);
    setCardNotes(prev => ({ ...prev, [activeCardId]: "" }));
    setTimeout(() => setMinutesSaved(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: theme.bg }}
    >
      {/* ── Header ── */}
      <div
        className={`shrink-0 px-5 py-3.5 flex items-center gap-4 border-b ${borderColor}`}
        style={{ background: theme.surface }}
      >
        {/* Left: logo + title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${isLight ? "bg-indigo-100" : "bg-indigo-500/20"}`}>
            <Users className={`h-4 w-4 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
          </div>
          <div className="min-w-0">
            <h1 className={`font-semibold text-sm leading-none ${textPrimary}`}>Meeting Mode</h1>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              {completedCount} / {meetingCards.length} items
            </p>
          </div>
        </div>

        {/* Right: timer + theme + close */}
        <div className="flex items-center gap-1 shrink-0">
          <MeetingTimer isLight={isLight} />

          {/* Theme picker */}
          <div className="relative ml-1">
            <button
              onClick={() => setShowColorPicker(p => !p)}
              className={`p-1.5 rounded-lg transition-colors ${hoverBg} ${iconColor}`}
              title="Change theme"
            >
              <Palette className="h-4 w-4" />
            </button>
            {showColorPicker && (
              <div className={`absolute top-9 right-0 rounded-xl shadow-2xl p-3 z-20 border ${isLight ? "bg-white border-gray-200" : "bg-[#1e2133] border-white/10"}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${textMuted}`}>Theme</p>
                <div className="flex flex-col gap-1.5">
                  {THEME_COLORS.map(t => (
                    <button
                      key={t.label}
                      onClick={() => { setTheme(t); localStorage.setItem(themeKey, t.label); setShowColorPicker(false); }}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors w-full text-left ${
                        theme.label === t.label
                          ? isLight ? "bg-indigo-50 text-indigo-700" : "bg-indigo-500/20 text-indigo-300"
                          : isLight ? "text-gray-700 hover:bg-gray-100" : "text-white/70 hover:bg-white/8"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full border border-black/10 shrink-0" style={{ background: t.bg }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className={`ml-1 p-1.5 rounded-lg transition-colors ${hoverBg} ${iconColor}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

        {/* Agenda */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {meetingCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-4 ${isLight ? "bg-gray-100" : "bg-white/8"}`}>
                <Users className={`h-7 w-7 ${isLight ? "text-gray-400" : "text-white/30"}`} />
              </div>
              <h2 className={`font-semibold text-base mb-1 ${textPrimary}`}>No agenda items</h2>
              <p className={`text-sm max-w-xs leading-relaxed ${textMuted}`}>
                Flag cards with "Team Meeting" in the card details to add them to your meeting agenda.
              </p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="meeting-agenda">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 max-w-2xl mx-auto"
                  >
                    <p className={`text-[10px] font-semibold uppercase tracking-widest mb-4 ${textMuted}`}>
                      Agenda · {meetingCards.length} items
                    </p>
                    {meetingCards.map((card, i) => (
                      <Draggable key={card.id} draggableId={card.id} index={i}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps}>
                            <AgendaCard
                              card={card}
                              index={i}
                              isActive={activeCardId === card.id}
                              onActivate={setActiveCardId}
                              onCardUpdate={handleCardUpdate}
                              currentUser={currentUser}
                              boardId={boardId}
                              lists={lists}
                              dragHandleProps={provided.dragHandleProps}
                              onOpenCard={setOverlayCard}
                              isLight={isLight}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {/* Notes — collapsible on mobile/tablet, sidebar on desktop */}
        <div className={`lg:hidden shrink-0 border-t ${borderColor}`} style={{ background: theme.surface }}>
          <button
            onClick={() => setNotesOpen(o => !o)}
            className={`w-full flex items-center justify-between px-4 py-3 ${textPrimary}`}
          >
            <div className="flex items-center gap-2">
              <FileText className={`h-4 w-4 ${isLight ? "text-indigo-500" : "text-indigo-400"}`} />
              <span className="text-sm font-semibold">Meeting Notes</span>
              {activeCard && <span className={`text-xs truncate max-w-[140px] ${textMuted}`}>— {activeCard.title}</span>}
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${notesOpen ? "rotate-180" : ""} ${textMuted}`} />
          </button>
          {notesOpen && (
            <div className="px-4 pb-4 flex flex-col gap-2">
              <Textarea
                value={minutes}
                onChange={e => activeCardId && setCardNotes(prev => ({ ...prev, [activeCardId]: e.target.value }))}
                placeholder={activeCardId ? "Type notes for this card..." : "Select an agenda card first..."}
                disabled={!activeCardId}
                rows={5}
                className={`text-sm resize-none focus:ring-0 ${
                  isLight
                    ? "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-indigo-300"
                    : "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-400/40"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              />
              <Button
                onClick={saveMinutes}
                disabled={!minutes.trim() || savingMinutes || !activeCardId}
                className={`w-full text-sm ${isLight ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border-0"}`}
              >
                {savingMinutes ? "Saving..." : minutesSaved ? "✓ Saved!" : "Save Note to Card"}
              </Button>
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        <div
          className={`hidden lg:flex lg:w-72 shrink-0 border-l flex-col p-5 ${borderColor}`}
          style={{ background: theme.surface }}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className={`h-4 w-4 ${isLight ? "text-indigo-500" : "text-indigo-400"}`} />
            <h2 className={`text-sm font-semibold ${textPrimary}`}>Meeting Notes</h2>
          </div>
          <p className={`text-xs mb-3 truncate ${textMuted}`}>
            {activeCard ? activeCard.title : "Select a card to take notes"}
          </p>

          <Textarea
            value={minutes}
            onChange={e => activeCardId && setCardNotes(prev => ({ ...prev, [activeCardId]: e.target.value }))}
            placeholder={activeCardId ? "Type notes for this card..." : "Select an agenda card first..."}
            disabled={!activeCardId}
            className={`flex-1 text-sm resize-none focus:ring-0 min-h-0 ${
              isLight
                ? "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-indigo-300"
                : "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-400/40"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          />

          <Button
            onClick={saveMinutes}
            disabled={!minutes.trim() || savingMinutes || !activeCardId}
            className={`mt-3 w-full text-sm ${isLight ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border-0"}`}
          >
            {savingMinutes ? "Saving..." : minutesSaved ? "✓ Saved!" : "Save Note to Card"}
          </Button>

          <p className={`text-[10px] mt-2 text-center ${textMuted}`}>
            Notes saved to card activity
          </p>

          {/* Summary */}
          <div className={`mt-4 pt-4 border-t ${borderColor}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${textMuted}`}>Summary</p>
            <div className="space-y-2">
              {[
                { label: "Total items", value: meetingCards.length, color: textPrimary },
                { label: "Completed", value: completedCount, color: "text-emerald-500" },
                { label: "Remaining", value: meetingCards.length - completedCount, color: "text-amber-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className={`text-xs ${textMuted}`}>{label}</span>
                  <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
                </div>
              ))}
            </div>
            {/* Mini progress */}
            <div className={`mt-3 h-1.5 rounded-full ${isLight ? "bg-gray-100" : "bg-white/8"}`}>
              <div
                className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: meetingCards.length ? `${(completedCount / meetingCards.length) * 100}%` : "0%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card detail overlay */}
      <CardDetailModal
        card={overlayCard}
        listTitle={overlayCard ? lists.find(l => l.id === overlayCard.list_id)?.title || "" : ""}
        open={!!overlayCard}
        onClose={() => setOverlayCard(null)}
        currentUser={currentUser}
        onUpdate={(updatedCard) => { if (updatedCard) handleCardUpdate(updatedCard); }}
        onDelete={() => { setOverlayCard(null); }}
        onArchive={memberRole !== "viewer" ? (card) => { setOverlayCard(null); onCardUpdate({ ...card, is_archived: true }); } : undefined}
        readOnly={memberRole === "viewer"}
        enableTimeTracking={enableTimeTracking}
        boardId={boardId}
        labelDefinitions={labelDefinitions}
        onLabelDefinitionsChange={onLabelDefinitionsChange}
      />
    </div>
  );
}