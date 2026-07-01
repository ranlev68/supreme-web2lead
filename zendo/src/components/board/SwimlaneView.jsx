import { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import BoardCard from "@/components/board/BoardCard";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Priority lanes (default) ────────────────────────────────────────────────
const PRIORITY_LANES = [
  { key: "urgent", label: "🔴 Urgent",      dot: "bg-red-500",    border: "border-red-300",    header: "bg-red-50"    },
  { key: "high",   label: "🟠 High",        dot: "bg-orange-400", border: "border-orange-300", header: "bg-orange-50" },
  { key: "medium", label: "🟡 Medium",      dot: "bg-yellow-400", border: "border-yellow-300", header: "bg-yellow-50" },
  { key: "low",    label: "🔵 Low",         dot: "bg-blue-400",   border: "border-blue-300",   header: "bg-blue-50"   },
  { key: "none",   label: "⚪ No Priority", dot: "bg-gray-300",   border: "border-gray-200",   header: "bg-gray-50"   },
];

// ─── Due date lanes ────────────────────────────────────────────────────────
function getDueLaneKey(dueDateStr) {
  if (!dueDateStr) return "nodate";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  const days = Math.floor((due - today) / 86400000);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "week";
  return "later";
}
const DUE_LANES = [
  { key: "overdue", label: "🔴 Overdue",     dot: "bg-red-500",    border: "border-red-300",    header: "bg-red-50"    },
  { key: "today",   label: "🟠 Today",        dot: "bg-orange-400", border: "border-orange-300", header: "bg-orange-50" },
  { key: "week",    label: "🟡 This Week",    dot: "bg-yellow-400", border: "border-yellow-300", header: "bg-yellow-50" },
  { key: "later",   label: "🔵 Later",        dot: "bg-blue-400",   border: "border-blue-300",   header: "bg-blue-50"   },
  { key: "nodate",  label: "⚪ No Date",      dot: "bg-gray-300",   border: "border-gray-200",   header: "bg-gray-50"   },
];

const GROUP_OPTIONS = [
  { value: "priority", label: "Priority" },
  { value: "label",    label: "Label"    },
  { value: "due_date", label: "Due Date" },
];

// droppableId format: "lane~{laneKey}~list~{listId}"
const encodeDropId = (laneKey, listId) => `lane~${laneKey}~list~${listId}`;
const decodeDropId = (id) => {
  const [, laneKey, , listId] = id.split("~");
  return { laneKey, listId };
};

function buildLabelLanes(cards) {
  const map = new Map();
  cards.forEach(c => {
    const lbls = c.labels?.length ? c.labels : [{ color: "__none__", name: "No Label" }];
    lbls.forEach(l => { if (!map.has(l.color)) map.set(l.color, l.name || "Label"); });
  });
  return [...map.entries()].map(([color, name]) => ({
    key: color,
    label: color === "__none__" ? "⚪ No Label" : name,
    dot: "",
    border: "border-gray-200",
    header: "bg-gray-50",
    color: color === "__none__" ? undefined : color,
  }));
}

export default function SwimlaneView({ cards, lists, onCardClick, onRefresh, readOnly, labelDefinitions, enableTimeTracking }) {
  const sortedLists = useMemo(() => [...lists].sort((a, b) => a.position - b.position), [lists]);
  const [localCards, setLocalCards] = useState(cards);
  const [groupBy, setGroupBy] = useState("priority");
  const [collapsed, setCollapsed] = useState({});

  useMemo(() => { setLocalCards(cards); }, [cards]);
  const activeCards = useMemo(() => localCards.filter(c => !c.is_archived), [localCards]);

  // Build lanes based on groupBy
  const lanes = useMemo(() => {
    if (groupBy === "priority") return PRIORITY_LANES;
    if (groupBy === "due_date") return DUE_LANES;
    if (groupBy === "label") return buildLabelLanes(activeCards);
    return PRIORITY_LANES;
  }, [groupBy, activeCards]);

  const getLaneKey = (card) => {
    if (groupBy === "priority") return card.priority || "none";
    if (groupBy === "due_date") return getDueLaneKey(card.due_date);
    if (groupBy === "label") {
      if (!card.labels?.length) return "__none__";
      return card.labels[0].color;
    }
    return "none";
  };

  const getCardsForLaneAndList = (laneKey, listId) =>
    activeCards.filter(c => getLaneKey(c) === laneKey && c.list_id === listId)
      .sort((a, b) => a.position - b.position);

  const laneCounts = useMemo(() => {
    const counts = {};
    lanes.forEach(lane => {
      counts[lane.key] = activeCards.filter(c => getLaneKey(c) === lane.key).length;
    });
    return counts;
  }, [lanes, activeCards, groupBy]);

  const toggleCollapse = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const onDragEnd = async (result) => {
    if (!result.destination || readOnly) return;
    const { draggableId, source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const src = decodeDropId(source.droppableId);
    const dst = decodeDropId(destination.droppableId);
    const card = activeCards.find(c => c.id === draggableId);
    if (!card) return;

    const updates = {};
    if (groupBy === "priority") {
      if (dst.laneKey !== src.laneKey) updates.priority = dst.laneKey === "none" ? null : dst.laneKey;
    }
    if (dst.listId !== src.listId) updates.list_id = dst.listId;

    const updatedCard = { ...card, ...updates };
    setLocalCards(prev => prev.map(c => c.id === draggableId ? updatedCard : c));
    if (Object.keys(updates).length > 0) {
      await base44.entities.Card.update(draggableId, updates);
      onRefresh?.();
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4">
      {/* Group by toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500 font-medium shrink-0">Group by</span>
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="h-7 w-32 text-xs bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
      <div className="min-w-max">
        {/* Header row with list names */}
        <div className="flex gap-2 mb-2 sticky top-0 z-10 bg-transparent">
          <div className="w-36 shrink-0" />
          {sortedLists.map(list => (
            <div key={list.id} className="w-56 shrink-0 bg-white/80 backdrop-blur rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-200 text-center truncate">
              {list.title}
            </div>
          ))}
        </div>

        {/* Swimlane rows */}
        {lanes.map(lane => {
          const count = laneCounts[lane.key] ?? 0;
          const isCollapsed = collapsed[lane.key];
          return (
            <div key={lane.key} className={`flex gap-2 mb-3 rounded-xl border ${lane.border} overflow-hidden`}>
              {/* Lane header — clickable to collapse */}
              <button
                onClick={() => toggleCollapse(lane.key)}
                className={`w-36 shrink-0 ${lane.header} flex flex-col items-center justify-center gap-1 p-3 border-r ${lane.border} hover:brightness-95 transition-all`}
              >
                {lane.color ? (
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: lane.color }} />
                ) : (
                  <span className={`h-2.5 w-2.5 rounded-full ${lane.dot}`} />
                )}
                <span className="text-xs font-bold text-gray-700 text-center leading-tight">
                  {lane.label.replace(/^.+\s/, "")}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-white/60 px-1.5 py-0.5 rounded-full">
                  {count} card{count !== 1 ? "s" : ""}
                </span>
                {isCollapsed
                  ? <ChevronRight className="h-3 w-3 text-gray-400 mt-0.5" />
                  : <ChevronDown className="h-3 w-3 text-gray-400 mt-0.5" />
                }
              </button>

              {/* Columns — hidden when collapsed */}
              {!isCollapsed && (
                <div className="flex gap-2 p-2 flex-1">
                  {sortedLists.map(list => {
                    const laneCards = getCardsForLaneAndList(lane.key, list.id);
                    const droppableId = encodeDropId(lane.key, list.id);
                    return (
                      <Droppable droppableId={droppableId} key={droppableId}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`w-56 shrink-0 min-h-[60px] rounded-lg transition-colors ${snapshot.isDraggingOver ? "bg-blue-50 border border-dashed border-blue-300" : ""}`}
                          >
                            {laneCards.length === 0 && !snapshot.isDraggingOver ? (
                              <div className="h-full min-h-[50px] rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
                                <span className="text-[10px] text-gray-300">No cards</span>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {laneCards.map((card, idx) => (
                                  <Draggable key={card.id} draggableId={card.id} index={idx} isDragDisabled={readOnly}>
                                    {(dragProvided, dragSnapshot) => (
                                      <div
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        {...dragProvided.dragHandleProps}
                                        className={dragSnapshot.isDragging ? "opacity-80 rotate-1 shadow-lg" : ""}
                                      >
                                        <BoardCard
                                          card={card}
                                          index={idx}
                                          listId={list.id}
                                          onClick={() => onCardClick(card)}
                                          onRefresh={onRefresh}
                                          readOnly={readOnly}
                                          labelDefinitions={labelDefinitions}
                                          enableTimeTracking={enableTimeTracking}
                                          disableDrag
                                          isDone={/done/i.test(list.title)}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>
              )}

              {/* Collapsed placeholder */}
              {isCollapsed && (
                <div className="flex-1 flex items-center px-3">
                  <span className="text-xs text-gray-400 italic">Collapsed — {count} card{count !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </DragDropContext>
    </div>
  );
}