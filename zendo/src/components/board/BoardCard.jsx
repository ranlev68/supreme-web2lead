import { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import { createPortal } from "react-dom";
import { AlignLeft, Calendar, Paperclip, Tag, Circle, Play, Square, Clock, ChevronDown, AlertCircle, Users, Hash, User } from "lucide-react";
import moment from "moment";

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  high:   { label: "High",   bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  medium: { label: "Medium", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-400" },
  low:    { label: "Low",    bg: "bg-blue-100", text: "text-blue-600", dot: "bg-blue-400" },
};
import { base44 } from "@/api/base44Client";
import CardLabelPicker from "./CardLabelPicker";
import { InitialsAvatar } from "./AssigneeSelector";
import { motion } from "framer-motion";

const PRIORITIES = [
  { value: "urgent", label: "Urgent", dot: "bg-red-500", text: "text-red-700" },
  { value: "high",   label: "High",   dot: "bg-orange-400", text: "text-orange-700" },
  { value: "medium", label: "Medium", dot: "bg-yellow-400", text: "text-yellow-700" },
  { value: "low",    label: "Low",    dot: "bg-blue-400", text: "text-blue-600" },
  { value: null,     label: "No Priority", dot: "bg-gray-300", text: "text-gray-500" },
];

export default function BoardCard({ card, onClick, onCardUpdate, onRefresh, readOnly, labelDefinitions = [], enableTimeTracking = false, currentUser = null, isDone = false, showAgendaToggle = false, customFieldDefinitions = [] }) {
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [priorityPos, setPriorityPos] = useState({ top: 0, left: 0 });
  const [activeEntry, setActiveEntry] = useState(null);
  const [localCard, setLocalCard] = useState(card);
  const pickerRef = useRef(null);
  const btnRef = useRef(null);
  const priorityRef = useRef(null);
  const priorityBtnRef = useRef(null);

  // Sync localCard when parent card prop changes
  useEffect(() => { setLocalCard(card); }, [card]);

  const hasDescription = localCard.description && localCard.description.trim().length > 0;
  const labels = localCard.labels || [];
  const attachments = localCard.attachments || [];

  // Checklist progress
  const checklists = localCard.checklists || [];
  const totalItems = checklists.reduce((sum, cl) => sum + (cl.items?.length || 0), 0);
  const checkedItems = checklists.reduce((sum, cl) => sum + (cl.items?.filter(i => i.checked).length || 0), 0);
  const hasChecklists = totalItems > 0;
  const latestImage = [...attachments].reverse().find((a) => a.type?.startsWith("image/"));

  useEffect(() => {
    if (!showLabelPicker) return;
    const handler = (e) => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setShowLabelPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLabelPicker]);

  useEffect(() => {
    if (!showPriorityPicker) return;
    const handler = (e) => {
      if (
        priorityRef.current && !priorityRef.current.contains(e.target) &&
        priorityBtnRef.current && !priorityBtnRef.current.contains(e.target)
      ) {
        setShowPriorityPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPriorityPicker]);

  const handleSetPriority = async (e, value) => {
    e.stopPropagation();
    const updated = { ...localCard, priority: value || null };
    setLocalCard(updated);
    setShowPriorityPicker(false);
    await base44.entities.Card.update(card.id, { priority: value || null });
    onCardUpdate?.(updated);
  };

  useEffect(() => {
    if (!enableTimeTracking || !currentUser) return;
    base44.entities.CardTimeEntry.filter({ card_id: card.id }).then((entries) => {
      const active = entries.find((e) => !e.end_time && e.user_email === currentUser.email);
      setActiveEntry(active || null);
    });
  }, [enableTimeTracking, card.id, currentUser]);

  const handleStartTimer = async (e) => {
    e.stopPropagation();
    if (!currentUser) return;
    const entry = await base44.entities.CardTimeEntry.create({
      card_id: card.id,
      board_id: card.board_id,
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
      start_time: new Date().toISOString(),
    });
    setActiveEntry(entry);
  };

  const handleStopTimer = async (e) => {
    e.stopPropagation();
    if (!activeEntry) return;
    const endTime = new Date();
    const durationMinutes = (endTime - new Date(activeEntry.start_time)) / 60000;
    await base44.entities.CardTimeEntry.update(activeEntry.id, {
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
    });
    setActiveEntry(null);
  };

  const toggleComplete = async (e) => {
    e.stopPropagation();
    const completing = !localCard.completed;
    const updated = { ...localCard, completed: completing };
    setLocalCard(updated);
    if (completing) {
      const rect = e.currentTarget.getBoundingClientRect();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: ["#5AAC44", "#0079BF", "#F5A623", "#EB5A46", "#C377E0"],
        scalar: 0.8,
      });
    }
    await base44.entities.Card.update(card.id, { completed: updated.completed });
    onCardUpdate?.(updated);
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl shadow-sm cursor-pointer transition-colors group relative hover:shadow-md ${isDone ? "bg-secondary border border-border/50" : "bg-card border border-border"} ${localCard.completed ? "opacity-60" : ""}`}
    >
      {latestImage && !localCard.cover_color && (
        <div className="w-full h-24 rounded-t-xl overflow-hidden bg-gray-100">
          <img
            src={latestImage.url}
            alt="attachment preview"
            className="w-full h-24 object-cover rounded-t-xl"
            loading="lazy"
            onLoad={(e) => { e.target.style.opacity = 1; }}
            style={{ opacity: 0, transition: "opacity 0.2s ease" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>
      )}
      {localCard.cover_color && (
        <div className="h-8 rounded-t-xl" style={{ backgroundColor: localCard.cover_color }} />
      )}
      <div className="px-3 py-2">
        {/* Tags row: labels on left, priority on right */}
        {(labels.length > 0 || (localCard.priority && PRIORITY_CONFIG[localCard.priority]) || localCard.team_meeting) && (
          <div className="flex items-center justify-between gap-1 mb-1.5">
            {/* Left: client/color labels */}
            <div className="flex flex-wrap gap-1 min-w-0">
              {localCard.team_meeting && (
                <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 shrink-0">
                  <Users className="h-2.5 w-2.5" />
                  Agenda
                </span>
              )}
              {labels.map((label, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 h-5 rounded-full text-[11px] font-semibold text-white shrink-0"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name || ""}
                </span>
              ))}
            </div>
            {/* Right: priority badge */}
            {localCard.priority && PRIORITY_CONFIG[localCard.priority] && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[11px] font-semibold shrink-0 ${PRIORITY_CONFIG[localCard.priority].bg} ${PRIORITY_CONFIG[localCard.priority].text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_CONFIG[localCard.priority].dot}`} />
                {PRIORITY_CONFIG[localCard.priority].label}
              </span>
            )}
          </div>
        )}
        {/* Card content — de-emphasized when in a Done list */}
        <div style={isDone ? { opacity: 0.55 } : undefined}>
        <div className="flex items-start gap-1.5">
          {!readOnly && (
            <button
              onClick={toggleComplete}
              className="mt-0.5 shrink-0 transition-colors"
              title={localCard.completed ? "Mark incomplete" : "Mark complete"}
            >
              {localCard.completed ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#5AAC44]">
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : (
                <Circle className="h-4 w-4 text-gray-300 hover:text-[#5AAC44] transition-colors" />
              )}
            </button>
          )}
          <p className={`text-sm text-card-foreground leading-snug break-words overflow-hidden line-clamp-3 ${localCard.completed ? "line-through text-muted-foreground" : ""}`}>
            {localCard.title}
          </p>
        </div>
        {hasChecklists && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${checkedItems === totalItems ? "bg-green-500" : "bg-[#0079BF]"}`}
                style={{ width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {localCard.due_date && (() => {
              const isOverdue = !localCard.completed && moment(localCard.due_date).isBefore(moment(), "day");
              return (
                <span className={`inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-sm font-medium ${
                  localCard.completed
                    ? "bg-green-100 text-green-700"
                    : isOverdue
                    ? "bg-red-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                  {isOverdue
                    ? `Overdue · ${moment(localCard.due_date).format("MMM D")}`
                    : moment(localCard.due_date).format("MMM D")}
                </span>
              );
            })()}
            {hasDescription && <AlignLeft className="h-3.5 w-3.5 text-gray-400" />}
            {hasChecklists && (
              <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-sm ${checkedItems === totalItems ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {checkedItems}/{totalItems}
              </span>
            )}
            {attachments.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
                <Paperclip className="h-3 w-3" />{attachments.length}
              </span>
            )}
          </div>

          {/* Assignee avatar */}
          {localCard.assigned_to_name && (
            <div title={localCard.assigned_to_name} className="shrink-0">
              <InitialsAvatar name={localCard.assigned_to_name} size={20} />
            </div>
          )}

          {/* Quick timer button */}
          {enableTimeTracking && !readOnly && (
            <button
              onClick={activeEntry ? handleStopTimer : handleStartTimer}
              className={`p-1 rounded transition-colors ${activeEntry ? "text-red-500 hover:bg-red-50" : "text-gray-400 hover:bg-gray-100 hover:text-[#0079BF]"}`}
              title={activeEntry ? "Stop timer" : "Start timer"}
            >
              {activeEntry ? <Square className="h-3 w-3 fill-red-500" /> : <Play className="h-3 w-3" />}
            </button>
          )}

          {/* Quick priority button */}
          {!readOnly && (
            <div className="relative">
              <button
                ref={priorityBtnRef}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!showPriorityPicker) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPriorityPos({ top: rect.bottom + 4, left: rect.right - 140 });
                  }
                  setShowPriorityPicker(v => !v);
                }}
                className={`p-1 rounded transition-colors ${showPriorityPicker ? "bg-gray-100" : "hover:bg-gray-100"}`}
                title="Set priority"
              >
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </button>
              {showPriorityPicker && createPortal(
                <div
                  ref={priorityRef}
                  onClick={(e) => e.stopPropagation()}
                  style={{ position: "fixed", top: priorityPos.top, left: Math.max(8, priorityPos.left), zIndex: 9999 }}
                  className="bg-popover rounded-lg shadow-xl border border-border p-1 w-[140px]"
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 px-1">Priority</p>
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value ?? "none"}
                      onClick={(e) => handleSetPriority(e, p.value)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm ${p.value === localCard.priority ? "bg-muted font-semibold" : ""}`}
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${p.dot}`} />
                      <span className={p.text}>{p.label}</span>
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>
          )}

          {/* Quick agenda toggle */}
          {showAgendaToggle && !readOnly && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const updated = { ...localCard, team_meeting: !localCard.team_meeting };
                setLocalCard(updated);
                await base44.entities.Card.update(card.id, { team_meeting: updated.team_meeting });
                onCardUpdate?.(updated);
              }}
              className={`p-1 rounded transition-colors ${localCard.team_meeting ? "text-purple-600 bg-purple-100" : "text-gray-400 hover:bg-gray-100 hover:text-purple-500"}`}
              title={localCard.team_meeting ? "Remove from agenda" : "Add to agenda"}
            >
              <Users className="h-3 w-3" />
            </button>
          )}

          {/* Quick label button */}
          {!readOnly && labelDefinitions.length > 0 && (
            <div className="relative">
              <button
                ref={btnRef}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!showLabelPicker) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pickerHeight = 320;
                    const roomBelow = window.innerHeight - rect.bottom;
                    const top = roomBelow >= pickerHeight ? rect.bottom + 4 : rect.top - pickerHeight - 4;
                    setPickerPos({ top, left: Math.min(rect.right - 200, window.innerWidth - 208) });
                  }
                  setShowLabelPicker((v) => !v);
                }}
                className={`p-1 rounded transition-colors ${showLabelPicker ? "bg-gray-100" : "hover:bg-gray-100"}`}
                title="Add label"
              >
                <Tag className="h-3 w-3 text-gray-400" />
              </button>
              {showLabelPicker && createPortal(
                <div
                  ref={pickerRef}
                  onClick={(e) => e.stopPropagation()}
                  style={{ position: "fixed", top: pickerPos.top, left: Math.max(8, pickerPos.left), zIndex: 9999 }}
                  className="bg-popover rounded-lg shadow-xl border border-border p-2 w-[200px] max-h-[320px] overflow-y-auto"
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Labels</p>
                  <CardLabelPicker
                    card={card}
                    labelDefinitions={labelDefinitions}
                    onUpdate={() => { onRefresh?.(); }}
                  />
                </div>,
                document.body
              )}
            </div>
          )}
        </div>
        {/* Custom fields */}
        {customFieldDefinitions.length > 0 && localCard.custom_fields && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            {customFieldDefinitions.map(field => {
              const val = localCard.custom_fields?.[field.key];
              if (!val) return null;
              return (
                <span key={field.key} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  {field.type === "number" && <Hash className="h-3 w-3" />}
                  {field.type === "date" && <Calendar className="h-3 w-3" />}
                  {field.type === "user" && <User className="h-3 w-3" />}
                  {field.type === "text" && <AlignLeft className="h-3 w-3" />}
                  <span className="font-medium">{field.label}:</span> {val}
                </span>
              );
            })}
          </div>
        )}
        </div>{/* end isDone opacity wrapper */}
      </div>
    </div>
  );
}