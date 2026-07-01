import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import moment from "moment";
import {
  ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal,
  Filter, X, Check, ExternalLink, Archive, Flag, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

// ─── Column definitions ───────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: "title",        label: "Title",        sortable: true, alwaysVisible: true, defaultWidth: 300 },
  { key: "list",         label: "List",         sortable: true,                      defaultWidth: 130 },
  { key: "labels",       label: "Labels",       sortable: false,                     defaultWidth: 150 },
  { key: "status",       label: "Status",       sortable: true,                      defaultWidth: 110 },
  { key: "assignee",     label: "Assignee",     sortable: true,                      defaultWidth: 140 },
  { key: "team_meeting", label: "Team Meeting", sortable: true,                      defaultWidth: 120 },
  { key: "start_date",   label: "Start Date",   sortable: true,                      defaultWidth: 120 },
  { key: "due_date",     label: "Due Date",     sortable: true,                      defaultWidth: 130 },
  { key: "created",      label: "Created",      sortable: true,                      defaultWidth: 120 },
];
const DEFAULT_VISIBLE = ["title", "list", "labels", "status", "due_date", "team_meeting"];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500"    },
  { value: "high",   label: "High",   bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  { value: "medium", label: "Medium", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-400" },
  { value: "low",    label: "Low",    bg: "bg-blue-100",   text: "text-blue-600",   dot: "bg-blue-400"   },
];

const GROUP_OPTIONS = [
  { value: "none",     label: "No grouping" },
  { value: "priority", label: "Priority"    },
  { value: "label",    label: "Label"       },
  { value: "due_date", label: "Due Date"    },
];

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
const PREFS_KEY = "zendo_table_view_prefs";
const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } };
const savePrefs = (p) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {} };

function loadWidths(boardId) {
  try { return JSON.parse(localStorage.getItem(`zendo_table_widths_${boardId}`)) || {}; } catch { return {}; }
}
function saveWidths(boardId, w) {
  try { localStorage.setItem(`zendo_table_widths_${boardId}`, JSON.stringify(w)); } catch {}
}

// ─── Grouping helpers ──────────────────────────────────────────────────────────
function getDueLaneKey(d) {
  if (!d) return "nodate";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.floor((new Date(d + "T00:00:00") - today) / 86400000);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "week";
  return "later";
}
const DUE_LANE_LABELS = { overdue: "🔴 Overdue", today: "🟠 Due Today", week: "🟡 Due This Week", later: "🔵 Later", nodate: "⚪ No Date" };
const DUE_LANE_ORDER = ["overdue", "today", "week", "later", "nodate"];
const PRIORITY_ORDER = ["urgent", "high", "medium", "low", "none"];
const PRIORITY_LABELS = { urgent: "🔴 Urgent", high: "🟠 High", medium: "🟡 Medium", low: "🔵 Low", none: "⚪ No Priority" };

function getGroupKey(card, groupBy) {
  if (groupBy === "priority") return card.priority || "none";
  if (groupBy === "due_date") return getDueLaneKey(card.due_date);
  if (groupBy === "label") return card.labels?.[0]?.color || "__none__";
  return "__all__";
}

function getGroupLabel(key, groupBy, cards) {
  if (groupBy === "priority") return PRIORITY_LABELS[key] || key;
  if (groupBy === "due_date") return DUE_LANE_LABELS[key] || key;
  if (groupBy === "label") {
    if (key === "__none__") return "⚪ No Label";
    const lbl = cards.flatMap(c => c.labels || []).find(l => l.color === key);
    return lbl?.name || key;
  }
  return "All";
}

