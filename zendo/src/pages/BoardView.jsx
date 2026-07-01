import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { Plus, X, Star, MoreHorizontal, ArrowLeft, LayoutList, Calendar, BarChart2, Table2, Users, Palette, ToggleLeft, ToggleRight, Archive, ArchiveRestore, Search, Sun, FileText, BookmarkPlus, Video } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BoardList from "@/components/board/BoardList";
import CardDetailModal from "@/components/board/CardDetailModal";
import TableView from "@/components/board/TableView";
import CalendarView from "@/components/board/CalendarView";
import TimelineView from "@/components/board/TimelineView";
import CollaborationPanel from "@/components/board/CollaborationPanel";
import SwimlaneView from "@/components/board/SwimlaneView";
import DailyPlanner from "@/components/board/DailyPlanner";
import StatusReport from "@/components/board/StatusReport";
import BoardTemplatesManager from "@/components/board/BoardTemplatesManager";
import AssigneeFilterDropdown from "@/components/board/AssigneeFilterDropdown";
import MeetingMode from "@/components/board/MeetingMode";
import SaveBoardAsTemplateDialog from "@/components/board/SaveBoardAsTemplateDialog";

const DEFAULT_LABEL_DEFINITIONS = [
  { color: "#61BD4F", name: "Green" },
  { color: "#F2D600", name: "Yellow" },
  { color: "#FF9F1A", name: "Orange" },
  { color: "#EB5A46", name: "Red" },
  { color: "#C377E0", name: "Purple" },
  { color: "#0079BF", name: "Blue" },
  { color: "#344563", name: "Navy" },
  { color: "#00AECC", name: "Teal" },
  { color: "#FF80CC", name: "Pink" },
  { color: "#51E898", name: "Mint" },
  { color: "#FF6D00", name: "Amber" },
  { color: "#8E44AD", name: "Violet" },
  { color: "#1ABC9C", name: "Turquoise" },
  { color: "#E74C3C", name: "Crimson" },
];

const VIEWS = [
  { id: "board", label: "Board", icon: LayoutList },
  { id: "swimlane", label: "Swimlanes", icon: BarChart2 },
  { id: "table", label: "Table", icon: Table2 },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "timeline", label: "Timeline", icon: BarChart2 },
];

