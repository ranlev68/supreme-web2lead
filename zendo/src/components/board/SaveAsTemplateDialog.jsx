import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { BookmarkPlus, Check } from "lucide-react";

export default function SaveAsTemplateDialog({ open, onClose, card }) {
  const [name, setName] = useState(card?.title || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Reset when card changes
  const handleOpen = (isOpen) => {
    if (isOpen) {
      setName(card?.title || "");
      setSaved(false);
    }
    if (!isOpen) onClose();
  };

  const save = async () => {
    if (!name.trim() || !card) return;
    setSaving(true);

    // Compute date offsets from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const calcOffset = (dateStr) => {
      if (!dateStr) return undefined;
      const d = new Date(dateStr + "T00:00:00");
      return Math.round((d - today) / 86400000);
    };

    const templateData = {
      title: card.title,
      description: card.description || "",
      priority: card.priority || null,
      labels: card.labels || [],
      checklist_items: (card.checklists?.[0]?.items || []).map((item) => ({
        text: item.text,
        completed: false,
      })),
      start_date_offset: calcOffset(card.start_date),
      due_date_offset: calcOffset(card.due_date),
    };

    await base44.entities.CardTemplate.create({
      name: name.trim(),
      board_id: card.board_id,
      template_data: templateData,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => { onClose(); setSaved(false); }, 1000);
  };

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
            <BookmarkPlus className="h-4 w-4 text-purple-600" />
          </div>
          <h2 className="font-semibold text-gray-800">Save as Template</h2>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          This template will save the card's title, description, priority, labels, and checklist.
          Dates are stored as relative offsets from today.
        </p>

        <label className="text-xs font-medium text-gray-600 block mb-1">Template name</label>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="e.g. Bug Report, Feature Request..."
          className="mb-4"
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={save}
            disabled={saving || !name.trim() || saved}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 min-w-[100px]"
          >
            {saved ? (
              <><Check className="h-3.5 w-3.5" /> Saved!</>
            ) : saving ? (
              "Saving..."
            ) : (
              <><BookmarkPlus className="h-3.5 w-3.5" /> Save template</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}