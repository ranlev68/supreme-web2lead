import { useState } from "react";
import { X, Sun, CheckCircle2, Circle, Zap, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { base44 } from "@/api/base44Client";

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  high:   { label: "High",   bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  medium: { label: "Medium", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-400" },
  low:    { label: "Low",    bg: "bg-blue-100", text: "text-blue-600", dot: "bg-blue-400" },
};

const MAX_FOCUS = 3;
const STORAGE_KEY = (boardId) => `daily_focus_${boardId}_${new Date().toDateString()}`;

export default function DailyPlanner({ cards, lists, boardId, onCardClick, onCardUpdate, onClose }) {
  const savedIds = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY(boardId))) || []; } catch { return []; } })();

  const activeCards = cards.filter(c => !c.is_archived && !c.completed);
  const [focusIds, setFocusIds] = useState(savedIds);
  const [phase, setPhase] = useState(savedIds.length > 0 ? "focus" : "pick"); // pick | focus

  const focusCards = focusIds.map(id => cards.find(c => c.id === id)).filter(Boolean);
  const completedCount = focusCards.filter(c => c.completed).length;
  const allDone = focusCards.length > 0 && completedCount === focusCards.length;

  const togglePick = (id) => {
    setFocusIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : prev.length < MAX_FOCUS ? [...prev, id] : prev;
      return next;
    });
  };

  const startFocus = () => {
    localStorage.setItem(STORAGE_KEY(boardId), JSON.stringify(focusIds));
    setPhase("focus");
  };

  const resetDay = () => {
    localStorage.removeItem(STORAGE_KEY(boardId));
    setFocusIds([]);
    setPhase("pick");
  };

  const toggleComplete = async (card) => {
    const completing = !card.completed;
    const updated = { ...card, completed: completing };
    onCardUpdate?.(updated);
    if (completing) {
      confetti({ particleCount: 100, spread: 70, origin: { x: 0.5, y: 0.5 }, colors: ["#5AAC44", "#0079BF", "#F5A623", "#EB5A46", "#C377E0"] });
      // Check if all done after this
      const newCompletedCount = focusCards.filter(c => c.id === card.id ? true : c.completed).length;
      if (newCompletedCount === focusCards.length) {
        setTimeout(() => confetti({ particleCount: 200, spread: 100, origin: { x: 0.5, y: 0.4 }, colors: ["#5AAC44", "#0079BF", "#F5A623", "#EB5A46", "#C377E0"] }), 600);
      }
    }
    await base44.entities.Card.update(card.id, { completed: completing });
  };

  const listTitle = (card) => lists.find(l => l.id === card.list_id)?.title || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-yellow-500" />
            <h2 className="font-bold text-lg text-foreground">Daily Focus</h2>
            {phase === "focus" && (
              <span className="text-sm text-muted-foreground">{completedCount}/{focusCards.length} done</span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* All done celebration */}
        {phase === "focus" && allDone && (
          <div className="mx-5 mt-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Trophy className="h-6 w-6 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">You crushed it today! 🎉</p>
              <p className="text-sm text-green-600">All your focus tasks are done.</p>
            </div>
          </div>
        )}

        {/* Pick phase */}
        {phase === "pick" && (
          <>
            <div className="px-5 py-3 bg-muted/40 border-b border-border">
              <p className="text-sm text-muted-foreground">
                Pick up to <strong>{MAX_FOCUS} tasks</strong> to focus on today. Keep it realistic!
              </p>
              <div className="flex gap-1.5 mt-2">
                {[1,2,3].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${focusIds.length >= i ? "bg-primary" : "bg-border"}`} />
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
              {activeCards.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No active cards on this board.</p>
              )}
              {activeCards.map(card => {
                const selected = focusIds.includes(card.id);
                const disabled = !selected && focusIds.length >= MAX_FOCUS;
                return (
                  <button
                    key={card.id}
                    onClick={() => !disabled && togglePick(card.id)}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${
                      selected
                        ? "border-primary bg-primary/5"
                        : disabled
                        ? "border-border bg-muted/30 opacity-40 cursor-not-allowed"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${selected ? "border-primary bg-primary" : "border-gray-300"}`}>
                      {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-snug">{card.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{listTitle(card)}</p>
                      {card.priority && PRIORITY_CONFIG[card.priority] && (
                        <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${PRIORITY_CONFIG[card.priority].bg} ${PRIORITY_CONFIG[card.priority].text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_CONFIG[card.priority].dot}`} />
                          {PRIORITY_CONFIG[card.priority].label}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-4 border-t border-border">
              <button
                onClick={startFocus}
                disabled={focusIds.length === 0}
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Start Focus Session ({focusIds.length} task{focusIds.length !== 1 ? "s" : ""})
              </button>
            </div>
          </>
        )}

        {/* Focus phase */}
        {phase === "focus" && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {focusCards.map(card => (
                <div
                  key={card.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                    card.completed ? "border-green-200 bg-green-50/60 opacity-70" : "border-border bg-card shadow-sm"
                  }`}
                >
                  <button
                    onClick={() => toggleComplete(card)}
                    className="mt-0.5 shrink-0"
                  >
                    {card.completed
                      ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                      : <Circle className="h-5 w-5 text-gray-300 hover:text-green-400 transition-colors" />
                    }
                  </button>
                  <div className="flex-1 min-w-0" onClick={() => onCardClick?.(card)}>
                    <p className={`font-medium text-sm leading-snug cursor-pointer hover:underline ${card.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {card.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{listTitle(card)}</p>
                    {card.priority && PRIORITY_CONFIG[card.priority] && (
                      <span className={`inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${PRIORITY_CONFIG[card.priority].bg} ${PRIORITY_CONFIG[card.priority].text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_CONFIG[card.priority].dot}`} />
                        {PRIORITY_CONFIG[card.priority].label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-border">
              <button onClick={resetDay} className="w-full text-sm text-muted-foreground hover:text-foreground py-2 rounded-lg hover:bg-muted transition-colors">
                ↺ Pick different tasks
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}