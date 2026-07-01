import moment from "moment";
import { Plus, CheckCircle2, X } from "lucide-react";
import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function CalendarDayView({ cards, lists, onCardClick, onCardCreated, onCardUpdate, boardId, current, numDays = 1, holidayMap = {} }) {
  const [creating, setCreating] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [saving, setSaving] = useState(false);
  // Optimistic overrides during/after drag — keyed by card id
  const [optimisticDates, setOptimisticDates] = useState({});

  const days = Array.from({ length: numDays }, (_, i) => current.clone().add(i, "day"));
  const listMap = lists.reduce((acc, l) => { acc[l.id] = l.title; return acc; }, {});

  // Merge optimistic overrides into cards for display
  const displayCards = cards.map(c => optimisticDates[c.id] !== undefined ? { ...c, due_date: optimisticDates[c.id] } : c);

  const getCardsForDay = (day) =>
    displayCards
      .filter(c => c.due_date && moment(c.due_date).isSame(day, "day") && !c.is_archived)
      .sort((a, b) => (a.calendarIndex ?? a.position ?? 0) - (b.calendarIndex ?? b.position ?? 0) || a.id.localeCompare(b.id));

  const openCreate = (dateStr) => {
    setCreating({ date: dateStr });
    setNewTitle("");
    setSelectedListId(lists[0]?.id || "");
  };

  const cancelCreate = () => { setCreating(null); setNewTitle(""); };

  const handleCreate = async () => {
    if (!newTitle.trim() || !selectedListId) return;
    setSaving(true);
    const maxPos = cards.filter(c => c.list_id === selectedListId).reduce((m, c) => Math.max(m, c.position || 0), 0);
    await base44.entities.Card.create({ title: newTitle.trim(), list_id: selectedListId, board_id: boardId, due_date: creating.date, position: maxPos + 1 });
    setSaving(false);
    cancelCreate();
    onCardCreated?.();
  };

  const onDragEnd = (result) => {
    const { draggableId, source, destination } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }
    const newDate = destination.droppableId;
    // Apply optimistic override immediately
    setOptimisticDates(prev => ({ ...prev, [draggableId]: newDate }));
    // Save and notify parent; clear optimistic once parent has updated
    base44.entities.Card.update(draggableId, { due_date: newDate }).then((updatedCard) => {
      onCardUpdate?.(updatedCard);
      setOptimisticDates(prev => { const next = { ...prev }; delete next[draggableId]; return next; });
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-1 overflow-hidden">
        {days.map(day => {
          const dateStr = day.format("YYYY-MM-DD");
          const isToday = day.isSame(moment(), "day");
          const isCreatingHere = creating?.date === dateStr;
          const dayCards = getCardsForDay(day);

          return (
            <div key={dateStr} className="flex flex-col flex-1 border-r min-w-0 overflow-hidden">
              {/* Day header */}
              <div className={`shrink-0 text-center py-3 border-b ${isToday ? "bg-blue-50" : "bg-white"}`}>
                <div className={`text-xs font-semibold ${isToday ? "text-[#0079BF]" : "text-gray-500"}`}>{day.format("ddd")}</div>
                <div className={`text-2xl font-bold leading-none mt-0.5 ${isToday ? "text-[#0079BF]" : "text-gray-800"}`}>{day.format("D")}</div>
                {numDays > 1 && <div className="text-[10px] text-gray-400 mt-0.5">{day.format("MMM")}</div>}
                {holidayMap[dateStr] && (
                  <div className="text-[9px] text-gray-400 mt-0.5 px-1 truncate leading-tight" title={holidayMap[dateStr]}>🏛 {holidayMap[dateStr]}</div>
                )}
              </div>

              {/* Cards column */}
              <Droppable droppableId={dateStr}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto p-2 transition-colors ${snapshot.isDraggingOver ? "bg-blue-50" : isToday ? "bg-blue-50/20" : "bg-gray-50/50"}`}
                  >
                    {dayCards.map((card, index) => {
                      const label = (card.labels || [])[0];
                      const listName = listMap[card.list_id];
                      return (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              onClick={() => { if (!dragSnapshot.isDragging) onCardClick(card); }}
                              className={`rounded overflow-hidden mb-1.5 w-full min-w-0 cursor-grab shadow-sm ${card.completed ? "opacity-60" : ""} ${dragSnapshot.isDragging ? "opacity-80 shadow-lg rotate-1" : ""}`}
                            >
                              <div className="text-xs font-medium px-2 py-1 text-white flex items-center gap-1 min-w-0" style={{ backgroundColor: label?.color || "#0079BF" }}>
                                {card.completed && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                                <span className="truncate">{card.title}</span>
                              </div>
                              {listName && <div className="text-[10px] px-2 py-0.5 text-gray-400 bg-white truncate">{listName}</div>}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}

                    {/* Inline create form */}
                    {isCreatingHere ? (
                      <div className="bg-white border border-blue-300 rounded shadow-md p-2 mt-1" onClick={e => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") cancelCreate(); }}
                          placeholder="Card title..."
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400 mb-1"
                        />
                        {lists.length > 1 && (
                          <select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded px-2 py-1 mb-1 bg-white outline-none">
                            {lists.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                          </select>
                        )}
                        <div className="flex gap-1">
                          <button onClick={handleCreate} disabled={saving || !newTitle.trim()}
                            className="flex-1 text-[11px] bg-[#0079BF] hover:bg-[#026aa7] text-white rounded px-2 py-1 disabled:opacity-50">
                            {saving ? "..." : "Add card"}
                          </button>
                          <button onClick={cancelCreate} className="text-[11px] px-2 py-1 text-gray-500 hover:bg-gray-100 rounded">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      lists.length > 0 && (
                        <button
                          onClick={() => openCreate(dateStr)}
                          className="w-full mt-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-white rounded py-1 flex items-center justify-center gap-1 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Add card
                        </button>
                      )
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}