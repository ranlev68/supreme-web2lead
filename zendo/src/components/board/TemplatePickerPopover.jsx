import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Loader2, BookmarkPlus } from "lucide-react";
import moment from "moment";

function applyOffsetToday(offset) {
  if (offset === undefined || offset === null) return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return moment(d).format("YYYY-MM-DD");
}

export default function TemplatePickerPopover({ boardId, listId, cards, onCardAdded, onCardClick }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(null); // templateId being created

  const { data: templates = [] } = useQuery({
    queryKey: ["card_templates", boardId],
    queryFn: () => base44.entities.CardTemplate.filter({ board_id: boardId }),
    enabled: !!boardId && open,
    staleTime: 10000,
  });

  const applyTemplate = async (template) => {
    setCreating(template.id);
    const td = template.template_data || {};
    const maxPos = cards.length > 0 ? Math.max(...cards.map((c) => c.position)) : 0;

    const checklist = (td.checklist_items || []).length > 0
      ? [{
          id: crypto.randomUUID(),
          title: "Checklist",
          items: (td.checklist_items || []).map((item) => ({
            id: crypto.randomUUID(),
            text: item.text,
            checked: false,
          })),
        }]
      : [];

    const newCard = await base44.entities.Card.create({
      title: td.title || template.name,
      description: td.description || "",
      priority: td.priority || null,
      labels: td.labels || [],
      checklists: checklist,
      start_date: applyOffsetToday(td.start_date_offset),
      due_date: applyOffsetToday(td.due_date_offset),
      list_id: listId,
      board_id: boardId,
      position: maxPos + 1000,
    });

    setCreating(null);
    setOpen(false);
    if (onCardAdded) onCardAdded(newCard);
    if (onCardClick) onCardClick(newCard);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          title="Use a template"
          className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
        >
          <LayoutTemplate className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2" sideOffset={4}>
        <p className="text-xs font-semibold text-gray-500 uppercase px-2 pb-2">Templates</p>
        {templates.length === 0 ? (
          <div className="px-2 py-4 text-center">
            <BookmarkPlus className="h-6 w-6 text-gray-300 mx-auto mb-1.5" />
            <p className="text-xs text-gray-400">No templates yet.</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Save a card as a template from the card menu.</p>
          </div>
        ) : (
          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{t.name}</p>
                  {t.template_data?.priority && (
                    <p className="text-[11px] text-gray-400 capitalize">{t.template_data.priority} priority</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] px-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={creating === t.id}
                  onClick={() => applyTemplate(t)}
                >
                  {creating === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Use"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}