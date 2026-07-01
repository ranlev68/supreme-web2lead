import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Pencil, Trash2, Check, X, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function BoardTemplatesManager({ boardId }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["card_templates", boardId],
    queryFn: () => base44.entities.CardTemplate.filter({ board_id: boardId }),
    enabled: !!boardId,
  });

  const startEdit = (t) => { setEditingId(t.id); setEditingName(t.name); };
  const cancelEdit = () => { setEditingId(null); setEditingName(""); };

  const saveEdit = async (t) => {
    if (!editingName.trim()) return;
    await base44.entities.CardTemplate.update(t.id, { name: editingName.trim() });
    queryClient.invalidateQueries({ queryKey: ["card_templates", boardId] });
    setEditingId(null);
  };

  const deleteTemplate = async (id) => {
    await base44.entities.CardTemplate.delete(id);
    queryClient.invalidateQueries({ queryKey: ["card_templates", boardId] });
  };

  if (isLoading) return <div className="py-6 text-center text-sm text-gray-400">Loading templates…</div>;

  if (templates.length === 0) {
    return (
      <div className="py-8 text-center">
        <BookmarkPlus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500 font-medium">No templates yet</p>
        <p className="text-xs text-gray-400 mt-1">Open a card and choose "Save as template" from the More Actions menu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {templates.map((t) => (
        <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 group">
          <div className="h-8 w-8 rounded-md bg-purple-100 flex items-center justify-center shrink-0">
            <BookmarkPlus className="h-4 w-4 text-purple-600" />
          </div>

          <div className="flex-1 min-w-0">
            {editingId === t.id ? (
              <Input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(t); if (e.key === "Escape") cancelEdit(); }}
                className="h-7 text-sm"
              />
            ) : (
              <>
                <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                <p className="text-[11px] text-gray-400">
                  {t.created_by ? `by ${t.created_by}` : ""}
                  {t.template_data?.priority ? ` · ${t.template_data.priority} priority` : ""}
                  {(t.template_data?.checklist_items || []).length > 0
                    ? ` · ${t.template_data.checklist_items.length} checklist items`
                    : ""}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {editingId === t.id ? (
              <>
                <button onClick={() => saveEdit(t)} className="p-1 rounded hover:bg-green-100 text-green-600" title="Save">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={cancelEdit} className="p-1 rounded hover:bg-gray-200 text-gray-400" title="Cancel">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => startEdit(t)}
                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Rename"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}