import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, BarChart2, Users, Filter, Printer, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/components/WorkspaceContext";
import { subDays, subMonths, startOfWeek, startOfMonth, startOfYear, isAfter, parseISO } from "date-fns";

function formatDuration(minutes) {
  if (!minutes || minutes < 1) return "0m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function TimeReports() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [boards, setBoards] = useState([]);
  const [cards, setCards] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [loading, setLoading] = useState(true);

  const TIME_RANGES = [
    { value: "all", label: "All time" },
    { value: "today", label: "Today" },
    { value: "week", label: "This week" },
    { value: "month", label: "This month" },
    { value: "last30", label: "Last 30 days" },
    { value: "last90", label: "Last 90 days" },
    { value: "year", label: "This year" },
  ];

  const workspaceId = currentWorkspace && typeof currentWorkspace === "object" ? currentWorkspace.id : null;

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me().catch(() => null);
      const [boardsData, cardsData, entriesData] = await Promise.all([
        user && workspaceId ? base44.entities.Board.filter({ workspace_id: workspaceId }, "-created_date") : (user ? base44.entities.Board.filter({ created_by: user.email }, "-created_date", 500) : Promise.resolve([])),
        base44.entities.Card.list("-created_date", 500),
        user
          ? base44.entities.CardTimeEntry.filter({ user_email: user.email }, "-created_date", 500)
          : Promise.resolve([]),
      ]);
      setBoards(boardsData);
      setCards(cardsData);
      setEntries(entriesData.filter((e) => e.duration_minutes));
      setLoading(false);
    };
    load();
  }, [workspaceId]);

  const timeRangeStart = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case "today": return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case "week": return startOfWeek(now, { weekStartsOn: 1 });
      case "month": return startOfMonth(now);
      case "last30": return subDays(now, 30);
      case "last90": return subDays(now, 90);
      case "year": return startOfYear(now);
      default: return null;
    }
  }, [timeRange]);

  const filteredEntries = entries.filter((e) => {
    if (selectedBoard !== "all" && e.board_id !== selectedBoard) return false;
    if (timeRangeStart && e.start_time) {
      const entryDate = parseISO(e.start_time);
      if (!isAfter(entryDate, timeRangeStart)) return false;
    }
    return true;
  });

  // Group by card
  const byCard = filteredEntries.reduce((acc, e) => {
    if (!acc[e.card_id]) acc[e.card_id] = { entries: [], total: 0 };
    acc[e.card_id].entries.push(e);
    acc[e.card_id].total += e.duration_minutes || 0;
    return acc;
  }, {});

  // Group by user
  const byUser = filteredEntries.reduce((acc, e) => {
    const key = e.user_email;
    if (!acc[key]) acc[key] = { name: e.user_name || e.user_email, total: 0 };
    acc[key].total += e.duration_minutes || 0;
    return acc;
  }, {});

  // Group by label
  const byLabel = filteredEntries.reduce((acc, e) => {
    const card = cards.find((c) => c.id === e.card_id);
    const labels = card?.labels?.length ? card.labels : [{ name: "No Label", color: "#b3b3b3" }];
    labels.forEach((label) => {
      const key = label.name || "No Label";
      if (!acc[key]) acc[key] = { color: label.color || "#b3b3b3", total: 0 };
      acc[key].total += e.duration_minutes || 0;
    });
    return acc;
  }, {});

  const topLabels = Object.entries(byLabel).sort((a, b) => b[1].total - a[1].total);

  const totalMinutes = filteredEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

  const topCards = Object.entries(byCard)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  const topUsers = Object.entries(byUser)
    .sort((a, b) => b[1].total - a[1].total);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#0079BF] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      {/* Header row 1: title + Print/Close */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-[#0079BF]" />
          <h1 className="text-2xl font-bold text-gray-800">Time Reports</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={() => navigate(createPageUrl("Boards"))}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </div>
      {/* Header row 2: filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedBoard} onValueChange={setSelectedBoard}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Filter by board" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All boards</SelectItem>
            {boards.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-[#0079BF]" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Time</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatDuration(totalMinutes)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="h-4 w-4 text-[#519839]" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Cards Tracked</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{Object.keys(byCard).length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-[#89609E]" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Contributors</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{Object.keys(byUser).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Time by card */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart2 className="h-4 w-4" /> Time by Card
          </h2>
          {topCards.length === 0 ? (
            <p className="text-sm text-gray-400">No time logged yet.</p>
          ) : (
            <div className="space-y-3">
              {topCards.map(([cardId, data]) => {
                const cardData = cards.find((c) => c.id === cardId);
                const pct = totalMinutes > 0 ? (data.total / totalMinutes) * 100 : 0;
                return (
                  <div key={cardId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700 font-medium truncate max-w-[200px]">
                        {cardData?.title || "Deleted card"}
                      </span>
                      <span className="text-xs font-semibold text-gray-600 shrink-0 ml-2">
                        {formatDuration(data.total)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-full bg-[#0079BF] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Time by user */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" /> Time by User
          </h2>
          {topUsers.length === 0 ? (
            <p className="text-sm text-gray-400">No time logged yet.</p>
          ) : (
            <div className="space-y-3">
              {topUsers.map(([email, data]) => {
                const pct = totalMinutes > 0 ? (data.total / totalMinutes) * 100 : 0;
                return (
                  <div key={email}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-[#0079BF] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {(data.name || "?")[0].toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-700 font-medium truncate max-w-[160px]">
                          {data.name}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-gray-600 shrink-0 ml-2">
                        {formatDuration(data.total)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-full bg-[#89609E] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Time by label */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 col-span-1 md:col-span-2 mt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <BarChart2 className="h-4 w-4" /> Time by Label
        </h2>
        {topLabels.length === 0 ? (
          <p className="text-sm text-gray-400">No time logged yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topLabels.map(([labelName, data]) => {
              const pct = totalMinutes > 0 ? (data.total / totalMinutes) * 100 : 0;
              return (
                <div key={labelName}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
                      <span className="text-xs text-gray-700 font-medium truncate max-w-[200px]">{labelName}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-600 shrink-0 ml-2">{formatDuration(data.total)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: data.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent entries */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Recent Time Entries
        </h2>
        {filteredEntries.length === 0 ? (
          <p className="text-sm text-gray-400">No time entries yet.</p>
        ) : (
          <div className="space-y-2">
            {filteredEntries.slice(0, 20).map((e) => {
              const cardData = cards.find((c) => c.id === e.card_id);
              const boardData = boards.find((b) => b.id === e.board_id);
              return (
                <div key={e.id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-medium text-gray-800 truncate">{cardData?.title || "Deleted card"}</span>
                    <span className="text-[11px] text-gray-400 truncate">{boardData?.title || "—"} · {e.user_name || e.user_email}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-700 shrink-0">{formatDuration(e.duration_minutes)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}