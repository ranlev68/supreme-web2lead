import { useState, useRef, useEffect } from "react";
import { Check, Pencil, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CardLabelPicker({ card, labelDefinitions, onUpdate, onLabelsChange }) {
  const [editingColor, setEditingColor] = useState(null);
  const [editingName, setEditingName] = useState("");
  const containerRef = useRef(null);

  const cardLabels = card.labels || [];

  const isActive = (color) => cardLabels.some((l) => l.color === color);

  const toggle = async (def) => {
    const active = isActive(def.color);
    const next = active
      ? cardLabels.filter((l) => l.color !== def.color)
      : [...cardLabels, { color: def.color, name: def.name }];
    await base44.entities.Card.update(card.id, { labels: next });
    onUpdate();
    onLabelsChange?.(next);
  };

  const saveEditedName = async () => {
    if (!editingColor) return;
    const trimmed = editingName.trim();
    // 1. Update the board-level definition
    const nextDefs = labelDefinitions.map((d) =>
      d.color === editingColor ? { ...d, name: trimmed } : d
    );
    await base44.entities.Board.update(card.board_id, { label_definitions: nextDefs });

    // 2. Update ALL cards on this board that use this label
    const allCards = await base44.entities.Card.filter({ board_id: card.board_id });
    const updates = allCards
      .filter((c) => (c.labels || []).some((l) => l.color === editingColor))
      .map((c) => {
        const newLabels = c.labels.map((l) =>
          l.color === editingColor ? { ...l, name: trimmed } : l
        );
        return base44.entities.Card.update(c.id, { labels: newLabels });
      });
    await Promise.all(updates);

    setEditingColor(null);
    onUpdate();
  };

  return (
    <div ref={containerRef} className="space-y-1 min-w-[160px]">
      {labelDefinitions.map((def) => {
        const active = isActive(def.color);
        const isEditing = editingColor === def.color;
        return (
          <div key={def.color} className="flex items-center gap-1 group/lbl">
            {isEditing ? (
              <div className="flex items-center gap-1 flex-1">
                <div className="h-6 w-6 rounded shrink-0" style={{ backgroundColor: def.color }} />
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEditedName();
                    if (e.key === "Escape") setEditingColor(null);
                  }}
                  onBlur={saveEditedName}
                  className="flex-1 h-6 text-xs border border-blue-400 rounded px-1 outline-none"
                />
              </div>
            ) : (
              <>
                <button
                  onClick={() => toggle(def)}
                  className="flex items-center gap-1.5 flex-1 rounded px-2 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: def.color }}
                >
                  <span className="flex-1 text-left truncate">{def.name}</span>
                  {active && <Check className="h-3 w-3 shrink-0" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingColor(def.color);
                    setEditingName(def.name);
                  }}
                  className="opacity-0 group-hover/lbl:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                >
                  <Pencil className="h-3 w-3 text-gray-500" />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}