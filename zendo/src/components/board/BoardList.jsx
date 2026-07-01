import { useState } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { MoreHorizontal, Plus, X, Sparkles, Palette, ChevronDown, ChevronRight } from "lucide-react";
import TemplatePickerPopover from "./TemplatePickerPopover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import BoardCard from "./BoardCard";
import ImageToCard from "./ImageToCard";
import { motion, AnimatePresence } from "framer-motion";

const LIST_COLORS = [
  // Vibrant
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  "#6b7280", "#0079BF",
  // Pastel
  "#fca5a5", "#fdba74", "#fde68a", "#86efac",
  "#67e8f9", "#93c5fd", "#c4b5fd", "#f9a8d4",
  "#d1d5db", "#a5f3fc",
  // Soft muted pastels
  "#fecdd3", "#fed7aa", "#fef9c3", "#bbf7d0",
  "#cffafe", "#bfdbfe", "#ddd6fe", "#fbcfe8",
];

const isDoneList = (title) => /done/i.test(title);

const COLUMN_BORDER_COLORS = ["#6b7280", "#14b8a6", "#f97316", "#8b5cf6", "#3b82f6", "#ec4899", "#22c55e", "#eab308"];

export default function BoardList({ list, cards, index, boardId, onRefresh, onCardAdded, onCardClick, onCardUpdate, readOnly = false, labelDefinitions = [], enableTimeTracking = false, currentUser = null, priorityFilter = "all", assigneeFilter = null, showAgendaToggle = false, customFieldDefinitions = [] }) {
  const doneList = isDoneList(list.title);
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [listTitle, setListTitle] = useState(list.title);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [listColor, setListColor] = useState(list.color || null);
  const [collapsed, setCollapsed] = useState(false);

  const saveColor = async (color) => {
    const newColor = (color === null || color === listColor) ? null : color;
    setListColor(newColor);
    await base44.entities.TaskList.update(list.id, { color: newColor || "" });
  };

  const generateAIContent = async (cardId, title) => {
    setGeneratingAI(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a project management assistant. A new task card titled "${title}" has been created in a list called "${list.title}". 
      Generate a helpful description and a practical checklist of actionable steps to complete this task.
      Be concise and practical. The checklist should have 3-6 items.`,
      response_json_schema: {
        type: "object",
        properties: {
          description: { type: "string" },
          checklist_items: { type: "array", items: { type: "string" } },
        },
      },
    });

    const checklistItems = (result.checklist_items || []).map((text) => ({
      id: crypto.randomUUID(),
      text,
      checked: false,
    }));

    await base44.entities.Card.update(cardId, {
      description: result.description || "",
      checklists: checklistItems.length > 0
        ? [{ id: crypto.randomUUID(), title: "Checklist", items: checklistItems }]
        : [],
    });

    setGeneratingAI(false);
    onRefresh();
  };

  const addCard = async (withAI = false) => {
    if (!newCardTitle.trim()) return;
    const title = newCardTitle.trim();
    const maxPos = cards.length > 0 ? Math.max(...cards.map((c) => c.position)) : 0;
    const created = await base44.entities.Card.create({
      title,
      list_id: list.id,
      board_id: boardId,
      position: maxPos + 1000,
    });
    setNewCardTitle("");
    setAddingCard(false);
    if (onCardAdded) onCardAdded(created);
    if (withAI) generateAIContent(created.id, title);
  };

  const deleteList = async () => {
    await Promise.all(cards.map((c) => base44.entities.Card.delete(c.id)));
    await base44.entities.TaskList.delete(list.id);
    onRefresh();
  };

  const saveTitle = async () => {
    setEditingTitle(false);
    if (listTitle.trim() && listTitle !== list.title) {
      await base44.entities.TaskList.update(list.id, { title: listTitle.trim() });
      onRefresh();
    }
  };

  // All cards sorted by position — dnd indices MUST be based on this full list
  const sortedCards = [...cards].sort((a, b) => a.position - b.position);
  // Filtered only for visual display (priority filter is purely visual)
  const visibleCards = priorityFilter === "all" ? sortedCards : sortedCards.filter(c => c.priority === priorityFilter);

  return (
    <Draggable draggableId={`list-${list.id}`} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="w-[272px] shrink-0"
        >
          <div
            className={`bg-card border border-border rounded-2xl shadow-md flex flex-col backdrop-blur-sm overflow-hidden ${collapsed ? "" : "max-h-[calc(100vh-140px)]"}`}
            style={{ borderTop: `3px solid ${listColor || COLUMN_BORDER_COLORS[index % COLUMN_BORDER_COLORS.length]}` }}
          >
            {/* Color accent bar — kept for custom colors on top of the border */}
            {listColor && (
              <div className="h-0 w-full shrink-0" />
            )}
            {/* Header */}
            <div
              {...provided.dragHandleProps}
              className="px-3 py-2.5 flex items-center justify-between border-b border-border/60"
            >
              <button
                onClick={() => setCollapsed(v => !v)}
                className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0 mr-1"
                title={collapsed ? "Expand list" : "Collapse list"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {editingTitle ? (
                <Input
                  autoFocus
                  value={listTitle}
                  onChange={(e) => setListTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                  className="text-sm font-semibold bg-card h-8 border-[#0079BF] border-2"
                />
              ) : (
                <h3
                  className="text-sm font-bold text-card-foreground px-1.5 cursor-pointer flex-1 tracking-tight"
                  onClick={() => setEditingTitle(true)}
                >
                  {list.title}
                </h3>
              )}
              {!readOnly && (
                <DropdownMenu onOpenChange={(open) => { if (!open) setShowColorPicker(false); }}>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem
                      onSelect={(e) => { e.preventDefault(); setShowColorPicker(v => !v); }}
                      className="gap-2"
                    >
                      <Palette className="h-4 w-4" />
                      List color
                      {listColor && (
                        <span className="ml-auto h-3 w-3 rounded-full border border-border/60" style={{ backgroundColor: listColor }} />
                      )}
                    </DropdownMenuItem>
                    {showColorPicker && (
                      <div className="px-2 pb-2 pt-1">
                        <div className="grid grid-cols-6 gap-1.5">
                          {LIST_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => saveColor(color)}
                              className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                              style={{
                                backgroundColor: color,
                                borderColor: listColor === color ? "#1a1a2e" : "transparent",
                              }}
                            />
                          ))}
                          {listColor && (
                            <button
                              onClick={() => saveColor(null)}
                              className="h-6 w-6 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground text-[10px]"
                              title="Remove color"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={deleteList} className="text-red-600">
                      Delete list
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Cards */}
            {collapsed && <div className="px-3 py-1 text-xs text-muted-foreground border-t border-border/60">{sortedCards.length} card{sortedCards.length !== 1 ? "s" : ""}</div>}
            <Droppable droppableId={list.id} type="card">
              {(dropProvided, snapshot) => (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  className={`flex-1 overflow-y-auto px-2 pb-2 pt-1 min-h-[4px] space-y-2 ${
                  snapshot.isDraggingOver ? "bg-primary/5" : ""
                  } rounded-lg transition-colors duration-150 ${collapsed ? "hidden" : ""}`}
                >
                  {sortedCards.length === 0 && !snapshot.isDraggingOver && (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mb-2">
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">No cards yet</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">Drop one here or add a card</p>
                    </div>
                  )}
                  {sortedCards.map((card, i) => (
                    <Draggable key={card.id} draggableId={card.id} index={i}>
                      {(cardProvided, cardSnapshot) => {
                        const isHidden = !cardSnapshot.isDragging && (
                          (priorityFilter !== "all" && card.priority !== priorityFilter) ||
                          (assigneeFilter && card.assigned_to !== assigneeFilter)
                        );
                        const child = (
                          <div
                            ref={cardProvided.innerRef}
                            {...cardProvided.draggableProps}
                            {...cardProvided.dragHandleProps}
                            style={{
                              ...cardProvided.draggableProps.style,
                              opacity: cardSnapshot.isDragging ? 0.95 : 1,
                              display: isHidden ? "none" : undefined,
                              touchAction: "none",
                            }}
                          >
                            <BoardCard card={card} onClick={() => onCardClick(card)} onCardUpdate={onCardUpdate} onRefresh={onRefresh} readOnly={readOnly} labelDefinitions={labelDefinitions} enableTimeTracking={enableTimeTracking} currentUser={currentUser} isDone={doneList} showAgendaToggle={showAgendaToggle} customFieldDefinitions={customFieldDefinitions} />
                          </div>
                        );
                        // Portal the dragging card to document.body so it escapes overflow:hidden/auto stacking contexts
                        if (cardSnapshot.isDragging) {
                          return createPortal(child, document.body);
                        }
                        return child;
                      }}
                    </Draggable>
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>

            {/* AI generating indicator */}
            {generatingAI && (
              <div className="mx-1.5 mb-1 flex items-center gap-1.5 text-[11px] text-[#0079BF] bg-blue-50 border border-blue-100 rounded px-2 py-1">
                <Sparkles className="h-3 w-3 animate-pulse shrink-0" />
                AI is generating description & checklist...
              </div>
            )}

            {/* Add card */}
            {!readOnly && !collapsed && (
              <div className="px-1.5 pb-2 pt-1">
                <AnimatePresence mode="wait">
                {addingCard ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <textarea
                      autoFocus
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(); }
                      }}
                      placeholder="Enter a title for this card..."
                      className="w-full bg-card text-card-foreground rounded-lg shadow-sm border border-border p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0079BF] min-h-[54px]"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Button size="sm" onClick={() => addCard(false)} className="bg-[#0079BF] hover:bg-[#026AA7] text-white">
                        Add card
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => addCard(true)} className="text-[#0079BF] border-[#0079BF] hover:bg-blue-50 gap-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        Add with AI
                      </Button>
                      <button onClick={() => { setAddingCard(false); setNewCardTitle(""); }}>
                        <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1"
                  >
                    <button
                      onClick={() => setAddingCard(true)}
                      className="flex items-center gap-1 flex-1 text-sm text-muted-foreground hover:bg-primary/5 hover:text-primary rounded-lg px-2 py-1.5 transition-colors duration-150"
                    >
                      <Plus className="h-4 w-4" />
                      Add a card
                    </button>
                    <TemplatePickerPopover
                      boardId={boardId}
                      listId={list.id}
                      cards={cards}
                      onCardAdded={onCardAdded}
                      onCardClick={onCardClick}
                    />
                    <ImageToCard list={list} boardId={boardId} cards={cards} onRefresh={onRefresh} />
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}