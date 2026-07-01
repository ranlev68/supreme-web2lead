import { CheckSquare, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PRIORITY_STYLES = {
  urgent: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", label: "Urgent" },
  high:   { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400", label: "High" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-400", label: "Medium" },
  low:    { bg: "bg-blue-100", text: "text-blue-600", dot: "bg-blue-400", label: "Low" },
};

function getDueDateStyle(dueDateStr) {
  if (!dueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  const diffDays = Math.floor((due - today) / 86400000);
  if (diffDays < 0) return { className: "text-red-600 font-semibold", label: `Overdue · ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}` };
  if (diffDays === 0) return { className: "text-amber-600 font-semibold", label: "Due today" };
  return { className: "text-muted-foreground", label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }) };
}

function getChecklistProgress(card) {
  const cl = card.checklists?.[0];
  if (!cl?.items?.length) return null;
  const total = cl.items.length;
  const done = cl.items.filter(i => i.checked).length;
  return { done, total };
}

export default function MyWorkCardRow({ card, board, list, onClick }) {
  const priority = PRIORITY_STYLES[card.priority];
  const dueDateStyle = getDueDateStyle(card.due_date);
  const checklist = getChecklistProgress(card);

  return (
    <button
      onClick={() => onClick(card)}
      className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/50 border-b border-border last:border-b-0 text-left transition-colors group"
    >
      {/* Color accent */}
      {board && (
        <div
          className="w-1 self-stretch rounded-full shrink-0"
          style={{ backgroundColor: board.background_color || "#0079BF" }}
        />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium text-foreground truncate ${card.completed ? "line-through text-muted-foreground" : ""}`}>
            {card.title}
          </span>
          {priority && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${priority.bg} ${priority.text} shrink-0`}>
              <span className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} />
              {priority.label}
            </span>
          )}
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {board && <span className="truncate max-w-[120px]">{board.title}</span>}
          {board && list && <ChevronRight className="h-3 w-3 shrink-0" />}
          {list && <span className="truncate max-w-[120px]">{list.title}</span>}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0 ml-2 flex-wrap justify-end">
        {/* Labels */}
        {(card.labels?.length > 0) && (
          <span className="hidden sm:flex items-center gap-1">
            {card.labels.slice(0, 2).map((l, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white leading-tight" style={{ backgroundColor: l.color }}>
                {l.name || ""}
              </span>
            ))}
            {card.labels.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{card.labels.length - 2}</span>
            )}
          </span>
        )}
        {checklist && (
          <span className={`hidden sm:flex items-center gap-1 text-xs ${checklist.done === checklist.total ? "text-green-600" : "text-muted-foreground"}`}>
            <CheckSquare className="h-3.5 w-3.5" />
            {checklist.done}/{checklist.total}
          </span>
        )}
        {dueDateStyle && (
          <span className={`hidden sm:flex items-center gap-1 text-xs ${dueDateStyle.className}`}>
            <Calendar className="h-3.5 w-3.5" />
            {dueDateStyle.label}
          </span>
        )}
      </div>
    </button>
  );
}