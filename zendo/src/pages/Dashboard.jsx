import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardGreeting from "@/components/dashboard/DashboardGreeting";
import DashboardFocusCards from "@/components/dashboard/DashboardFocusCards";
import DashboardMyWork from "@/components/dashboard/DashboardMyWork";
import DashboardRecentBoards from "@/components/dashboard/DashboardRecentBoards";
import DashboardUpdates from "@/components/dashboard/DashboardUpdates";
import DashboardTeamPulse from "@/components/dashboard/DashboardTeamPulse";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import CardDetailModal from "@/components/board/CardDetailModal";
import BoardTemplatePicker from "@/components/board/BoardTemplatePicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

function getDueDays(dueDateStr) {
  if (!dueDateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  return Math.floor((due - today) / 86400000);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedCard, setSelectedCard] = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newCardTitle, setNewCardTitle] = useState("");
  const [commandQuery, setCommandQuery] = useState("");

  const { data: allCards = [], isLoading: cardsLoading, refetch: refetchCards } = useQuery({
    queryKey: ["dashboard-cards", user?.email],
    queryFn: () => base44.entities.Card.filter({ assigned_to: user?.email, is_archived: false }),
    enabled: !!user?.email,
  });

  const { data: boards = [], isLoading: boardsLoading, refetch: refetchBoards } = useQuery({
    queryKey: ["dashboard-boards", user?.email],
    queryFn: async () => {
      const all = await base44.entities.Board.filter({ is_archived: false }, "-updated_date", 50);
      return all.filter(b => b.created_by === user?.email);
    },
    enabled: !!user?.email,
  });

  const { data: lists = [] } = useQuery({
    queryKey: ["dashboard-lists"],
    queryFn: () => base44.entities.TaskList.list(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: () => base44.entities.Activity.list("-created_date", 20),
  });

  const boardMap = useMemo(() => Object.fromEntries(boards.map(b => [b.id, b])), [boards]);
  const listMap = useMemo(() => Object.fromEntries(lists.map(l => [l.id, l])), [lists]);

  const stats = useMemo(() => {
    const today = allCards.filter(c => getDueDays(c.due_date) === 0 && !c.completed);
    const overdue = allCards.filter(c => { const d = getDueDays(c.due_date); return d !== null && d < 0 && !c.completed; });
    const waiting = allCards.filter(c => !c.completed && c.priority === "urgent");
    const recentlyUpdated = allCards.filter(c => {
      if (!c.updated_date) return false;
      const diff = (new Date() - new Date(c.updated_date)) / 3600000;
      return diff <= 24;
    });
    return { today, overdue, waiting, recentlyUpdated };
  }, [allCards]);

  const recentBoards = useMemo(() => boards.filter(b => !b.is_archived && b.created_by === user?.email).slice(0, 6), [boards, user]);

  const selectedBoard = selectedCard ? boardMap[selectedCard.board_id] : null;
  const selectedList = selectedCard ? listMap[selectedCard.list_id] : null;

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return;
    const board = await base44.entities.Board.create({ title: newBoardTitle.trim(), background_color: "#0079BF" });
    setNewBoardTitle("");
    setShowCreateBoard(false);
    refetchBoards();
    window.location.href = `/BoardView?id=${board.id}`;
  };

  const handleCreateCard = async () => {
    if (!newCardTitle.trim() || boards.length === 0) return;
    const firstBoard = boards[0];
    const firstList = lists.find(l => l.board_id === firstBoard.id);
    if (!firstList) return;
    await base44.entities.Card.create({
      title: newCardTitle.trim(),
      board_id: firstBoard.id,
      list_id: firstList.id,
      position: 0,
      assigned_to: user?.email,
      assigned_to_name: user?.full_name,
    });
    setNewCardTitle("");
    setShowCreateCard(false);
    refetchCards();
  };

  return (
    <div className="flex h-full min-h-screen bg-slate-50">
      {/* Sidebar */}
      <DashboardSidebar boards={boards} user={user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Command Bar */}
        <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
          <div className="flex-1 max-w-xl mx-auto relative">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400" />
            <input
              value={commandQuery}
              onChange={e => setCommandQuery(e.target.value)}
              placeholder="Ask AI or type a command..."
              className="w-full h-9 pl-9 pr-4 text-sm bg-slate-100 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
            <DashboardGreeting user={user} />
            <DashboardFocusCards stats={stats} cardsLoading={cardsLoading} />
            <DashboardMyWork
              cards={allCards}
              boardMap={boardMap}
              listMap={listMap}
              onCardClick={setSelectedCard}
              loading={cardsLoading}
            />
            <DashboardRecentBoards boards={recentBoards} loading={boardsLoading} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardUpdates activities={activities} boardMap={boardMap} />
              <DashboardTeamPulse boards={recentBoards} cards={allCards} />
            </div>
            <DashboardQuickActions
              onCreateBoard={() => setShowCreateBoard(true)}
              onCreateCard={() => setShowCreateCard(true)}
              onUseTemplate={() => setShowTemplatePicker(true)}
            />
          </div>
        </div>
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          listTitle={selectedList?.title || ""}
          open={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={(updated) => updated && setSelectedCard({ ...selectedCard, ...updated })}
          onDelete={() => setSelectedCard(null)}
          currentUser={user}
        />
      )}

      {/* Template Picker */}
      <BoardTemplatePicker
        open={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        workspaceId={null}
        onSelectTemplate={(board) => {
          setShowTemplatePicker(false);
          refetchBoards();
          window.location.href = `/BoardView?id=${board.id}`;
        }}
      />

      {/* Create Board Dialog */}
      <Dialog open={showCreateBoard} onOpenChange={setShowCreateBoard}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create a new board</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              autoFocus
              placeholder="Board title..."
              value={newBoardTitle}
              onChange={e => setNewBoardTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateBoard()}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowCreateBoard(false)}>Cancel</Button>
              <Button onClick={handleCreateBoard} disabled={!newBoardTitle.trim()}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Card Dialog */}
      <Dialog open={showCreateCard} onOpenChange={setShowCreateCard}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create a new card</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            {boards.length === 0 ? (
              <p className="text-sm text-slate-500">You need at least one board with a list to create a card.</p>
            ) : (
              <>
                <p className="text-xs text-slate-500">Card will be added to: <strong>{boards[0]?.title}</strong></p>
                <Input
                  autoFocus
                  placeholder="Card title..."
                  value={newCardTitle}
                  onChange={e => setNewCardTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreateCard()}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setShowCreateCard(false)}>Cancel</Button>
                  <Button onClick={handleCreateCard} disabled={!newCardTitle.trim()}>Create</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}