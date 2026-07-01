import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Layers, Clock, Plus, ChevronRight } from "lucide-react";
import { useState } from "react";

const WORKSPACE_COLORS = ["#E53E3E", "#805AD5", "#3182CE", "#38A169", "#DD6B20", "#D53F8C"];

export default function DashboardSidebar({ boards, user }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);

  // Group boards by workspace (simplified: just show recent boards)
  const recentBoards = (boards || []).filter(b => !b.is_archived && !b.is_deleted && b.title).slice(0, 8);

  const navItems = [
    { label: "Home", icon: Home, href: "/Dashboard" },
    { label: "My Work", icon: Layers, href: "/my-work" },
    { label: "Time Reports", icon: Clock, href: createPageUrl("TimeReports") },
  ];

  return (
    <div className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full overflow-y-auto">
      {/* Nav */}
      <nav className="px-3 pt-4 space-y-0.5">
        {navItems.map(item => {
          const active = location.pathname === item.href || (item.href === "/Dashboard" && location.pathname === "/Dashboard");
          return (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 my-3 border-t border-slate-100" />

      {/* Recent Boards */}
      <div className="px-3 flex-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700 mb-1"
        >
          <span>Boards</span>
          <div className="flex items-center gap-1">
            <Link
              to={createPageUrl("Boards")}
              onClick={e => e.stopPropagation()}
              className="hover:text-slate-700 p-0.5 rounded hover:bg-slate-100"
            >
              <Plus className="h-3.5 w-3.5" />
            </Link>
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </div>
        </button>
        {expanded && (
          <div className="space-y-0.5">
            {recentBoards.map((board, i) => (
              <Link
                key={board.id}
                to={`/BoardView?id=${board.id}`}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <div
                  className="h-5 w-5 rounded shrink-0"
                  style={{ backgroundColor: board.background_color || WORKSPACE_COLORS[i % WORKSPACE_COLORS.length] }}
                />
                <span className="truncate">{board.title}</span>
              </Link>
            ))}
            {recentBoards.length === 0 && (
              <p className="text-xs text-slate-400 px-2 py-1">No boards yet</p>
            )}
            <Link
              to={createPageUrl("Boards")}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              View all boards →
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100">
        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
      </div>
    </div>
  );
}