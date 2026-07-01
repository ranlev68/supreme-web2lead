import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Star, Layers, MessageSquare, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const GRADIENTS = [
  "from-pink-500 to-rose-400",
  "from-violet-500 to-purple-400",
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-blue-400",
];

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (new Date() - new Date(dateStr)) / 60000;
  if (diff < 60) return `${Math.floor(diff)}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function DashboardRecentBoards({ boards, loading }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-800">Continue where you left off</h2>
        <Link to={createPageUrl("Boards")} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
          View all boards <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-36 w-48 rounded-2xl shrink-0" />)}
        </div>
      ) : boards.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
          <p className="text-sm text-slate-400">No boards yet. <Link to={createPageUrl("Boards")} className="text-blue-600">Create your first board →</Link></p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {boards.map((board, i) => (
            <Link
              key={board.id}
              to={`/BoardView?id=${board.id}`}
              className="shrink-0 w-48 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
            >
              {/* Board color header */}
              <div
                className="h-24 flex items-end p-3 relative overflow-hidden"
                style={{ backgroundColor: board.background_color || "#0079BF" }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
                {board.is_starred && (
                  <Star className="absolute top-2 right-2 h-3.5 w-3.5 text-yellow-300" fill="currentColor" />
                )}
                <span className="relative text-sm font-bold text-white leading-tight line-clamp-2">{board.title}</span>
              </div>

              {/* Footer */}
              <div className="bg-white px-3 py-2 flex items-center justify-between border border-t-0 border-slate-100 rounded-b-2xl">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {board.card_count > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Layers className="h-3 w-3" /> {board.card_count}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">{timeAgo(board.updated_date)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}