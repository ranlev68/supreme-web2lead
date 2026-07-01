import moment from "moment";
import { Plus, CheckCircle2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarMonthView({ cards, lists, onCardClick, onCardCreated, onCardUpdate, boardId, current, holidayMap = {} }) {
  const [creatingOnDay, setCreatingOnDay] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [saving, setSaving] = useState(false);
  // Optimistic overrides during/after drag — keyed by card id
  const [optimisticDates, setOptimisticDates] = useState({});
  const isDragging = useRef(false);

  const startDay = current.clone().startOf("month").startOf("week");
  const endDay = current.clone().endOf("month").endOf("week");
  const days = [];
  let d = startDay.clone();
  while (d.isSameOrBefore(endDay, "day")) { days.push(d.clone()); d.add(1, "day"); }

  const listMap = lists.reduce((acc, l) => { acc[l.id] = l.title; return acc; }, {});

  // Merge optimistic overrides into cards for display
  const displayCards = cards.map(c => optimisticDates[c.id] !== undefined ? { ...c, due_date: optimisticDates[c.id] } : c);

  const getCardsForDay = (day) =>
    displayCards.filter(c => c.due_date && moment(c.due_date).isSame(day, "day"))
      .sort((a, b) => (a.calendarIndex ?? a.position ?? 0) - (b.calendarIndex ?? b.position ?? 0) || a.id.localeCompare(b.id));

  const openCreate = (day) => {
    setCreatingOnDay(day.format("YYYY-MM-DD"));
    setNewTitle("");
    setSelectedListId(lists[0]?.id || "");
  };

  const cancelCreate = () => { setCreatingOnDay(null); setNewTitle(""); };

  const handleCreate = async () => {
    if (!newTitle.trim() || !selectedListId) return;
    setSaving(true);
    try {
      const maxPos = cards.filter(c => c.list_id === selectedListId).reduce((m, c) => Math.max(m, c.position || 0), 0);
      await base44.entities.Card.create({ title: newTitle.trim(), list_id: selectedListId, board_id: boardId, due_date: creatingOnDay, position: maxPos + 1 });
      cancelCreate();
      onCardCreated?.();
    } catch (err) {
      console.error(err);
      alert("Couldn't create card: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const onDragStart = () => { isDragging.current = true; };

  const onDragEnd = (result) => {
    isDragging.current = false;
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
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day headers */}
      <div className="shrink-0 grid grid-cols-7 border-b">
        {DAYS.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">{day}</div>
        ))}
      </div>
      {/* Days grid */}
      <div className="overflow-auto flex-1">
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const isToday = day.isSame(moment(), "day");
              const isCurrentMonth = day.isSame(current, "month");
              const dayCards = getCardsForDay(day);
              const dateStr = day.format("YYYY-MM-DD");
              const isCreating = creatingOnDay === dateStr;
              return (
                <Droppable droppableId={dateStr} key={dateStr}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[100px] p-1.5 border-r border-b group relative transition-colors ${snapshot.isDraggingOver ? "bg-blue-50" : isCurrentMonth ? "bg-white" : "bg-gray-50"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium ${isToday ? "bg-[#0079BF] text-white" : isCurrentMonth ? "text-gray-700" : "text-gray-400"}`}>
                            {day.date()}
                          </span>
                          {holidayMap[dateStr] && (
                            <span className="text-[9px] text-gray-400 truncate leading-tight" title={holidayMap[dateStr]}>
                              🏛 {holidayMap[dateStr]}
                            </span>
                          )}
                        </div>
                        {isCurrentMonth && !isCreating && lists.length > 0 && (
                          <button onClick={() => openCreate(day)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 shrink-0">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {dayCards.map((card, index) => {
                          const label = (card.labels || [])[0];
                          const listName = listMap[card.list_id];
                          return (
                            <Draggable key={card.id} draggableId={card.id} index={index} isDragDisabled={!!(card.is_archived || card.completed)}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  onClick={() => !dragSnapshot.isDragging && onCardClick(card)}
                                  className={`rounded overflow-hidden relative ${card.is_archived ? "opacity-40 cursor-default" : card.completed ? "cursor-pointer" : "cursor-grab"} ${dragSnapshot.isDragging ? "opacity-80 shadow-lg rotate-1" : ""}`}
                                >
                                  <div className="text-[11px] font-medium px-1.5 py-0.5 truncate text-white" style={{ backgroundColor: label?.color || "#0079BF" }}>
                                    {card.title}
                                  </div>
                                  {card.completed && !card.is_archived && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
                                      <CheckCircle2 className="h-4 w-4 text-white drop-shadow" />
                                    </div>
                                  )}
                                  {listName && <div className="text-[10px] px-1.5 py-0.5 text-gray-400 bg-gray-100 truncate">{listName}</div>}
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                      {isCreating && (
                        <div className="mt-1 bg-white border border-blue-300 rounded shadow-md p-1.5 z-10">
                          <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") cancelCreate(); }}
                            placeholder="Card title..." className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 mb-1" />
                          {lists.length > 1 && (
                            <select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}
                              className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 mb-1 bg-white">
                              {lists.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                            </select>
                          )}
                          <div className="flex items-center gap-1">
                            <button onClick={handleCreate} disabled={saving || !newTitle.trim()}
                              className="flex-1 text-[11px] bg-[#0079BF] hover:bg-[#026aa7] text-white rounded px-1.5 py-0.5 font-medium disabled:opacity-50">
                              {saving ? "..." : "Add"}
                            </button>
                            <button onClick={cancelCreate} className="p-0.5 hover:bg-gray-100 rounded text-gray-400 text-xs">✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}