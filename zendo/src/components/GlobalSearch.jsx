import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Search, X, CreditCard, Layout, Plus, Calendar, Clock, Settings, ChevronRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

const STATIC_ACTIONS = [
  {
    id: "action-new-board",
    label: "Create new board",
    subtitle: "Start a new project board",
    icon: <Plus className="h-4 w-4" />,
    section: "Actions",
    navigate: () => createPageUrl("Boards"),
  },
  {
    id: "action-new-card",
    label: "Create new card",
    subtitle: "Add a task to a board",
    icon: <Plus className="h-4 w-4" />,
    section: "Actions",
    navigate: () => createPageUrl("Boards"),
  },
  {
    id: "action-daily-planner",
    label: "Go to Daily Planner",
    subtitle: "Focus on today's tasks",
    icon: <Calendar className="h-4 w-4" />,
    section: "Actions",
    navigate: () => createPageUrl("Boards"),
  },
  {
    id: "action-time-reports",
    label: "Go to Time Reports",
    subtitle: "View time tracking data",
    icon: <Clock className="h-4 w-4" />,
    section: "Actions",
    navigate: () => createPageUrl("TimeReports"),
  },
  {
    id: "action-settings",
    label: "Open Settings",
    subtitle: "App preferences and configuration",
    icon: <Settings className="h-4 w-4" />,
    section: "Actions",
    navigate: () => createPageUrl("AppSettings"),
  },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [boards, setBoards] = useState([]);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Load boards and lists once
  useEffect(() => {
    base44.entities.Board.list().then(setBoards);
    base44.entities.TaskList.list().then(setLists);
  }, []);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => {
          if (!prev) setTimeout(() => inputRef.current?.focus(), 30);
          return !prev;
        });
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Debounced card search
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) { setCards([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const all = await base44.entities.Card.list();
      const lower = query.toLowerCase();
      const matched = all.filter(c => !c.is_archived && c.title?.toLowerCase().includes(lower));
      setCards(matched.slice(0, 8));
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  // Reset index when results change
  useEffect(() => { setActiveIndex(0); }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCards([]);
  }, []);

  // Build flat list of all items for keyboard nav
  const getItems = useCallback(() => {
    if (!query.trim()) return STATIC_ACTIONS;

    const lower = query.toLowerCase();

    const boardItems = boards
      .filter(b => !b.is_archived && b.title?.toLowerCase().includes(lower))
      .slice(0, 5)
      .map(b => ({
        id: `board-${b.id}`,
        label: b.title,
        subtitle: "Board",
        icon: <Layout className="h-4 w-4" />,
        section: "Boards",
        color: b.background_color,
        navigate: () => createPageUrl("BoardView") + `?id=${b.id}`,
      }));

    const cardItems = cards.map(c => {
      const board = boards.find(b => b.id === c.board_id);
      const list = lists.find(l => l.id === c.list_id);
      return {
        id: `card-${c.id}`,
        label: c.title,
        subtitle: [list?.title, board?.title].filter(Boolean).join(" · "),
        icon: <CreditCard className="h-4 w-4" />,
        section: "Cards",
        color: board?.background_color,
        navigate: () => board ? createPageUrl("BoardView") + `?id=${board.id}&card=${c.id}` : null,
      };
    });

    const actionItems = STATIC_ACTIONS.filter(
      a => a.label.toLowerCase().includes(lower) || a.subtitle.toLowerCase().includes(lower)
    );

    return [...boardItems, ...cardItems, ...actionItems];
  }, [query, boards, cards, lists]);

  const items = getItems();

  // Group by section
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  // Flat index list for keyboard nav
  const flatItems = Object.values(grouped).flat();

  const handleSelect = useCallback((item) => {
    const url = typeof item.navigate === "function" ? item.navigate() : item.navigate;
    if (url) navigate(url);
    close();
  }, [navigate, close]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = flatItems[activeIndex];
      if (selected) handleSelect(selected);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const sectionOrder = query.trim()
    ? ["Boards", "Cards", "Actions"]
    : ["Actions"];

  let globalIdx = 0;

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 30); }}
        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 rounded-lg px-3 py-1.5 text-sm transition-colors"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline text-gray-400">Search or jump to...</span>
        <kbd className="hidden sm:inline text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div
            className="w-full max-w-[580px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
            style={{ maxHeight: "65vh" }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
              <Search className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search boards, cards, or run a command..."
                className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400 bg-transparent"
                autoComplete="off"
              />
              {query ? (
                <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
              )}
            </div>

            {/* Results */}
            <div ref={listRef} className="overflow-y-auto flex-1 py-1">
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}

              {!loading && flatItems.length === 0 && query.trim() && (
                <div className="py-10 text-center text-sm text-gray-400">
                  No results for <span className="font-medium text-gray-600">"{query}"</span>
                </div>
              )}

              {!loading && sectionOrder.map((section) => {
                const sectionItems = grouped[section];
                if (!sectionItems?.length) return null;

                return (
                  <div key={section} className="mb-1">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1.5">
                      {section}
                    </p>
                    {sectionItems.map((item) => {
                      const idx = globalIdx++;
                      const isActive = idx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          data-idx={idx}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => handleSelect(item)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isActive ? "bg-primary/10" : "hover:bg-gray-50"
                          }`}
                        >
                          {/* Icon or color dot */}
                          <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                            item.color ? "" : "bg-gray-100 text-gray-500"
                          }`}
                          style={item.color ? { backgroundColor: item.color + "22", color: item.color } : {}}
                          >
                            {item.icon}
                          </div>

                          {/* Labels */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.label}</p>
                            {item.subtitle && (
                              <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                            )}
                          </div>

                          {/* Arrow hint when active */}
                          {isActive && <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-[11px] text-gray-400">
              <span><kbd className="font-mono bg-gray-100 px-1 rounded">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono bg-gray-100 px-1 rounded">↵</kbd> select</span>
              <span><kbd className="font-mono bg-gray-100 px-1 rounded">Esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}