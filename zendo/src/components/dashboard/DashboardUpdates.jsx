import { MessageSquare, ArrowRight, User, Move, CheckCircle2, AtSign } from "lucide-react";
import { Link } from "react-router-dom";

const SAMPLE_UPDATES = [
  { id: 1, type: "move", user: "Dana", action: "moved", subject: "Homepage wireframe to Review", board: "Website Redesign", time: "2h ago", avatar: "D", color: "bg-pink-400" },
  { id: 2, type: "comment", user: "3 new comments", action: "on", subject: "Pricing page", board: "Marketing Campaign", time: "3h ago", avatar: null, icon: MessageSquare, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { id: 3, type: "complete", user: "Alex", action: "completed", subject: "QA checklist", board: "Product Launch", time: "5h ago", avatar: "A", color: "bg-blue-400" },
  { id: 4, type: "mention", user: "You were mentioned", action: "in", subject: "Launch blockers", board: "Product Launch", time: "6h ago", avatar: null, icon: AtSign, iconBg: "bg-orange-100", iconColor: "text-orange-600" },
];

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (new Date() - new Date(dateStr)) / 60000;
  if (diff < 60) return `${Math.floor(diff)}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function DashboardUpdates({ activities, boardMap }) {
  // Use real activities if available, otherwise sample
  const items = activities.length > 0
    ? activities.slice(0, 4).map(a => ({
        id: a.id,
        type: a.type,
        user: a.author_name || "Someone",
        action: a.type === "comment" ? "commented on" : "updated",
        subject: a.text?.slice(0, 40) || "a card",
        board: boardMap[a.board_id]?.title || "a board",
        time: timeAgo(a.created_date),
        avatar: (a.author_name || "?")[0].toUpperCase(),
        color: "bg-violet-400",
      }))
    : SAMPLE_UPDATES;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800">Updates since your last visit</h2>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {item.avatar ? (
                <div className={`h-7 w-7 rounded-full ${item.color} flex items-center justify-center text-white text-xs font-bold`}>
                  {item.avatar}
                </div>
              ) : (
                <div className={`h-7 w-7 rounded-full ${item.iconBg} flex items-center justify-center`}>
                  <item.icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 leading-snug">
                <span className="font-medium">{item.user}</span>{" "}
                <span className="text-slate-500">{item.action}</span>{" "}
                <span className="font-medium">{item.subject}</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{item.board} · {item.time}</p>
            </div>
          </div>
        ))}
      </div>
      <Link to="/my-work" className="mt-4 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
        View all activity <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}