export default function BoardView() {
  const { user: authUser } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get("id");
  const focusCardId = urlParams.get("card");

  // Initialize from cache for instant rendering
  const cacheKey = `board_cache_${boardId}`;
  const cached = (() => { try { return JSON.parse(sessionStorage.getItem(cacheKey)); } catch { return null; } })();

  const [board, setBoard] = useState(cached?.board || null);
  const [lists, setLists] = useState(cached?.lists || []);
  const [cards, setCards] = useState(cached?.cards || []);
  const [loading, setLoading] = useState(!cached);
  const [labelDefinitions, setLabelDefinitions] = useState(DEFAULT_LABEL_DEFINITIONS);
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [activeView, setActiveView] = useState(() => {
    const pref = authUser?.preferred_board_view;
    // "kanban" is the old saved value for the board view
    if (!pref || pref === "kanban") return "board";
    return pref;
  });
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [showArchivedCards, setShowArchivedCards] = useState(false);
  const [archivedCardSearch, setArchivedCardSearch] = useState("");
  const [editingBoardTitle, setEditingBoardTitle] = useState(false);
  const [boardTitleInput, setBoardTitleInput] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentUser, setCurrentUser] = useState(authUser);
  const [memberRole, setMemberRole] = useState("owner"); // owner | editor | viewer
  const [boardTintBackground, setBoardTintBackground] = useState(false);
  const [enableStartDate, setEnableStartDate] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [holidayCountries, setHolidayCountries] = useState(["US"]);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState(null); // null = all, email string = specific member
  const [boardMembers, setBoardMembers] = useState([]);
  const [showDailyPlanner, setShowDailyPlanner] = useState(false);
  const [showStatusReport, setShowStatusReport] = useState(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [showSaveBoardAsTemplate, setShowSaveBoardAsTemplate] = useState(false);
  const [showMeetingMode, setShowMeetingMode] = useState(false);

  const loadData = useCallback(async () => {
    if (!boardId) return;
    const user = authUser;
    const [boardData, listsData, cardsData, members] = await Promise.all([
      base44.entities.Board.filter({ id: boardId }),
      base44.entities.TaskList.filter({ board_id: boardId }),
      base44.entities.Card.filter({ board_id: boardId }),
      base44.entities.BoardMember.filter({ board_id: boardId }),
    ]);
    const freshUser = await base44.auth.me();
    setBoardTintBackground(!!freshUser?.board_tint_background);
    setEnableStartDate(!!freshUser?.enable_start_date);
    setShowHolidays(!!freshUser?.show_holidays);
    setHolidayCountries(freshUser?.holiday_countries?.length ? freshUser.holiday_countries : ["US"]);
    const b = boardData[0];
    setBoard(b);
    setLabelDefinitions(b?.label_definitions?.length ? b.label_definitions : DEFAULT_LABEL_DEFINITIONS);
    const sortedLists = listsData.sort((a, b) => a.position - b.position);
    setLists(sortedLists);
    setCards(cardsData);
    setCurrentUser(user);

    // Cache for instant re-render on next visit
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ board: b, lists: sortedLists, cards: cardsData })); } catch {}

    // Determine role
    if (user && b) {
      if (b.created_by?.toLowerCase() === user.email?.toLowerCase()) {
        setMemberRole("owner");
      } else {
        const myMembership = members.find((m) => m.user_email.toLowerCase() === user.email.toLowerCase());
        setMemberRole(myMembership?.role || "viewer");
      }
    }

    // Build members list for assignee filter (owner + board members)
    const memberList = [];
    if (b?.created_by) {
      memberList.push({ user_email: b.created_by, user_name: b.created_by === user?.email ? user?.full_name : b.created_by });
    }
    members.forEach(m => {
      if (!memberList.find(x => x.user_email === m.user_email)) {
        memberList.push({ user_email: m.user_email, user_name: m.user_name || m.user_email });
      }
    });
    // Patch in the current user's full name if they appear in the list
    if (user?.full_name) {
      memberList.forEach(m => {
        if (m.user_email === user.email) m.user_name = user.full_name;
      });
    }
    setBoardMembers(memberList);

    setLoading(false);
    if (focusCardId) {
      const card = cardsData.find((c) => c.id === focusCardId);
      if (card) setSelectedCard(card);
    }
  }, [boardId, focusCardId, authUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live collaboration: reflect other users' changes to this board instantly,
  // instead of waiting for the next manual refresh.
  useEffect(() => {
    if (!boardId) return;

    const unsubCard = base44.entities.Card.subscribe((event) => {
      const record = event.data;
      if (!record || record.board_id !== boardId) return;
      setCards((prev) => {
        if (event.type === "delete") return prev.filter((c) => c.id !== event.id);
        const exists = prev.some((c) => c.id === record.id);
        return exists ? prev.map((c) => (c.id === record.id ? record : c)) : [...prev, record];
      });
    });

    const unsubList = base44.entities.TaskList.subscribe((event) => {
      const record = event.data;
      if (!record || record.board_id !== boardId) return;
      setLists((prev) => {
        const next = event.type === "delete"
          ? prev.filter((l) => l.id !== event.id)
          : prev.some((l) => l.id === record.id)
            ? prev.map((l) => (l.id === record.id ? record : l))
            : [...prev, record];
        return next.sort((a, b) => a.position - b.position);
      });
    });

    const unsubBoard = base44.entities.Board.subscribe((event) => {
      if (event.id !== boardId || event.type === "delete") return;
      setBoard((prev) => (prev ? { ...prev, ...event.data } : event.data));
    });

    return () => {
      unsubCard();
      unsubList();
      unsubBoard();
    };
  }, [boardId]);

  // Redirect to Boards if no board ID — must be AFTER all hooks
  if (!boardId) {
    return <Navigate to={createPageUrl("Boards")} replace />;
  }

  const addList = async () => {
    if (!newListTitle.trim()) return;
    const maxPos = lists.length > 0 ? Math.max(...lists.map((l) => l.position)) : 0;
    const newList = await base44.entities.TaskList.create({
      title: newListTitle.trim(),
      board_id: boardId,
      position: maxPos + 1000,
    });
    setNewListTitle("");
    setAddingList(false);
    setLists((prev) => [...prev, newList]);
  };

  const toggleStar = async () => {
    const next = !board.is_starred;
    setBoard((prev) => ({ ...prev, is_starred: next }));
    await base44.entities.Board.update(board.id, { is_starred: next });
  };

  const FULL_COLORS = [
    "#0079BF", "#D29034", "#519839", "#B04632", "#89609E",
    "#CD5A91", "#4BBF6B", "#00AECC", "#838C91", "#5B4FCF"
  ];
  const TINT_COLORS = FULL_COLORS.map((hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const tr = Math.round(r * 0.6 + 255 * 0.4);
    const tg = Math.round(g * 0.6 + 255 * 0.4);
    const tb = Math.round(b * 0.6 + 255 * 0.4);
    return `#${tr.toString(16).padStart(2, "0")}${tg.toString(16).padStart(2, "0")}${tb.toString(16).padStart(2, "0")}`;
  });
  const BOARD_COLORS = [...FULL_COLORS, ...TINT_COLORS];

  const changeBoardColor = async (color) => {
    await base44.entities.Board.update(board.id, { background_color: color });
    setBoard({ ...board, background_color: color });
    setShowColorPicker(false);
  };

  const deleteBoard = async () => {
    await Promise.all([
      ...cards.map((c) => base44.entities.Card.delete(c.id)),
      ...lists.map((l) => base44.entities.TaskList.delete(l.id)),
    ]);
    await base44.entities.Board.delete(board.id);
    window.location.href = createPageUrl("Boards");
  };

  const onDragEnd = async (result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === "list") {
      const reordered = [...lists];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      const updated = reordered.map((l, i) => ({ ...l, position: (i + 1) * 1000 }));
      setLists(updated);
      await Promise.all(updated.map(l => base44.entities.TaskList.update(l.id, { position: l.position })));
      return;
    }

    if (type === "card") {
      const sourceListId = source.droppableId;
      const destListId = destination.droppableId;

      const allCards = [...cards];

      // Use the same filter as what BoardList renders — non-archived only, no priority filter
      // (priority filter is a visual filter only, not structural, so we sort all non-archived cards)
      const sourceCards = allCards
        .filter(c => c.list_id === sourceListId && !c.is_archived)
        .sort((a, b) => a.position - b.position);

      const [movedCard] = sourceCards.splice(source.index, 1);

      if (sourceListId === destListId) {
        sourceCards.splice(destination.index, 0, movedCard);
        const updatedCards = sourceCards.map((c, i) => ({ ...c, position: (i + 1) * 1000 }));
        setCards(allCards.map(c => updatedCards.find(u => u.id === c.id) || c));
        await Promise.all(updatedCards.map(c => base44.entities.Card.update(c.id, { position: c.position })));
      } else {
        const destCards = allCards
          .filter(c => c.list_id === destListId && !c.is_archived)
          .sort((a, b) => a.position - b.position);

        const movedToNewList = { ...movedCard, list_id: destListId };
        destCards.splice(destination.index, 0, movedToNewList);

        const updatedSource = sourceCards.map((c, i) => ({ ...c, position: (i + 1) * 1000 }));
        const updatedDest = destCards.map((c, i) => ({ ...c, position: (i + 1) * 1000 }));
        const allUpdated = [...updatedSource, ...updatedDest];

        // Build new cards array: replace updated cards, keep the rest
        const newAllCards = allCards.map(c => allUpdated.find(u => u.id === c.id) || c);
        setCards(newAllCards);

        await Promise.all(allUpdated.map(c =>
          base44.entities.Card.update(c.id, { list_id: c.list_id, position: c.position })
        ));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Board not found</p>
        <Link to={createPageUrl("Boards")} className="text-[#0079BF] underline">Go to boards</Link>
      </div>
    );
  }

  const bgColor = board.background_color || "#0079BF";

  // Compute 30% tint of board color for the canvas background
  const tintBg = (() => {
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const tr = Math.round(r * 0.3 + 255 * 0.7);
    const tg = Math.round(g * 0.3 + 255 * 0.7);
    const tb = Math.round(b * 0.3 + 255 * 0.7);
    return `#${tr.toString(16).padStart(2, "0")}${tg.toString(16).padStart(2, "0")}${tb.toString(16).padStart(2, "0")}`;
  })();

  const canvasBg = boardTintBackground ? tintBg : undefined;
  const sortedLists = [...lists].sort((a, b) => a.position - b.position);
  const PRIORITY_FILTER_OPTIONS = [
    { value: "all", label: "All" },
    { value: "urgent", label: "Urgent", dot: "bg-red-500" },
    { value: "high",   label: "High",   dot: "bg-orange-400" },
    { value: "medium", label: "Medium", dot: "bg-yellow-400" },
    { value: "low",    label: "Low",    dot: "bg-blue-400" },
  ];
  const activeCards = cards.filter(c =>
    !c.is_archived &&
    (priorityFilter === "all" || c.priority === priorityFilter) &&
    (!assigneeFilter || c.assigned_to === assigneeFilter)
  );
  const archivedCards = cards.filter(c => c.is_archived);
  const filteredArchivedCards = archivedCards.filter(c =>
    c.title.toLowerCase().includes(archivedCardSearch.toLowerCase())
  );
  const selectedCardListTitle = selectedCard ? lists.find((l) => l.id === selectedCard.list_id)?.title || "" : "";

  const archiveCard = async (card) => {
    setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, is_archived: true } : c));
    await base44.entities.Card.update(card.id, { is_archived: true });
  };

  const restoreCard = async (card) => {
    setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, is_archived: false } : c));
    await base44.entities.Card.update(card.id, { is_archived: false });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#faf9f7] dark:bg-background" style={canvasBg ? { backgroundColor: canvasBg } : {}}>
      {/* Board header — two rows */}
      <div className="shrink-0" style={{ backgroundColor: bgColor }}>
        {/* Row 1: Back, Title, Star */}
        <div className="flex items-center gap-2 px-3 pt-2 pb-1">
          <Link to={createPageUrl("Boards")} className="text-white/70 hover:text-white p-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {editingBoardTitle ? (
            <input
              autoFocus
              value={boardTitleInput}
              onChange={(e) => setBoardTitleInput(e.target.value)}
              onBlur={async () => {
                setEditingBoardTitle(false);
                if (boardTitleInput.trim() && boardTitleInput.trim() !== board.title) {
                  await base44.entities.Board.update(board.id, { title: boardTitleInput.trim() });
                  setBoard({ ...board, title: boardTitleInput.trim() });
                }
              }}
              onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") { setEditingBoardTitle(false); } }}
              className="flex-1 bg-white/20 text-white font-bold text-base rounded px-2 py-0.5 outline-none border border-white/40 min-w-0"
            />
          ) : (
            <h1
              className="text-white font-bold text-base truncate flex-1 cursor-pointer hover:bg-white/20 rounded px-2 py-0.5 -mx-2"
              onClick={() => { setBoardTitleInput(board.title); setEditingBoardTitle(true); }}
            >{board.title}</h1>
          )}
          <button onClick={toggleStar} className="shrink-0">
            <Star className="h-4 w-4" fill={board.is_starred ? "#e6c60d" : "transparent"} stroke={board.is_starred ? "#e6c60d" : "white"} />
          </button>
        </div>
        {/* Row 2: Views + Actions */}
        <div className="flex items-center gap-1.5 px-3 pb-2 overflow-x-auto scrollbar-none">
          {/* Group 1 — View switchers */}
          <div className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5 shrink-0">
            {VIEWS.map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => setActiveView(v.id)}
                  title={v.label}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                    activeView === v.id
                      ? "bg-white/30 text-white shadow-sm"
                      : "text-white/60 hover:text-white hover:bg-white/15"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-white/25 shrink-0 mx-0.5" />

          {/* Group 2 — Priority filters */}
          <div className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5 shrink-0">
            {PRIORITY_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPriorityFilter(opt.value)}
                title={opt.label}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  priorityFilter === opt.value
                    ? "bg-white/25 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {opt.dot
                  ? <span className={`h-2 w-2 rounded-full shrink-0 ${opt.dot}`} />
                  : <span className="text-xs">All</span>
                }
                <span className="hidden lg:inline">{opt.dot ? opt.label : ""}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-white/25 shrink-0 mx-0.5" />

          {/* Assignee filter */}
          {boardMembers.length > 0 && (
            <div className="bg-black/20 rounded-lg p-0.5 shrink-0">
              <AssigneeFilterDropdown
                members={boardMembers}
                value={assigneeFilter}
                onChange={setAssigneeFilter}
              />
            </div>
          )}

          {/* Spacer — pushes Group 3 to the right */}
          <div className="flex-1 min-w-0" />

          {/* Divider */}
          <div className="w-px h-4 bg-white/25 shrink-0 mx-0.5" />

          {/* Group 3 — Board actions (right-aligned, de-emphasized) */}
          <button
            onClick={() => setShowMeetingMode(true)}
            className="flex items-center gap-1 text-white/60 hover:text-white hover:bg-white/15 px-2 py-1 rounded transition-colors shrink-0"
            style={{ fontSize: 13 }}
            title="Meeting Mode"
          >
            <Video className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Meeting</span>
          </button>
          <button
            onClick={() => setShowStatusReport(true)}
            className="flex items-center gap-1 text-white/60 hover:text-white hover:bg-white/15 px-2 py-1 rounded transition-colors shrink-0"
            style={{ fontSize: 13 }}
            title="Status Report"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Report</span>
          </button>
          <button
            onClick={() => setShowDailyPlanner(true)}
            className="flex items-center gap-1 text-white/60 hover:text-white hover:bg-white/15 px-2 py-1 rounded transition-colors shrink-0"
            style={{ fontSize: 13 }}
            title="Daily Focus"
          >
            <Sun className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Focus</span>
          </button>
          {memberRole !== "viewer" && archivedCards.length > 0 && (
            <button
              onClick={() => setShowArchivedCards(true)}
              className="flex items-center gap-1 text-white/60 hover:text-white hover:bg-white/15 px-2 py-1 rounded transition-colors shrink-0"
              style={{ fontSize: 13 }}
            >
              <Archive className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Archive ({archivedCards.length})</span>
            </button>
          )}
          <button
            onClick={() => setShowCollabPanel(true)}
            className="flex items-center gap-1 text-white/60 hover:text-white hover:bg-white/15 px-2 py-1 rounded transition-colors shrink-0"
            style={{ fontSize: 13 }}
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Members</span>
          </button>
          {memberRole !== "viewer" && (
            <div className="relative shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-white/60 hover:text-white hover:bg-white/15 p-1.5 rounded transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setTimeout(() => setShowColorPicker(true), 50)}>
                    <Palette className="h-4 w-4 mr-2" /> Change color
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    const next = !board.enable_time_tracking;
                    await base44.entities.Board.update(board.id, { enable_time_tracking: next });
                    setBoard({ ...board, enable_time_tracking: next });
                  }}>
                    {board.enable_time_tracking
                      ? <><ToggleRight className="h-4 w-4 mr-2 text-green-600" /> Disable time tracking</>
                      : <><ToggleLeft className="h-4 w-4 mr-2" /> Enable time tracking</>
                    }
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowSaveBoardAsTemplate(true)}>
                    <BookmarkPlus className="h-4 w-4 mr-2" /> Save board as template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowTemplatesPanel(true)}>
                    <BookmarkPlus className="h-4 w-4 mr-2" /> Manage card templates
                  </DropdownMenuItem>
                  {memberRole === "owner" && (
                    <DropdownMenuItem onClick={deleteBoard} className="text-red-600">Delete board</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Views */}
      {activeView === "board" && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <DragDropContext onDragEnd={memberRole === "viewer" ? () => {} : onDragEnd}>
            <Droppable droppableId="board" direction="horizontal" type="list">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-3 items-start h-full">
                  {sortedLists.map((list, index) => (
                    <BoardList
                      key={list.id}
                      list={list}
                      cards={cards.filter((c) => c.list_id === list.id && !c.is_archived)}
                      priorityFilter={priorityFilter}
                      assigneeFilter={assigneeFilter}
                      index={index}
                      boardId={boardId}
                      onRefresh={loadData}
                      onCardAdded={(newCard) => setCards((prev) => [...prev, newCard])}
                      onCardClick={(card) => setSelectedCard(card)}
                      onCardUpdate={(updated) => setCards((prev) => prev.map((c) => c.id === updated.id ? updated : c))}
                      readOnly={memberRole === "viewer"}
                      labelDefinitions={labelDefinitions}
                      enableTimeTracking={!!board?.enable_time_tracking}
                      currentUser={currentUser}
                      showAgendaToggle={true}
                      customFieldDefinitions={board?.custom_fields_definitions || []}
                    />
                  ))}
                  {provided.placeholder}

                  {memberRole !== "viewer" && (
                    <div className="w-[272px] shrink-0">
                      {addingList ? (
                        <div className="bg-card border border-border rounded-xl p-2 shadow-sm">
                          <Input
                            autoFocus
                            placeholder="Enter list title..."
                            value={newListTitle}
                            onChange={(e) => setNewListTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addList()}
                            className="mb-2 text-sm"
                          />
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" onClick={addList} className="bg-[#5B4FCF] hover:bg-[#4a3fb8] text-white">
                              Add list
                            </Button>
                            <button onClick={() => { setAddingList(false); setNewListTitle(""); }}>
                              <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingList(true)}
                          className="flex items-center gap-1.5 w-full bg-white/60 dark:bg-card border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
                        >
                          <Plus className="h-4 w-4" />
                          Add another list
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {activeView === "swimlane" && (
        <SwimlaneView
          cards={activeCards}
          lists={sortedLists}
          onCardClick={(card) => setSelectedCard(card)}
          onRefresh={loadData}
          readOnly={memberRole === "viewer"}
          labelDefinitions={labelDefinitions}
          enableTimeTracking={!!board?.enable_time_tracking}
        />
      )}

      {activeView === "table" && (
        <TableView cards={cards} lists={lists} onCardClick={(card) => setSelectedCard(card)} boardId={boardId} assigneeFilter={assigneeFilter} />
      )}
      {activeView === "calendar" && (
        <CalendarView
          cards={activeCards}
          lists={lists}
          onCardClick={(card) => setSelectedCard(card)}
          onCardCreated={loadData}
          onCardUpdate={(updated) => setCards(prev => prev.map(c => c.id === updated.id ? updated : c))}
          boardId={boardId}
          showHolidays={showHolidays}
          holidayCountries={holidayCountries}
        />
      )}
      {activeView === "timeline" && (
        <TimelineView cards={activeCards} lists={sortedLists} onCardClick={(card) => setSelectedCard(card)} />
      )}

      <CardDetailModal
        card={selectedCard}
        listTitle={selectedCardListTitle}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        currentUser={currentUser}
        onUpdate={async (updatedCard) => {
          if (updatedCard) {
            setCards((prev) => prev.map((c) => c.id === updatedCard.id ? updatedCard : c));
          } else {
            await loadData();
          }
        }}
        onDelete={() => { setSelectedCard(null); loadData(); }}
        onArchive={memberRole !== "viewer" ? (card) => { archiveCard(card); setSelectedCard(null); } : undefined}
        readOnly={memberRole === "viewer"}
        enableTimeTracking={!!board?.enable_time_tracking}
        boardId={boardId}
        enableStartDate={enableStartDate}
        labelDefinitions={labelDefinitions}
        onLabelDefinitionsChange={(defs) => {
          setLabelDefinitions(defs);
          base44.entities.Board.update(boardId, { label_definitions: defs });
        }}
      />

      {/* Archived Cards Dialog */}
      {showArchivedCards && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowArchivedCards(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Archive className="h-4 w-4 text-gray-500" />
                Archived Cards
              </h2>
              <button onClick={() => setShowArchivedCards(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="w-full border border-border bg-background text-foreground rounded-md pl-9 pr-3 py-1.5 text-sm outline-none focus:border-[#0079BF]"
                placeholder="Search archived cards..."
                value={archivedCardSearch}
                onChange={e => setArchivedCardSearch(e.target.value)}
              />
            </div>
            {filteredArchivedCards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No archived cards found.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredArchivedCards.map(card => {
                  const listName = lists.find(l => l.id === card.list_id)?.title || "Unknown list";
                  return (
                    <div key={card.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{card.title}</p>
                        <p className="text-xs text-muted-foreground">in {listName}</p>
                      </div>
                      <button
                        onClick={() => restoreCard(card)}
                        className="flex items-center gap-1 text-xs text-[#0079BF] hover:underline font-medium shrink-0"
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        Restore
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showMeetingMode && (
        <MeetingMode
          cards={cards}
          lists={lists}
          boardId={boardId}
          currentUser={currentUser}
          onClose={() => setShowMeetingMode(false)}
          onCardUpdate={(updated) => setCards(prev => prev.map(c => c.id === updated.id ? updated : c))}
          labelDefinitions={labelDefinitions}
          onLabelDefinitionsChange={(defs) => { setLabelDefinitions(defs); base44.entities.Board.update(boardId, { label_definitions: defs }); }}
          memberRole={memberRole}
          enableTimeTracking={!!board?.enable_time_tracking}
        />
      )}

      {showStatusReport && (
        <StatusReport
          board={board}
          cards={cards}
          lists={lists}
          onClose={() => setShowStatusReport(false)}
        />
      )}

      {showDailyPlanner && (
        <DailyPlanner
          cards={cards}
          lists={lists}
          boardId={boardId}
          onCardClick={(card) => { setShowDailyPlanner(false); setSelectedCard(card); }}
          onCardUpdate={(updated) => setCards(prev => prev.map(c => c.id === updated.id ? updated : c))}
          onClose={() => setShowDailyPlanner(false)}
        />
      )}

      <CollaborationPanel
        boardId={boardId}
        open={showCollabPanel}
        onClose={() => setShowCollabPanel(false)}
        currentUserEmail={currentUser?.email}
      />

      {/* Templates Panel */}
      {showTemplatesPanel && (
        <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={() => setShowTemplatesPanel(false)}>
          <div className="bg-card border-l border-border w-full max-w-sm h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="h-4 w-4 text-purple-600" />
                <h2 className="font-semibold text-gray-800 text-sm">Card Templates</h2>
              </div>
              <button onClick={() => setShowTemplatesPanel(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <p className="text-xs text-gray-400 mb-3">Templates are reusable card blueprints. Save any card as a template from the card's "More Actions" menu.</p>
              <BoardTemplatesManager boardId={boardId} />
            </div>
          </div>
        </div>
      )}

      <SaveBoardAsTemplateDialog
        open={showSaveBoardAsTemplate}
        onClose={() => setShowSaveBoardAsTemplate(false)}
        board={board}
        lists={sortedLists}
      />

      {/* Color picker — portaled to document.body to escape overflow:hidden */}
      {showColorPicker && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
          <div className="fixed right-4 top-24 z-50 bg-card rounded-lg shadow-xl border border-border p-3 flex flex-col gap-2 min-w-[232px]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-muted-foreground">Board color</p>
              <button onClick={() => setShowColorPicker(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-7 gap-1.5">
                {FULL_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => changeBoardColor(c)}
                    className={`aspect-square w-full rounded-full border-2 transition-all hover:scale-110 ${
                      c === bgColor ? "border-gray-800 scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {TINT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => changeBoardColor(c)}
                    className={`aspect-square w-full rounded-full border-2 transition-all hover:scale-110 ${
                      c === bgColor ? "border-gray-800 scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}