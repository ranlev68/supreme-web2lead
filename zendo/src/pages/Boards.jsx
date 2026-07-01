import { useState, useEffect, useRef, memo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Star, X, FolderInput, Plus, Users, Archive, ArchiveRestore, Search, Layers } from "lucide-react";
import BoardTemplatePicker from "@/components/board/BoardTemplatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/components/WorkspaceContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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

export default function Boards() {
  const { workspaces, currentWorkspace, user: currentUser, loading: workspaceLoading } = useWorkspace();
  const BOARDS_CACHE_KEY = "boards_cache";
  const boardsCache = (() => { try { return JSON.parse(sessionStorage.getItem(BOARDS_CACHE_KEY)); } catch { return null; } })();

  const [boardsByWorkspace, setBoardsByWorkspace] = useState(boardsCache?.boardsByWorkspace || {});
  const [sharedBoards, setSharedBoards] = useState(boardsCache?.sharedBoards || []);
  const [boardProgress, setBoardProgress] = useState(boardsCache?.boardProgress || {});
  const [boardAssignees, setBoardAssignees] = useState(boardsCache?.boardAssignees || {});
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const [creatingIn, setCreatingIn] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState(BOARD_COLORS[0]);
  const [showArchive, setShowArchive] = useState(false);
  const [archivedBoards, setArchivedBoards] = useState([]);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templatePickerWorkspaceId, setTemplatePickerWorkspaceId] = useState(null);

  const isFavoritesView = currentWorkspace === "favorites";
  const isSharedView = currentWorkspace === "shared";
  const visibleWorkspaces = (!currentWorkspace || isFavoritesView || isSharedView) ? workspaces : [currentWorkspace];

  useEffect(() => {
    if (!workspaceLoading && currentUser) {
      loadAllBoards();
    }
  }, [workspaceLoading, currentUser?.email]);

  const loadAllBoards = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const user = currentUser;

      // Fetch all user's created boards and memberships in parallel
      const [userCreatedBoards, memberships, boardMembers] = await Promise.all([
        base44.entities.Board.filter({ created_by: user.email }),
        base44.entities.WorkspaceMember.filter({ user_email: user.email }),
        base44.entities.BoardMember.filter({ user_email: user.email }),
      ]);

      const wsIds = new Set(memberships.map(m => m.workspace_id));
      const noWorkspaceBoards = userCreatedBoards.filter(b => !b.workspace_id && !b.is_archived);

      // Organize created boards by workspace, sorted by position
      const map = {};
      userCreatedBoards.forEach(board => {
        if (board.is_archived) return;
        if (board.workspace_id && wsIds.has(board.workspace_id)) {
          if (!map[board.workspace_id]) map[board.workspace_id] = [];
          map[board.workspace_id].push(board);
        }
      });
      Object.keys(map).forEach(wsId => {
        map[wsId].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      });

      // Find shared boards (user is member but didn't create)
      const ownedIds = new Set(userCreatedBoards.map(b => b.id));
      const sharedBoardIds = boardMembers.map(m => m.board_id).filter(id => !ownedIds.has(id));
      
      // Fetch actual board data for shared boards
      const sharedBoardData = sharedBoardIds.length > 0 
        ? await base44.entities.Board.filter({ id: { "$in": sharedBoardIds } })
        : [];
      const shared = sharedBoardData.filter(b => !b.is_archived);
      const archived = userCreatedBoards.filter(b => b.is_archived);
      setArchivedBoards(archived);

      // Compute card completion progress and unique assignees per board
      const allBoardIds = [...userCreatedBoards.map(b => b.id), ...shared.map(b => b.id)];
      let progress = {};
      let assignees = {};
      if (allBoardIds.length > 0) {
        const cards = await base44.entities.Card.filter({ board_id: { "$in": allBoardIds }, is_archived: false });
        const seen = {};
        cards.forEach((c) => {
          if (!progress[c.board_id]) progress[c.board_id] = { completed: 0, total: 0 };
          progress[c.board_id].total += 1;
          if (c.completed) progress[c.board_id].completed += 1;
          const email = c.assigned_to;
          if (email && !seen[c.board_id + email]) {
            seen[c.board_id + email] = true;
            if (!assignees[c.board_id]) assignees[c.board_id] = [];
            assignees[c.board_id].push({ email, name: c.assigned_to_name || email });
          }
        });
      }

      setBoardsByWorkspace({ ...map, "no-workspace": noWorkspaceBoards });
      setSharedBoards(shared);
      setBoardProgress(progress);
      setBoardAssignees(assignees);
      try { sessionStorage.setItem(BOARDS_CACHE_KEY, JSON.stringify({ boardsByWorkspace: { ...map, "no-workspace": noWorkspaceBoards }, sharedBoards: shared, boardProgress: progress, boardAssignees: assignees })); } catch {}
      setLoading(false);
    } catch (e) {
      console.error("Failed to load boards:", e);
      setLoading(false);
    }
  };

  const createBoard = async (workspaceId) => {
    if (!newTitle.trim()) return;
    try { sessionStorage.removeItem(BOARDS_CACHE_KEY); } catch {}
    try {
      await base44.entities.Board.create({
        title: newTitle.trim(),
        background_color: selectedColor,
        is_starred: false,
        workspace_id: workspaceId,
      });
      setNewTitle("");
      setSelectedColor(BOARD_COLORS[0]);
      setCreatingIn(null);
      loadAllBoards();
    } catch (e) {
      console.error(e);
      alert("Couldn't create board: " + e.message);
    }
  };

  const toggleStar = async (e, board) => {
    e.preventDefault();
    e.stopPropagation();
    // Optimistic update
    const newStarred = !board.is_starred;
    setBoardsByWorkspace(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(wsId => {
        next[wsId] = next[wsId].map(b => b.id === board.id ? { ...b, is_starred: newStarred } : b);
      });
      return next;
    });
    setSharedBoards(prev => prev.map(b => b.id === board.id ? { ...b, is_starred: newStarred } : b));
    await base44.entities.Board.update(board.id, { is_starred: newStarred });
  };

  const archiveBoard = async (board) => {
    await base44.entities.Board.update(board.id, { is_archived: true, archived_at: new Date().toISOString() });
    try { sessionStorage.removeItem(BOARDS_CACHE_KEY); } catch {}
    loadAllBoards();
  };

  const restoreBoard = async (board) => {
    await base44.entities.Board.update(board.id, { is_archived: false, archived_at: null });
    try { sessionStorage.removeItem(BOARDS_CACHE_KEY); } catch {}
    loadAllBoards();
  };

  const moveBoard = async (board, targetWorkspaceId) => {
    setBoardsByWorkspace(prev => {
      const next = { ...prev };
      const movedBoard = { ...board, workspace_id: targetWorkspaceId };
      Object.keys(next).forEach(wsId => {
        next[wsId] = next[wsId].filter(b => b.id !== board.id);
      });
      if (next[targetWorkspaceId]) next[targetWorkspaceId] = [...next[targetWorkspaceId], movedBoard];
      return next;
    });
    await base44.entities.Board.update(board.id, { workspace_id: targetWorkspaceId });
  };

  const onDragEnd = useCallback((result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const srcWsId = source.droppableId;
    const dstWsId = destination.droppableId;
    if (srcWsId === dstWsId && source.index === destination.index) return;

    setBoardsByWorkspace(prev => {
      const next = { ...prev };
      const srcBoards = [...(next[srcWsId] || [])];
      const [moved] = srcBoards.splice(source.index, 1);
      next[srcWsId] = srcBoards;

      if (srcWsId === dstWsId) {
        // Same workspace reorder
        srcBoards.splice(destination.index, 0, moved);
        next[srcWsId] = srcBoards;
        srcBoards.forEach((board, idx) => {
          base44.entities.Board.update(board.id, { position: idx });
        });
      } else {
        // Cross-workspace move
        const dstBoards = [...(next[dstWsId] || [])];
        const movedBoard = { ...moved, workspace_id: dstWsId };
        dstBoards.splice(destination.index, 0, movedBoard);
        next[dstWsId] = dstBoards;
        // Update positions in both workspaces and change workspace_id
        srcBoards.forEach((board, idx) => {
          base44.entities.Board.update(board.id, { position: idx });
        });
        dstBoards.forEach((board, idx) => {
          base44.entities.Board.update(board.id, { position: idx, workspace_id: dstWsId });
        });
      }

      try { sessionStorage.removeItem(BOARDS_CACHE_KEY); } catch {}
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#0079BF] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Favorites view
  if (isFavoritesView) {
    const favorites = Object.values(boardsByWorkspace).flat().filter(b => b.is_starred);
    return (
      <div className="max-w-5xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-[#e6c60d]" fill="#e6c60d" />
          <h2 className="text-base font-bold text-foreground">Favorites</h2>
        </div>
        {favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No starred boards yet.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {favorites.map(board => (
              <div key={board.id} className="shrink-0 w-52">
                <BoardTile board={board} progress={boardProgress[board.id]} assignees={boardAssignees[board.id]} onToggleStar={toggleStar} workspaces={workspaces} currentWorkspaceId={board.workspace_id} onMove={moveBoard} onArchive={archiveBoard} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Shared with me view
  if (isSharedView) {
    return (
      <div className="max-w-5xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-[#5B4FCF]" />
          <h2 className="text-base font-bold text-foreground">Shared with Me</h2>
        </div>
        {sharedBoards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No boards shared with you yet.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {sharedBoards.map(board => (
              <div key={board.id} className="shrink-0 w-52">
                <BoardTile board={board} progress={boardProgress[board.id]} assignees={boardAssignees[board.id]} onToggleStar={toggleStar} workspaces={workspaces} currentWorkspaceId={board.workspace_id} onMove={moveBoard} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const filteredArchived = archivedBoards.filter(b =>
    !archiveSearch || b.title.toLowerCase().includes(archiveSearch.toLowerCase())
  );

  // All workspaces or single workspace view
  const allBoards = Object.values(boardsByWorkspace).flat();
  const favorites = allBoards.filter(b => b.is_starred);

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-10">
      {favorites.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-[#e6c60d]" fill="#e6c60d" />
            <h2 className="text-base font-bold text-foreground">Favorites</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {favorites.map(board => (
              <div key={board.id} className="shrink-0 w-52">
                <BoardTile board={board} progress={boardProgress[board.id]} assignees={boardAssignees[board.id]} onToggleStar={toggleStar} workspaces={workspaces} currentWorkspaceId={board.workspace_id} onMove={moveBoard} onArchive={archiveBoard} />
              </div>
            ))}
          </div>
        </div>
      )}

      {sharedBoards.length > 0 && !currentWorkspace && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-[#5B4FCF]" />
            <h2 className="text-base font-bold text-foreground">Shared with Me</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {sharedBoards.map(board => (
              <div key={board.id} className="shrink-0 w-52">
                <BoardTile board={board} progress={boardProgress[board.id]} assignees={boardAssignees[board.id]} onToggleStar={toggleStar} workspaces={workspaces} currentWorkspaceId={board.workspace_id} onMove={moveBoard} />
              </div>
            ))}
          </div>
        </div>
      )}

      {boardsByWorkspace["no-workspace"] && boardsByWorkspace["no-workspace"].length > 0 && !currentWorkspace && (
        <div>
          <h2 className="text-base font-bold text-foreground mb-3">No Workspace</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {boardsByWorkspace["no-workspace"].map((board) => (
              <div key={board.id} className="shrink-0 w-52">
                <BoardTile board={board} progress={boardProgress[board.id]} assignees={boardAssignees[board.id]} onToggleStar={toggleStar} workspaces={workspaces} currentWorkspaceId={null} onMove={moveBoard} onArchive={archiveBoard} />
              </div>
            ))}
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        {visibleWorkspaces.map((ws) => {
          const boards = boardsByWorkspace[ws.id] || [];
          const isCreating = creatingIn === ws.id;
          return (
            <div key={ws.id}>
              <h2 className="text-base font-bold text-foreground mb-3">{ws.name}</h2>
              <Droppable droppableId={ws.id} direction="horizontal">
                {(provided) => (
                  <div className="flex gap-3 overflow-x-auto pb-2" ref={provided.innerRef} {...provided.droppableProps}>
                    {boards.map((board, idx) => (
                      <Draggable key={board.id} draggableId={board.id} index={idx}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`shrink-0 w-52 ${dragSnapshot.isDragging ? "rotate-2 opacity-90" : ""}`}
                          >
                            <BoardTile board={board} progress={boardProgress[board.id]} assignees={boardAssignees[board.id]} onToggleStar={toggleStar} workspaces={workspaces} currentWorkspaceId={ws.id} onMove={moveBoard} onArchive={archiveBoard} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {isCreating ? (
                      <div className="relative shrink-0 w-52">
                        <div className="h-28 rounded-lg bg-card border border-border p-3 flex flex-col gap-2">
                          <div className="h-1.5 w-full rounded" style={{ backgroundColor: selectedColor }} />
                          <Input autoFocus placeholder="Board title" value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && createBoard(ws.id)}
                            className="text-sm h-8" />
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              {FULL_COLORS.map((c) => (
                                <button key={c} onClick={() => setSelectedColor(c)}
                                  className={`h-4 w-4 rounded-full border-2 transition-all ${c === selectedColor ? "border-gray-500 scale-110" : "border-transparent"}`}
                                  style={{ backgroundColor: c }} />
                              ))}
                            </div>
                            <div className="flex items-center gap-1">
                              {TINT_COLORS.map((c) => (
                                <button key={c} onClick={() => setSelectedColor(c)}
                                  className={`h-4 w-4 rounded-full border-2 transition-all ${c === selectedColor ? "border-gray-500 scale-110" : "border-transparent"}`}
                                  style={{ backgroundColor: c }} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Button size="sm" onClick={() => createBoard(ws.id)} className="bg-[#5B4FCF] hover:bg-[#4a3fb8] text-white">Create</Button>
                          <button onClick={() => { setCreatingIn(null); setNewTitle(""); }}>
                            <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="shrink-0 w-52 flex flex-col gap-2">
                        <button
                          onClick={() => { setCreatingIn(ws.id); setNewTitle(""); setSelectedColor(BOARD_COLORS[0]); }}
                          className="w-full h-20 rounded-xl bg-card/60 border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-all duration-200"
                        >
                          <Plus className="h-4 w-4 mr-1" /> New board
                        </button>
                        <button
                          onClick={() => { setTemplatePickerWorkspaceId(ws.id); setShowTemplatePicker(true); }}
                          className="w-full h-7 rounded-lg bg-card/40 border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 flex items-center justify-center text-xs text-muted-foreground hover:text-primary transition-all duration-200 gap-1"
                        >
                          <Layers className="h-3 w-3" /> From template
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </DragDropContext>
      {/* Archive button in header */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setShowArchive(true)} className="text-gray-500 hover:text-gray-700 gap-1.5 text-xs">
          <Archive className="h-4 w-4" />
          Archive ({archivedBoards.length})
        </Button>
      </div>

      <BoardTemplatePicker
        open={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        workspaceId={templatePickerWorkspaceId}
        onSelectTemplate={(board) => {
          try { sessionStorage.removeItem(BOARDS_CACHE_KEY); } catch {}
          loadAllBoards();
          window.location.href = `/BoardView?id=${board.id}`;
        }}
      />

      {/* Archive dialog */}
      <Dialog open={showArchive} onOpenChange={setShowArchive}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-gray-500" />
              Archived Boards
            </DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search archived boards..."
              value={archiveSearch}
              onChange={e => setArchiveSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {filteredArchived.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              {archivedBoards.length === 0 ? "No archived boards yet." : "No boards match your search."}
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filteredArchived.map(board => (
                <div key={board.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/50">
                  <div className="h-8 w-8 rounded shrink-0" style={{ backgroundColor: board.background_color || "#0079BF" }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{board.title}</p>
                    {board.archived_at && (
                      <p className="text-xs text-gray-400">Archived {new Date(board.archived_at).toLocaleDateString()}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => restoreBoard(board)} className="gap-1.5 shrink-0">
                    <ArchiveRestore className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

const AVATAR_COLORS = ["#0079BF", "#5B4FCF", "#E76F51", "#2A9D8F", "#E9C46A", "#F4A261", "#8B5CF6", "#EC4899"];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initialsOf(name) {
  return (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const BoardTile = memo(function BoardTile({ board, progress, assignees, onToggleStar, workspaces, currentWorkspaceId, onMove, onArchive }) {
  const otherWorkspaces = (workspaces || []).filter((w) => w.id !== currentWorkspaceId);

  return (
    <div className="relative group">
      <Link
        to={createPageUrl("BoardView") + `?id=${board.id}`}
        className="h-28 rounded-xl bg-card border border-border flex flex-row overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
      >
        <div className="w-[3px] h-full rounded-l-xl shrink-0" style={{ backgroundColor: board.background_color || "#0079BF" }} />
        <div className="p-3 flex-1 min-w-0 flex flex-col justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-sm line-clamp-2 text-foreground tracking-tight">{board.title}</span>
            {progress && progress.total > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {progress.completed} / {progress.total} done
                </span>
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(progress.completed / progress.total) * 100}%`,
                      backgroundColor: board.background_color || "#0079BF",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400 min-w-0 truncate">
              {(board.list_count > 0 || board.card_count > 0) && (
                <>
                  {board.list_count > 0 && <span>{board.list_count} list{board.list_count !== 1 ? "s" : ""}</span>}
                  {board.list_count > 0 && board.card_count > 0 && <span>·</span>}
                  {board.card_count > 0 && <span>{board.card_count} card{board.card_count !== 1 ? "s" : ""}</span>}
                </>
              )}
              {board.updated_date && (
                <span className="text-muted-foreground/70" title={`Updated ${timeAgo(board.updated_date)}`}>· {timeAgo(board.updated_date)}</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {assignees && assignees.length > 0 && (
                <div className="flex items-center mr-1">
                  {assignees.slice(0, 3).map((a, i) => (
                    <div
                      key={a.email}
                      title={a.name}
                      className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-2 ring-card"
                      style={{ backgroundColor: avatarColor(a.name), marginLeft: i === 0 ? 0 : -6 }}
                    >
                      {initialsOf(a.name)}
                    </div>
                  ))}
                  {assignees.length > 3 && (
                    <div
                      className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold text-muted-foreground bg-muted ring-2 ring-card"
                      style={{ marginLeft: -6 }}
                    >
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>
              )}
              {otherWorkspaces.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="hidden group-hover:flex p-0.5 rounded hover:bg-muted"
                      onClick={(e) => e.preventDefault()}
                    >
                      <FolderInput className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {otherWorkspaces.map((ws) => (
                      <DropdownMenuItem key={ws.id} onClick={() => onMove(board, ws.id)}>
                        Move to: {ws.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {onArchive && (
                <button
                  className="hidden group-hover:flex p-0.5 rounded hover:bg-muted"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(board); }}
                  title="Archive board"
                >
                  <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              <button onClick={(e) => onToggleStar(e, board)} className="p-0.5 rounded hover:bg-muted">
                <Star className="h-4 w-4" fill={board.is_starred ? "#e6c60d" : "transparent"} stroke={board.is_starred ? "#e6c60d" : "#999"} />
              </button>
            </div>
          </div>
        </div>
      </Link>


    </div>
  );
});