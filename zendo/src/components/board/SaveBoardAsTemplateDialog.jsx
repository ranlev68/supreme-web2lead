import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { BookmarkPlus, Check } from "lucide-react";

export default function SaveBoardAsTemplateDialog({ open, onClose, board, lists }) {
  const [name, setName] = useState(board?.title || "");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleOpenChange = (isOpen) => {
    if (isOpen) {
      setName(board?.title || "");
      setDescription("");
      setSaved(false);
    }
    if (!isOpen) onClose();
  };

  const save = async () => {
    if (!name.trim() || !board) return;
    setSaving(true);
    const response = await base44.functions.invoke("saveBoardAsTemplate", {
      board_id: board.id,
      name: name.trim(),
      description: description.trim(),
    });
    setSaving(false);
    if (response.data?.template) {
      setSaved(true);
      setTimeout(() => { onClose(); setSaved(false); }, 1200);
    }
  };

  if (!board) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <BookmarkPlus className="h-4 w-4 text-purple-600" />
            </div>
            Save Board as Template
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Saves the board's lists, labels, and custom fields as a reusable template.
          {lists?.length > 0 && (
            <span className="block mt-1 font-medium text-foreground/70">
              {lists.length} list{lists.length !== 1 ? "s" : ""} will be saved: {lists.map(l => l.title).join(", ")}
            </span>
          )}
        </p>

        <div className="space-y-3 mt-1">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Template name</label>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && save()}
              placeholder="e.g. My Project Template"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this template for?"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={save}
            disabled={saving || !name.trim() || saved}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 min-w-[120px]"
          >
            {saved ? (
              <><Check className="h-3.5 w-3.5" /> Saved!</>
            ) : saving ? "Saving..." : (
              <><BookmarkPlus className="h-3.5 w-3.5" /> Save template</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}