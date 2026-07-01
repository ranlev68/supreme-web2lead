import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { LayoutList, CheckCircle2, AlertCircle, Activity } from "lucide-react";
import moment from "moment";

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [boardStats, setBoardStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const [cards, boards, activities] = await Promise.all([
      base44.entities.Card.list(),
      base44.entities.Board.list(),
      base44.entities.Activity.list("-created_date", 20),
    ]);

    const total = cards.length;
    const completed = cards.filter((c) => c.completed).length;
    const overdue = cards.filter((c) => c.due_date && c.due_date < today && !c.completed).length;

    // Per-board breakdown
    const perBoard = boards.map((b) => {
      const bCards = cards.filter((c) => c.board_id === b.id);
      return {
        ...b,
        total: bCards.length,
        completed: bCards.filter((c) => c.completed).length,
        overdue: bCards.filter((c) => c.due_date && c.due_date < today && !c.completed).length,
      };
    }).filter((b) => b.total > 0).sort((a, b) => b.total - a.total);

    setStats({ total, completed, overdue, boardCount: boards.length });
    setBoardStats(perBoard);
    setRecentActivity(activities);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin h-6 w-6 border-4 border-[#0079BF] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Boards", value: stats.boardCount, icon: LayoutList, color: "text-[#0079BF]", bg: "bg-blue-50" },
          { label: "Total Cards", value: stats.total, icon: LayoutList, color: "text-[#5B4FCF]", bg: "bg-purple-50" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Overdue", value: stats.overdue, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className={`h-8 w-8 rounded-md ${s.bg} flex items-center justify-center mb-2`}>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Per-board breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Cards per Board</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {boardStats.map((b) => (
            <div key={b.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: b.background_color || "#0079BF" }} />
                <p className="text-sm text-gray-800 truncate font-medium">{b.title}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                <span>{b.total} total</span>
                <span className="text-green-600">{b.completed} done</span>
                {b.overdue > 0 && <span className="text-red-500">{b.overdue} overdue</span>}
                {/* Progress bar */}
                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${b.total > 0 ? (b.completed / b.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {boardStats.length === 0 && (
            <p className="text-sm text-gray-400 px-4 py-4">No cards found.</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentActivity.map((a) => (
            <div key={a.id} className="flex items-start gap-3 px-4 py-3">
              <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                {(a.author_name || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {a.type === "comment" ? (
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">{a.author_name}</span> commented: <span className="text-gray-500 italic">"{a.text}"</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">{a.author_name}</span> changed <span className="font-medium">{a.field_changed}</span>
                    {a.new_value ? <> → <span className="text-green-700">{a.new_value}</span></> : null}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 mt-0.5">{moment(a.created_date).fromNow()}</p>
              </div>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <p className="text-sm text-gray-400 px-4 py-4">No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}