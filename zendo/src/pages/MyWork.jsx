import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Search, Layers, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import CardDetailModal from "@/components/board/CardDetailModal";
import MyWorkCardRow from "@/components/mywork/MyWorkCardRow";

const DUE_OPTIONS = [
  { value: "all", label: "All dates" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "week", label: "Due this week" },
  { value: "none", label: "No due date" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function getDueDays(dueDateStr) {
  if (!dueDateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  return Math.floor((due - today) / 86400000);
}

function matchesDueFilter(card, filter) {
  const days = getDueDays(card.due_date);
  if (filter === "all") return true;
  if (filter === "none") return days === null;
  if (filter === "overdue") return days !== null && days < 0;
  if (filter === "today") return days === 0;
  if (filter === "week") return days !== null && days >= 0 && days <= 7;
  return true;
}

function isUrgent(card) {
  const days = getDueDays(card.due_date);
  return days !== null && days <= 7;
}

export default function MyWork() {
  const { user } = useAuth();
  const [dueFilter, setDueFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [grouped, setGrouped] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);

  const { data: allCards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ["my-work-cards", user?.email],
    queryFn: () => base44.entities.Card.filter({ assigned_to: user.email, is_archived: false }),
    enabled: !!user?.email,
  });

  const { data: boards = [] } = useQuery({
    queryKey: ["my-work-boards"],
    queryFn: () => base44.entities.Board.list(),
  });

  const { data: lists = [] } = useQuery({
    queryKey: ["my-work-lists"],
    queryFn: () => base44.entities.TaskList.list(),
  });

  const boardMap = useMemo(() => Object.fromEntries(boards.map(b => [b.id, b])), [boards]);
  const listMap = useMemo(() => Object.fromEntries(lists.map(l => [l.id, l])), [lists]);

  const filtered = useMemo(() => {
    return allCards.filter(card => {
      if (!matchesDueFilter(card, dueFilter)) return false;
      if (priorityFilter !== "all" && card.priority !== priorityFilter) return false;
      if (boardFilter !== "all" && card.board_id !== boardFilter) return false;
      if (search.trim() && !card.title?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allCards, dueFilter, priorityFilter, boardFilter, search]);

  const openCount = allCards.filter(c => !c.completed).length;

  const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

  const { needsAttentionGroup, everythingGroup } = useMemo(() => {
    const needsAttentionGroup = filtered
      .filter(c => {
        const days = getDueDays(c.due_date);
        return days !== null && days <= 7;
      })
      .sort((a, b) => {
        const da = getDueDays(a.due_date) ?? 999;
        const db = getDueDays(b.due_date) ?? 999;
        return da - db;
      });
    const attentionIds = new Set(needsAttentionGroup.map(c => c.id));
    const everythingGroup = filtered
      .filter(c => !attentionIds.has(c.id))
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 4;
        const pb = PRIORITY_ORDER[b.priority] ?? 4;
        if (pa !== pb) return pa - pb;
        const da = getDueDays(a.due_date) ?? 999;
        const db = getDueDays(b.due_date) ?? 999;
        return da - db;
      });
    return { needsAttentionGroup, everythingGroup };
  }, [filtered]);

  const selectedBoard = selectedCard ? boardMap[selectedCard.board_id] : null;
  const selectedList = selectedCard ? listMap[selectedCard.list_id] : null;

  const handleCardUpdate = (updated) => {
    if (updated && selectedCard) setSelectedCard({ ...selectedCard, ...updated });
  };

  const accessibleBoards = useMemo(() => {
    const ids = new Set(allCards.map(c => c.board_id));
    return boards.filter(b => ids.has(b.id));
  }, [allCards, boards]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">My Work</h1>
              {!cardsLoading && (
                <p className="text-xs text-muted-foreground">{openCount} open card{openCount !== 1 ? "s" : ""} across all boards</p>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search cards..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            <Select value={dueFilter} onValueChange={setDueFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DUE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={boardFilter} onValueChange={setBoardFilter}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="All boards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All boards</SelectItem>
                {accessibleBoards.map(b => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5 ml-auto">
              <Switch id="group-toggle" checked={grouped} onCheckedChange={setGrouped} className="scale-75" />
              <Label htmlFor="group-toggle" className="text-xs text-muted-foreground cursor-pointer">Group</Label>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {cardsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : allCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Layers className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-base font-semibold text-foreground">You're all caught up!</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">No cards are assigned to you right now.</p>
            <a href="/Boards" className="text-xs text-primary underline underline-offset-2">Go to your boards</a>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Layers className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No cards match your filters</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting the filters above</p>
          </div>
        ) : grouped ? (
          <>
            {needsAttentionGroup.length > 0 && (
              <CardGroup
                title="Needs Attention"
                cards={needsAttentionGroup}
                boardMap={boardMap}
                listMap={listMap}
                onCardClick={setSelectedCard}
                accent="text-red-600"
              />
            )}
            {everythingGroup.length > 0 && (
              <CardGroup
                title="Everything Else"
                cards={everythingGroup}
                boardMap={boardMap}
                listMap={listMap}
                onCardClick={setSelectedCard}
              />
            )}
          </>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {filtered.map(card => (
              <MyWorkCardRow
                key={card.id}
                card={card}
                board={boardMap[card.board_id]}
                list={listMap[card.list_id]}
                onClick={setSelectedCard}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          listTitle={selectedList?.title || ""}
          open={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleCardUpdate}
          onDelete={() => setSelectedCard(null)}
          currentUser={user}
        />
      )}
    </div>
  );
}

function CardGroup({ title, cards, boardMap, listMap, onCardClick, accent = "" }) {
  return (
    <div>
      <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${accent || "text-muted-foreground"}`}>
        {title} <span className="font-normal normal-case tracking-normal ml-1">({cards.length})</span>
      </h2>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {cards.map(card => (
          <MyWorkCardRow
            key={card.id}
            card={card}
            board={boardMap[card.board_id]}
            list={listMap[card.list_id]}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}