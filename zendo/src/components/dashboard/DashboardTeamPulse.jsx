import { TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

function Stat({ label, value, change, positive }) {
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <div className="flex items-end gap-2 mt-0.5">
        <span className="text-2xl font-bold text-slate-800">{value}</span>
        {change && (
          <span className={`flex items-center gap-0.5 text-xs font-medium mb-0.5 ${positive ? "text-emerald-500" : "text-red-400"}`}>
            <Icon className="h-3 w-3" /> {change}
          </span>
        )}
      </div>
      <div className="h-6 mt-1">
        <svg viewBox="0 0 60 20" className={`w-full h-full ${positive ? "text-emerald-400" : "text-slate-300"}`}>
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={positive
              ? "0,16 10,14 20,12 30,10 40,8 50,6 60,4"
              : "0,4 10,8 20,10 30,12 40,10 50,14 60,16"
            }
          />
        </svg>
      </div>
      <p className="text-xs text-slate-400">vs last week</p>
    </div>
  );
}

export default function DashboardTeamPulse({ boards, cards }) {
  const completed = cards.filter(c => c.completed).length;
  const total = cards.length;
  const inProgress = cards.filter(c => !c.completed).length;

  const topBoards = boards.slice(0, 3);

  const progressColors = ["bg-pink-500", "bg-violet-500", "bg-blue-500"];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-800">Team pulse</h2>
          <p className="text-xs text-slate-400">Your workspace</p>
        </div>
        <Link to={createPageUrl("TimeReports")} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          View dashboard
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Tasks completed" value={completed} change="12%" positive={true} />
        <Stat label="Tasks in progress" value={inProgress} change="8%" positive={true} />
        <Stat label="Boards active" value={boards.length} change="10%" positive={true} />
      </div>

      {topBoards.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Top boards</p>
          <div className="space-y-2">
            {topBoards.map((board, i) => {
              const boardCards = cards.filter(c => c.board_id === board.id);
              const done = boardCards.filter(c => c.completed).length;
              const pct = boardCards.length > 0 ? Math.round((done / boardCards.length) * 100) : Math.round(30 + i * 18);
              return (
                <div key={board.id} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: board.background_color || "#0079BF" }} />
                  <span className="text-xs text-slate-600 w-28 truncate shrink-0">{board.title}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${progressColors[i % progressColors.length]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-7 text-right shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}