function groupCards(sorted, groupBy, cards) {
  if (groupBy === "none") return [{ key: "__all__", label: "All", items: sorted }];
  const map = new Map();
  sorted.forEach(card => {
    const k = getGroupKey(card, groupBy);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(card);
  });
  // Sort groups by canonical order
  let order;
  if (groupBy === "priority") order = PRIORITY_ORDER;
  else if (groupBy === "due_date") order = DUE_LANE_ORDER;
  else order = [...map.keys()];

  return order.filter(k => map.has(k)).map(k => ({
    key: k,
    label: getGroupLabel(k, groupBy, cards),
    color: groupBy === "label" && k !== "__none__" ? k : undefined,
    items: map.get(k),
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
  return sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
}

function InlineTitleCell({ card, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(card.title);
  const inputRef = useRef(null);

  const commit = async () => {
    setEditing(false);
    const trimmed = val.trim();
    if (trimmed && trimmed !== card.title) {
      await base44.entities.Card.update(card.id, { title: trimmed });
      onSaved({ ...card, title: trimmed });
    } else {
      setVal(card.title);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setVal(card.title); } }}
        onClick={e => e.stopPropagation()}
        className="w-full text-sm font-medium border border-blue-400 rounded px-1 outline-none bg-white"
      />
    );
  }
  return (
    <span
      className={`cursor-text hover:bg-blue-50 rounded px-1 -mx-1 transition-colors ${card.completed ? "line-through text-gray-400" : "text-gray-800"}`}
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      title="Click to edit title"
    >
      {card.title}
    </span>
  );
}

function InlineDueDateCell({ card, onSaved }) {
  const [val, setVal] = useState(card.due_date || "");
  const isOverdue = val && !card.completed && moment(val).isBefore(moment(), "day");

  const handleChange = async (e) => {
    const newVal = e.target.value;
    setVal(newVal);
    await base44.entities.Card.update(card.id, { due_date: newVal || null });
    onSaved({ ...card, due_date: newVal || null });
  };

  return (
    <label className="relative cursor-pointer" onClick={e => e.stopPropagation()}>
      <input
        type="date"
        value={val}
        onChange={handleChange}
        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
      />
      <span className={`text-xs px-2 py-0.5 rounded pointer-events-none inline-flex items-center gap-1 ${
        val
          ? (isOverdue ? "bg-red-100 text-red-700" : "text-gray-500 hover:bg-gray-100")
          : "text-gray-400 hover:bg-gray-100"
      }`}>
        {val ? moment(val).format("MMM D, YYYY") : "Set date"}
      </span>
    </label>
  );
}

function RowActions({ card, onOpen, onArchive, onPriorityChange }) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
      <button
        title="Open card"
        onClick={e => { e.stopPropagation(); onOpen(); }}
        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title="Change priority"
            onClick={e => e.stopPropagation()}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          {PRIORITY_OPTIONS.map(p => (
            <DropdownMenuItem key={p.value} onClick={e => { e.stopPropagation(); onPriorityChange(p.value); }} className="text-xs gap-2">
              <span className={`h-2 w-2 rounded-full ${p.dot}`} /> {p.label}
              {card.priority === p.value && <Check className="h-3 w-3 ml-auto" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={e => { e.stopPropagation(); onPriorityChange(null); }} className="text-xs">
            Clear priority
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        title="Archive card"
        onClick={e => { e.stopPropagation(); onArchive(); }}
        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
      >
        <Archive className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Column resize hook ────────────────────────────────────────────────────────
function useColumnResize(boardId, columns) {
  const defaultWidths = useMemo(() => {
    const stored = loadWidths(boardId);
    const out = {};
    columns.forEach(c => { out[c.key] = stored[c.key] ?? c.defaultWidth; });
    return out;
  }, [boardId]);
  const [widths, setWidths] = useState(defaultWidths);

  const startResize = useCallback((colKey, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widths[colKey];
    const onMove = (ev) => {
      const newW = Math.max(60, startW + ev.clientX - startX);
      setWidths(prev => {
        const next = { ...prev, [colKey]: newW };
        saveWidths(boardId, next);
        return next;
      });
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [widths, boardId]);

  return { widths, startResize };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TableView({ cards: propCards, lists: propLists, onCardClick, boardId, assigneeFilter = null }) {
  const prefs = loadPrefs();
  const [cards, setCards] = useState(propCards);
  const [lists, setLists] = useState(propLists || []);

  useEffect(() => { setCards(propCards); }, [propCards]);

  // Keep lists in sync with prop, and also fetch directly if boardId is available
  // This ensures the List column always has data even if prop is stale/empty
  useEffect(() => {
    if (propLists && propLists.length > 0) {
      setLists(propLists);
    } else if (boardId) {
      base44.entities.TaskList.filter({ board_id: boardId }).then(setLists);
    }
  }, [propLists, boardId]);

  useEffect(() => {
    if (boardId && (!propLists || propLists.length === 0)) {
      base44.entities.TaskList.filter({ board_id: boardId }).then(setLists);
    }
  }, [boardId]);

  const [sortCol, setSortCol] = useState(prefs.sortCol ?? "list");
  const [sortDir, setSortDir] = useState(prefs.sortDir ?? "asc");
  const [visibleCols, setVisibleCols] = useState(new Set(prefs.visibleCols ?? DEFAULT_VISIBLE));
  const [searchText, setSearchText] = useState("");
  const [filterList, setFilterList] = useState(prefs.filterList ?? "all");
  const [filterStatus, setFilterStatus] = useState(prefs.filterStatus ?? "all");
  const [filterLabel, setFilterLabel] = useState(prefs.filterLabel ?? "all");
  const [filterTeamMeeting, setFilterTeamMeeting] = useState(false);
  const [groupBy, setGroupBy] = useState("none");
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const persist = (patch) => savePrefs({ ...loadPrefs(), ...patch });

  const handleSort = (col) => {
    if (!ALL_COLUMNS.find(c => c.key === col)?.sortable) return;
    if (sortCol === col) {
      const newDir = sortDir === "asc" ? "desc" : "asc";
      setSortDir(newDir); persist({ sortDir: newDir });
    } else {
      setSortCol(col); setSortDir("asc"); persist({ sortCol: col, sortDir: "asc" });
    }
  };

  const toggleCol = (key) => setVisibleCols(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    persist({ visibleCols: [...next] });
    return next;
  });

  const allLabels = useMemo(() => {
    const map = new Map();
    cards.forEach(c => (c.labels || []).forEach(l => { if (!map.has(l.color)) map.set(l.color, l.name); }));
    return [...map.entries()].map(([color, name]) => ({ color, name }));
  }, [cards]);

  const filtered = useMemo(() => cards.filter(card => {
    if (card.is_archived) return false;
    if (!lists.find(l => l.id === card.list_id)) return false;
    if (searchText && !card.title?.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (filterList !== "all" && card.list_id !== filterList) return false;
    if (filterStatus === "complete" && !card.completed) return false;
    if (filterStatus === "incomplete" && card.completed) return false;
    if (filterLabel !== "all" && !(card.labels || []).some(l => l.color === filterLabel)) return false;
    if (filterTeamMeeting && !card.team_meeting) return false;
    if (assigneeFilter && card.assigned_to !== assigneeFilter) return false;
    return true;
  }), [cards, lists, searchText, filterList, filterStatus, filterLabel, filterTeamMeeting, assigneeFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let valA, valB;
    if (sortCol === "title") { valA = a.title?.toLowerCase() || ""; valB = b.title?.toLowerCase() || ""; }
    else if (sortCol === "list") {
      const la = lists.find(l => l.id === a.list_id), lb = lists.find(l => l.id === b.list_id);
      valA = (la?.position ?? 999) * 10000 + (a.position ?? 0);
      valB = (lb?.position ?? 999) * 10000 + (b.position ?? 0);
    } else if (sortCol === "labels") {
      valA = (a.labels || []).map(l => l.name || "").sort().join(",").toLowerCase();
      valB = (b.labels || []).map(l => l.name || "").sort().join(",").toLowerCase();
    } else if (sortCol === "status") { valA = a.completed ? 1 : 0; valB = b.completed ? 1 : 0; }
    else if (sortCol === "assignee") { valA = (a.assigned_to_name || a.assigned_to || "").toLowerCase(); valB = (b.assigned_to_name || b.assigned_to || "").toLowerCase(); }
    else if (sortCol === "start_date") { valA = a.start_date ? moment(a.start_date).valueOf() : Infinity; valB = b.start_date ? moment(b.start_date).valueOf() : Infinity; }
    else if (sortCol === "due_date") { valA = a.due_date ? moment(a.due_date).valueOf() : Infinity; valB = b.due_date ? moment(b.due_date).valueOf() : Infinity; }
    else if (sortCol === "team_meeting") { valA = a.team_meeting ? 1 : 0; valB = b.team_meeting ? 1 : 0; }
    else if (sortCol === "created") { valA = a.created_date ? moment(a.created_date).valueOf() : 0; valB = b.created_date ? moment(b.created_date).valueOf() : 0; }
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  }), [filtered, sortCol, sortDir, lists]);

  const groups = useMemo(() => groupCards(sorted, groupBy, cards), [sorted, groupBy, cards]);

  const activeFiltersCount = [searchText, filterList !== "all" ? filterList : null, filterStatus !== "all" ? filterStatus : null, filterLabel !== "all" ? filterLabel : null, filterTeamMeeting ? "tm" : null].filter(Boolean).length;
  const clearFilters = () => { setSearchText(""); setFilterList("all"); setFilterStatus("all"); setFilterLabel("all"); setFilterTeamMeeting(false); persist({ filterList: "all", filterStatus: "all", filterLabel: "all" }); };

  const visibleColumns = ALL_COLUMNS.filter(c => visibleCols.has(c.key));
  const { widths, startResize } = useColumnResize(boardId || "default", ALL_COLUMNS);

  const handleCardUpdate = (updated) => setCards(prev => prev.map(c => c.id === updated.id ? updated : c));

  const handleArchive = async (card) => {
    await base44.entities.Card.update(card.id, { is_archived: true });
    setCards(prev => prev.filter(c => c.id !== card.id));
  };

  const handlePriorityChange = async (card, priority) => {
    await base44.entities.Card.update(card.id, { priority: priority || null });
    handleCardUpdate({ ...card, priority: priority || null });
  };

  const toggleGroup = (key) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white/10">
      {/* Toolbar */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-thin">
        <Input
          placeholder="Search cards..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="h-8 w-44 bg-white text-sm"
        />

        {/* Group by */}
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="h-8 w-36 bg-white text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Filter: List */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white text-xs">
              <Filter className="h-3.5 w-3.5" />
              List {filterList !== "all" && <span className="ml-0.5 bg-blue-100 text-blue-700 rounded px-1">{lists.find(l => l.id === filterList)?.title}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44">
            <DropdownMenuItem onClick={() => { setFilterList("all"); persist({ filterList: "all" }); }} className="text-xs gap-2">
              {filterList === "all" && <Check className="h-3.5 w-3.5" />} All lists
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {lists.map(l => (
              <DropdownMenuItem key={l.id} onClick={() => { setFilterList(l.id); persist({ filterList: l.id }); }} className="text-xs gap-2">
                {filterList === l.id && <Check className="h-3.5 w-3.5 shrink-0" />} {l.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter: Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white text-xs">
              <Filter className="h-3.5 w-3.5" />
              Status {filterStatus !== "all" && <span className="ml-0.5 bg-blue-100 text-blue-700 rounded px-1 capitalize">{filterStatus}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-36">
            {[["all", "All"], ["incomplete", "Incomplete"], ["complete", "Complete"]].map(([val, label]) => (
              <DropdownMenuItem key={val} onClick={() => { setFilterStatus(val); persist({ filterStatus: val }); }} className="text-xs gap-2">
                {filterStatus === val && <Check className="h-3.5 w-3.5" />} {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter: Team Meeting */}
        <button
          onClick={() => setFilterTeamMeeting(v => !v)}
          className={`h-8 px-3 rounded-md border text-xs flex items-center gap-1.5 shrink-0 transition-colors ${filterTeamMeeting ? "bg-purple-100 border-purple-300 text-purple-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          🗓 Team Meeting
          {filterTeamMeeting && <Check className="h-3 w-3" />}
        </button>

        {/* Filter: Label */}
        {allLabels.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white text-xs">
                <Filter className="h-3.5 w-3.5" />
                Label {filterLabel !== "all" && <span className="ml-0.5 w-3 h-3 rounded-full inline-block" style={{ backgroundColor: filterLabel }} />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44">
              <DropdownMenuItem onClick={() => { setFilterLabel("all"); persist({ filterLabel: "all" }); }} className="text-xs gap-2">
                {filterLabel === "all" && <Check className="h-3.5 w-3.5" />} All labels
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {allLabels.map(l => (
                <DropdownMenuItem key={l.color} onClick={() => { setFilterLabel(l.color); persist({ filterLabel: l.color }); }} className="text-xs gap-2">
                  {filterLabel === l.color && <Check className="h-3.5 w-3.5 shrink-0" />}
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: l.color }} />
                  {l.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-gray-500 gap-1">
            <X className="h-3.5 w-3.5" /> Clear ({activeFiltersCount})
          </Button>
        )}

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Fields
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onCloseAutoFocus={e => e.preventDefault()}>
              {ALL_COLUMNS.filter(c => !c.alwaysVisible).map(col => (
                <DropdownMenuItem key={col.key} onClick={() => toggleCol(col.key)} className="text-xs gap-2 cursor-pointer">
                  <span className={`w-4 h-4 flex items-center justify-center rounded border ${visibleCols.has(col.key) ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                    {visibleCols.has(col.key) && <Check className="h-3 w-3 text-white" />}
                  </span>
                  {col.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scrollable table */}
      <div className="flex-1 overflow-auto px-4 pb-4 flex flex-col gap-3">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr className="border-b bg-gray-50">
                {visibleColumns.map((col, i) => (
                  <th
                    key={col.key}
                    style={{ width: widths[col.key], minWidth: 60, position: "relative" }}
                    className={`text-left px-4 py-3 font-semibold text-gray-600 select-none whitespace-nowrap ${col.sortable ? "cursor-pointer hover:bg-gray-100" : ""}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1 pr-2">
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                    </div>
                    {/* Resize handle */}
                    <div
                      onMouseDown={e => startResize(col.key, e)}
                      onClick={e => e.stopPropagation()}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-300 opacity-0 hover:opacity-100 transition-opacity"
                    />
                  </th>
                ))}
                {/* Actions column */}
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {groups.map(group => (
                <>
                  {/* Group header row (only when grouping is active) */}
                  {groupBy !== "none" && (
                    <tr key={`grp-${group.key}`} className="bg-gray-50 border-b border-t border-gray-200">
                      <td colSpan={visibleColumns.length + 1} className="px-3 py-1.5">
                        <button
                          onClick={() => toggleGroup(group.key)}
                          className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                        >
                          {collapsedGroups[group.key]
                            ? <ChevronRight className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />
                          }
                          {group.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} />}
                          {group.label}
                          <span className="font-normal text-gray-400 ml-1">({group.items.length})</span>
                        </button>
                      </td>
                    </tr>
                  )}

                  {/* Data rows */}
                  {!collapsedGroups[group.key] && group.items.map(card => {
                    const list = lists.find(l => l.id === card.list_id);
                    const cardLabels = card.labels || [];
                    return (
                      <tr
                        key={card.id}
                        onClick={() => onCardClick(card)}
                        className="border-b hover:bg-blue-50/50 cursor-pointer transition-colors group/row"
                      >
                        {visibleCols.has("title") && (
                          <td className="px-4 py-2.5 font-medium">
                            <InlineTitleCell card={card} onSaved={handleCardUpdate} />
                          </td>
                        )}
                        {visibleCols.has("list") && (
                          <td className="px-4 py-2.5">
                            <span className="bg-[#EBECF0] text-gray-600 px-2 py-0.5 rounded text-xs whitespace-nowrap">{list?.title || "—"}</span>
                          </td>
                        )}
                        {visibleCols.has("labels") && (
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {cardLabels.map((l, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white" style={{ backgroundColor: l.color }}>{l.name}</span>
                              ))}
                            </div>
                          </td>
                        )}
                        {visibleCols.has("status") && (
                          <td className="px-4 py-2.5">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${card.completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {card.completed ? "Complete" : "Incomplete"}
                            </span>
                          </td>
                        )}
                        {visibleCols.has("assignee") && (
                          <td className="px-4 py-2.5">
                            {card.assigned_to_name ? (
                              <span className="flex items-center gap-1.5 text-xs text-gray-700">
                                <span className="h-5 w-5 rounded-full bg-[#0079BF] text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                                  {(card.assigned_to_name).split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                                </span>
                                {card.assigned_to_name}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        )}
                        {visibleCols.has("team_meeting") && (
                          <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={!!card.team_meeting}
                              onChange={async (e) => {
                                const val = e.target.checked;
                                await base44.entities.Card.update(card.id, { team_meeting: val });
                                handleCardUpdate({ ...card, team_meeting: val });
                              }}
                              className="h-4 w-4 accent-purple-600 cursor-pointer"
                              title="Present on Team Meeting"
                            />
                          </td>
                        )}
                        {visibleCols.has("start_date") && (
                          <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                            {card.start_date ? moment(card.start_date).format("MMM D, YYYY") : "—"}
                          </td>
                        )}
                        {visibleCols.has("due_date") && (
                          <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                            <InlineDueDateCell card={card} onSaved={handleCardUpdate} />
                          </td>
                        )}
                        {visibleCols.has("created") && (
                          <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                            {card.created_date ? moment(card.created_date).format("MMM D, YYYY") : "—"}
                          </td>
                        )}
                        {/* Hover action bar */}
                        <td className="px-2 py-2 text-right">
                          <RowActions
                            card={card}
                            onOpen={() => onCardClick(card)}
                            onArchive={() => handleArchive(card)}
                            onPriorityChange={(p) => handlePriorityChange(card, p)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}

              {sorted.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="px-4 py-8 text-center text-gray-400">
                    {filtered.length === 0 && cards.length > 0 ? "No cards match the current filters." : "No cards yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 text-right">{sorted.length} of {cards.length} cards</p>
      </div>
    </div>
  );
}