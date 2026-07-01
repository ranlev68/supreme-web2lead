import { useState, useEffect } from "react";
import { CheckSquare, Trash2, X, Plus, Pencil, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const renderWithLinks = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#0079BF] underline hover:opacity-80 break-all">{part}</a>
      : part
  );
};

// Checklist component
export default function Checklist({ checklist, onDelete, onChange, onToggleItem, readOnly = false }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(checklist.title);
  const [newItemText, setNewItemText] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemText, setEditingItemText] = useState("");

  useEffect(() => {
    setTitleDraft(checklist.title);
  }, [checklist.title]);

  const saveTitle = () => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft.trim() !== checklist.title) {
      onChange({ ...checklist, title: titleDraft.trim() });
    }
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    const item = { id: crypto.randomUUID(), text: newItemText.trim(), checked: false };
    onChange({ ...checklist, items: [...(checklist.items || []), item] });
    setNewItemText("");
  };

  const toggleItem = (itemId) => {
    const item = checklist.items.find((it) => it.id === itemId);
    const items = checklist.items.map((it) =>
      it.id === itemId ? { ...it, checked: !it.checked } : it
    );
    onChange({ ...checklist, items });
    if (onToggleItem) onToggleItem(item, !item.checked);
  };

  const deleteItem = (itemId) => {
    const items = checklist.items.filter((it) => it.id !== itemId);
    onChange({ ...checklist, items });
  };

  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditingItemText(item.text);
  };

  const saveEditItem = (itemId) => {
    if (editingItemText.trim()) {
      const items = checklist.items.map(it => it.id === itemId ? { ...it, text: editingItemText.trim() } : it);
      onChange({ ...checklist, items });
    }
    setEditingItemId(null);
    setEditingItemText("");
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditingItemText("");
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    const items = [...(checklist.items || [])];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    onChange({ ...checklist, items });
  };

  const total = checklist.items?.length || 0;
  const done = checklist.items?.filter((it) => it.checked).length || 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <CheckSquare className="h-5 w-5 text-gray-500 shrink-0" />
        {editingTitle && !readOnly ? (
          <Input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") { setTitleDraft(checklist.title); setEditingTitle(false); }
            }}
            className="h-7 text-sm font-semibold flex-1 bg-white"
          />
        ) : (
          <span
            className={`text-sm font-semibold text-gray-700 flex-1 rounded px-1 -mx-1 flex items-center gap-1 group/title ${!readOnly ? "cursor-pointer hover:bg-gray-200" : ""}`}
            onClick={() => !readOnly && setEditingTitle(true)}
          >
            {checklist.title}
            {!readOnly && <Pencil className="h-3 w-3 opacity-0 group-hover/title:opacity-60 ml-1" />}
          </span>
        )}
        {!readOnly && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-200 transition-colors shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-2 ml-7">
        <span className="text-[11px] text-gray-500 w-7 shrink-0">{pct}%</span>
        <Progress value={pct} className="h-2 flex-1" />
      </div>

      {/* Items */}
      <div className="space-y-1">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="checklist-items">
            {(dropProvided) => (
              <div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="space-y-1">
                {checklist.items?.map((item, i) => (
                  <Draggable key={item.id} draggableId={item.id} index={i} isDragDisabled={readOnly}>
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        style={dragProvided.draggableProps.style}
                        className={`flex items-center gap-2 group/item rounded ml-7 ${dragSnapshot.isDragging ? "bg-gray-100 shadow" : ""}`}
                      >
                        {!readOnly ? (
                          <span {...dragProvided.dragHandleProps} className="cursor-grab shrink-0 text-gray-300 hover:text-gray-500 transition-colors">
                            <GripVertical className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="shrink-0 w-3.5" />
                        )}
                        <input
                          type="checkbox"
                          checked={item.checked}
                          disabled={readOnly}
                          onChange={() => !readOnly && toggleItem(item.id)}
                          className="h-4 w-4 accent-[#0079BF] cursor-pointer shrink-0 disabled:cursor-default"
                        />
                        {!readOnly && editingItemId === item.id ? (
                          <div className="flex-1 flex flex-col gap-1">
                            <Input
                              autoFocus
                              value={editingItemText}
                              onChange={(e) => setEditingItemText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); saveEditItem(item.id); }
                                if (e.key === "Escape") cancelEditItem();
                              }}
                              className="h-7 text-sm bg-white"
                            />
                            <div className="flex gap-1">
                              <Button type="button" size="sm" onClick={() => saveEditItem(item.id)} className="bg-[#0079BF] hover:bg-[#026AA7] text-white h-6 text-xs px-2">Save</Button>
                              <button type="button" onClick={cancelEditItem}><X className="h-4 w-4 text-gray-500" /></button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span
                              className={`text-sm flex-1 ${item.checked ? "line-through text-gray-400" : "text-gray-700"} ${!readOnly ? "cursor-pointer hover:text-[#0079BF]" : ""}`}
                              onClick={() => !readOnly && startEditItem(item)}
                            >
                              {renderWithLinks(item.text)}
                            </span>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => deleteItem(item.id)}
                                className="opacity-0 group-hover/item:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-0.5 rounded"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Add item */}
        {!readOnly && (
          <div className="ml-7">
            {addingItem ? (
              <div className="mt-2 space-y-1.5">
                <Input
                  autoFocus
                  placeholder="Add an item..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addItem(); }
                    if (e.key === "Escape") { e.preventDefault(); setAddingItem(false); setNewItemText(""); }
                  }}
                  className="h-8 text-sm bg-white"
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={addItem} className="bg-[#0079BF] hover:bg-[#026AA7] text-white h-7 text-xs">
                    Add
                  </Button>
                  <button type="button" onClick={() => { setAddingItem(false); setNewItemText(""); }}>
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingItem(true)}
                className="mt-1 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 bg-gray-200/70 hover:bg-gray-300/70 rounded px-2 py-1 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add an item
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}