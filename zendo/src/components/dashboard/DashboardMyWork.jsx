import { useState } from "react";
import { Link } from "react-router-dom";
import { SlidersHorizontal, ChevronRight, Circle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { base44 } from "@/api/base44Client";

function getDueDays(d) {
  if (!d) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.floor((new Date(d + "T00:00:00") - today) / 86400000);
}

function DueLabel({ dateStr }) {
  const days = getDueDays(dateStr);
  if (days === null) return <span className="text-slate-400 text-xs">—</span>;
  if (days < 0) return <span className="text-red-500 text-xs font-medium">Overdue</span>;
  if (days === 0) return <span className="text-orange-500 text-xs font-semibold bg-orange-50 px-1.5 py-0.5 rounded-md">Today</span>;
  if (days === 1) return <span className="text-yellow-600 text-xs">Tomorrow</span>;
  return <span className="text-slate-500 text-xs">{new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>;
}

const STATUS_STYLES = {
  "In progress": "bg-blue-50 text-blue-600",
  "To do": "bg-slate-100 text-slate-500",
  "Done": "bg-green-50 text-green-600",
  "Waiting": "bg-yellow-50 text-yellow-600",
};

const PRIORITY_STYLES = {
  urgent: "bg-red-50 text-red-600",
  high: "bg-orange-50 text-orange-600",
  medium: "bg-yellow-50 text-yellow-600",
  low: "bg-green-50 text-green-600",
};

function getCardStatus(card, listTitle) {
  if (card.completed) return "Done";
  const t = (listTitle || "").toLowerCase();
  if (t.includes("progress") || t.includes("doing")) return "In progress";
  if (t.includes("wait") || t.includes("review") || t.includes("hold")) return "Waiting";
  return "To do";
}

export default function DashboardMyWork({ cards, boardMap, listMap, onCardClick, loading }) {
  const [toggling, setToggling] = useState({});
  const displayCards = cards.filter(c => !c.is_archived).slice(0, 8);

  const handleToggle = async (e, card) => {
    e.stopPropagation();
    setToggling(prev => ({ ...prev, [card.id]: true }));
    try {
      await base44.entities.Card.update(card.id, { completed: !card.completed });
    } catch (err) {
      console.error(err);
      alert("Couldn't update card: " + err.message);
    } finally {
      setToggling(prev => ({ ...prev, [card.id]: false }));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="font-semibold text-slate-800">My work</h2>
          <p className="text-xs text-slate-400 mt-0.5">All your tasks across boards, in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filter
          </button>
          <Link to="/my-work" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      ) : displayCards.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-400">No tasks assigned to you yet.</p>
          <Link to={`/Boards`} className="text-xs text-blue-600 mt-1 inline-block">Go to Boards →</Link>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_100px_90px_80px] gap-2 px-5 py-2 text-xs font-medium text-slate-400 border-b border-slate-50">
            <span>Task</span>
            <span>Board</span>
            <span>Status</span>
            <span>Due</span>
            <span>Priority</span>
          </div>
          <div className="divide-y divide-slate-50">
            {displayCards.map(card => {
              const board = boardMap[card.board_id];
              const list = listMap[card.list_id];
              const status = getCardStatus(card, list?.title);
              return (
                <div
                  key={card.id}
                  onClick={() => onCardClick(card)}
                  className="grid grid-cols-[1fr_140px_100px_90px_80px] gap-2 px-5 py-3 hover:bg-slate-50 cursor-pointer items-center transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={e => handleToggle(e, card)}
                      className="shrink-0 text-slate-300 hover:text-blue-500 transition-colors"
                    >
                      {toggling[card.id]
                        ? <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                        : card.completed
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                        : <Circle className="h-4 w-4" />
                      }
                    </button>
                    <span className={`text-sm truncate ${card.completed ? "line-through text-slate-400" : "text-slate-700"}`}>
                      {card.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {board && (
                      <>
                        <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: board.background_color || "#0079BF" }} />
                        <span className="text-xs text-slate-600 truncate">{board.title}</span>
                      </>
                    )}
                  </div>
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status] || "bg-slate-100 text-slate-500"}`}>
                      {status}
                    </span>
                  </div>
                  <DueLabel dateStr={card.due_date} />
                  <div>
                    {card.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_STYLES[card.priority] || ""}`}>
                        {card.priority}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {cards.length > 8 && (
            <div className="px-5 py-3 border-t border-slate-50">
              <Link to="/my-work" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                + {cards.length - 8} more cards
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}