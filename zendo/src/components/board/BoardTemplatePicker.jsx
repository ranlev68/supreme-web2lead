import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Layers, ChevronRight, ArrowLeft, Map, Megaphone, UserCheck, TrendingUp,
  CalendarDays, Zap, Building2, PenTool, Cloud, LayoutGrid,
} from "lucide-react";

const ICON_MAP = {
  "map": Map,
  "megaphone": Megaphone,
  "user-check": UserCheck,
  "trending-up": TrendingUp,
  "calendar-days": CalendarDays,
  "zap": Zap,
  "building-2": Building2,
  "pen-tool": PenTool,
  "cloud": Cloud,
  "layout-grid": LayoutGrid,
};

function TemplateIcon({ icon, size = 20 }) {
  const Icon = ICON_MAP[icon] || LayoutGrid;
  return <Icon size={size} className="text-foreground/70 shrink-0" />;
}

const SEGMENTS = [
  { key: "all", label: "All" },
  { key: "engineering", label: "Engineering" },
  { key: "marketing", label: "Marketing" },
  { key: "hr", label: "HR" },
  { key: "sales", label: "Sales" },
  { key: "architecture", label: "Architecture" },
  { key: "design", label: "Design" },
  { key: "salesforce", label: "Salesforce" },
  { key: "custom", label: "My Templates" },
];

export default function BoardTemplatePicker({ open, onClose, onSelectTemplate, workspaceId }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [boardTitle, setBoardTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedTemplate(null);
      setBoardTitle("");
      setSegment("all");
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    const data = await base44.entities.BoardTemplate.list();
    setTemplates(data);
    setLoading(false);
  };

  const filtered = segment === "all" ? templates : templates.filter(t => t.segment === segment);

  const handleCreate = async () => {
    if (!boardTitle.trim() || !selectedTemplate) return;
    setCreating(true);
    const response = await base44.functions.invoke("createBoardFromTemplate", {
      template_id: selectedTemplate.id,
      title: boardTitle.trim(),
      workspace_id: workspaceId || null,
    });
    setCreating(false);
    if (response.data?.board) {
      onSelectTemplate(response.data.board);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            {selectedTemplate ? "Configure Board" : "Start from a Template"}
          </DialogTitle>
        </DialogHeader>

        {selectedTemplate ? (
          <div className="flex flex-col gap-4 pt-2">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
            >
              <ArrowLeft className="h-4 w-4" /> Back to templates
            </button>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/40">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <TemplateIcon icon={selectedTemplate.icon} size={22} />
              </div>
              <div>
                <p className="font-semibold text-foreground">{selectedTemplate.name}</p>
                <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Board Title</label>
              <Input
                autoFocus
                placeholder={selectedTemplate.name}
                value={boardTitle}
                onChange={e => setBoardTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
            </div>
            {selectedTemplate.lists?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1.5">Lists that will be created</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplate.lists.map((l, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                      {l.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={!boardTitle.trim() || creating}
                className="bg-primary text-primary-foreground"
              >
                {creating ? "Creating..." : "Create Board"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Segment filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {SEGMENTS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setSegment(s.key)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    segment === s.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No templates found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
                {filtered.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTemplate(t); setBoardTitle(t.name); }}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 text-left transition-all group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <TemplateIcon icon={t.icon} size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{t.lists?.length || 0} lists</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}