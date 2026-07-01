import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ReactQuill from "react-quill";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  AlignLeft, Tag, Calendar, Trash2, X, Check, Activity, Pencil,
  CheckSquare, Eye, Paperclip, Download, FileText, Circle, ChevronDown,
  Clock, Archive, Sparkles, Flag, BookmarkPlus, UserCircle2, Users, Timer, Plus
} from "lucide-react";
import SaveAsTemplateDialog from "./SaveAsTemplateDialog";
import AssigneeSelector from "./AssigneeSelector";
import moment from "moment";
import Checklist from "./Checklist";
import TimeTracker from "./TimeTracker";
import AIChecklistGenerator from "./AIChecklistGenerator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", activeBg: "bg-red-500",    activeText: "text-white",       inactiveBg: "bg-muted", inactiveText: "text-muted-foreground" },
  { value: "high",   label: "High",   activeBg: "bg-orange-400",  activeText: "text-white",       inactiveBg: "bg-muted", inactiveText: "text-muted-foreground" },
  { value: "medium", label: "Medium", activeBg: "bg-amber-400",   activeText: "text-white",       inactiveBg: "bg-muted", inactiveText: "text-muted-foreground" },
  { value: "low",    label: "Low",    activeBg: "bg-blue-400",    activeText: "text-white",       inactiveBg: "bg-muted", inactiveText: "text-muted-foreground" },
];

// Sidebar row: icon + label left, value + chevron right
function SidebarRow({ icon, label, value, chevron = true, onClick, children, disabled }) {
  const content = (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm transition-colors ${!disabled && onClick ? "hover:bg-muted cursor-pointer" : "cursor-default"}`}
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-xs font-medium text-muted-foreground flex-1 truncate">{label}</span>
      <span className="text-xs text-foreground font-medium truncate max-w-[90px]">{value}</span>
      {chevron && !disabled && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
    </div>
  );
  return children ? children : content;
}

export default function CardDetailModal({
  card, listTitle, open, onClose, onUpdate, onDelete, onArchive,
  readOnly = false, labelDefinitions = [], onLabelDefinitionsChange,
  enableTimeTracking = false, enableStartDate = false,
  currentUser = null, boardId = null
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [labels, setLabels] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [comment, setComment] = useState("");
  const [activities, setActivities] = useState([]);
  const [user, setUser] = useState(currentUser);
  const [editingOptionColor, setEditingOptionColor] = useState(null);
  const [editingOptionName, setEditingOptionName] = useState("");
  const [checklist, setChecklist] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const cardIdRef = useRef(null);

  useEffect(() => { if (currentUser) setUser(currentUser); }, [currentUser]);

  useEffect(() => {
    if (card && open) {
      if (cardIdRef.current !== card.id) {
        cardIdRef.current = card.id;
        setTitle(card.title || "");
        setDescription(card.description || "");
        setLabels(card.labels || []);
        setDueDate(card.due_date || "");
        setChecklist(card.checklists?.[0] || null);
        setAttachments(card.attachments || []);
        setPriority(card.priority || "");
        loadActivities();
      }
    } else if (!open) {
      cardIdRef.current = null;
    }
  }, [card, open]);

  const loadActivities = async () => {
    if (!card) return;
    const data = await base44.entities.Activity.filter({ card_id: card.id }, "-created_date");
    setActivities(data);
  };

  const logChange = async (fieldChanged, oldValue, newValue) => {
    await base44.entities.Activity.create({
      card_id: card.id, board_id: card.board_id, type: "change",
      field_changed: fieldChanged,
      old_value: String(oldValue || ""), new_value: String(newValue || ""),
      author_name: user?.full_name || user?.email || "Someone",
      author_email: user?.email || "",
    });
    loadActivities();
  };

  const save = async (updates, logEntry) => {
    const updatedCard = { ...card, ...updates };
    await base44.entities.Card.update(card.id, updates);
    if (logEntry) await logChange(logEntry.field, logEntry.old, logEntry.new);
    else loadActivities();
    onUpdate(updatedCard);
  };

  const toggleLabel = (opt) => {
    const exists = labels.find((l) => l.color === opt.color);
    const next = exists ? labels.filter((l) => l.color !== opt.color) : [...labels, { color: opt.color, name: opt.name }];
    setLabels(next);
    save({ labels: next }, { field: "labels", old: labels.map(l => l.name).join(", "), new: next.map(l => l.name).join(", ") });
  };

  const saveLabelOptionName = async () => {
    if (!editingOptionColor) return;
    const trimmed = editingOptionName.trim();
    const nextDefs = labelDefinitions.map((d) => d.color === editingOptionColor ? { ...d, name: trimmed } : d);
    onLabelDefinitionsChange?.(nextDefs);
    const allCards = await base44.entities.Card.filter({ board_id: card.board_id });
    await Promise.all(
      allCards
        .filter((c) => (c.labels || []).some((l) => l.color === editingOptionColor))
        .map((c) => base44.entities.Card.update(c.id, { labels: c.labels.map((l) => l.color === editingOptionColor ? { ...l, name: trimmed } : l) }))
    );
    setLabels(labels.map((l) => l.color === editingOptionColor ? { ...l, name: trimmed } : l));
    setEditingOptionColor(null);
    onUpdate();
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    await base44.entities.Activity.create({
      card_id: card.id, board_id: card.board_id, type: "comment",
      text: comment.trim(),
      author_name: user?.full_name || user?.email || "Someone",
      author_email: user?.email || "",
    });
    setComment("");
    loadActivities();
  };

  const deleteActivity = async (id) => {
    await base44.entities.Activity.delete(id);
    loadActivities();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newAttachment = { id: crypto.randomUUID(), name: file.name, url: file_url, type: file.type, uploaded_at: new Date().toISOString() };
      const next = [...attachments, newAttachment];
      setAttachments(next);
      await base44.entities.Card.update(card.id, { attachments: next });
      onUpdate({ ...card, attachments: next });
    } catch (err) {
      console.error(err);
      alert("Couldn't upload attachment: " + err.message);
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const deleteAttachment = async (id) => {
    const next = attachments.filter((a) => a.id !== id);
    setAttachments(next);
    await base44.entities.Card.update(card.id, { attachments: next });
    onUpdate({ ...card, attachments: next });
  };

  const handleDelete = async () => {
    await Promise.all([
      base44.entities.Card.delete(card.id),
      ...activities.map((a) => base44.entities.Activity.delete(a.id)),
    ]);
    onDelete();
    onClose();
  };

  const handleAIGenerated = async (items) => {
    const newChecklist = { id: crypto.randomUUID(), title: "Checklist", items: items.map((text) => ({ id: crypto.randomUUID(), text, checked: false })) };
    setChecklist(newChecklist);
    await base44.entities.Card.update(card.id, { checklists: [newChecklist] });
    onUpdate({ ...card, checklists: [newChecklist] });
  };

  const isHebrew = (text) => /[\u0590-\u05FF]/.test(text);

  const renderWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#0079BF] underline hover:opacity-80 break-all">{part}</a>
        : part
    );
  };

  if (!card) return null;

  // Derive a "client name" from the first label if available
  const clientName = labels[0]?.name || null;

  const dueDateDisplay = dueDate
    ? (() => {
        const isOverdue = !card.completed && new Date(dueDate) < new Date(new Date().toDateString());
        const formatted = new Date(dueDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        return isOverdue ? `⚠ Overdue · ${formatted}` : formatted;
      })()
    : "No due date";

  return (
    <>
      <SaveAsTemplateDialog open={showSaveTemplate} onClose={() => setShowSaveTemplate(false)} card={card} />
      <AIChecklistGenerator open={showAIGenerator} onClose={() => setShowAIGenerator(false)} onGenerated={handleAIGenerated} />

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-3xl p-0 gap-0 bg-muted rounded-xl overflow-hidden max-h-[92vh] flex flex-col [&>button:first-of-type]:hidden">

          {/* Archived banner */}
          {card.is_archived && (
            <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-700 text-xs font-medium shrink-0">
              <Archive className="h-3.5 w-3.5 shrink-0" />
              This card is archived
            </div>
          )}

          {/* Header */}
          <div className="bg-card border-b border-border px-5 py-4 shrink-0">
            <div className="flex items-start gap-3">
              {/* Completion toggle */}
              {!readOnly && (
                <button
                  onClick={async () => {
                    const newVal = !card.completed;
                    await base44.entities.Card.update(card.id, { completed: newVal });
                    await logChange("completed", card.completed ? "Complete" : "Incomplete", newVal ? "Complete" : "Incomplete");
                    onUpdate({ ...card, completed: newVal });
                  }}
                  className="shrink-0 mt-1"
                  title={card.completed ? "Mark incomplete" : "Mark complete"}
                >
                  {card.completed ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5AAC44]">
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 hover:text-[#5AAC44] transition-colors" />
                  )}
                </button>
              )}

              {/* Title + subtitle */}
              <div className="flex-1 min-w-0">
                {editingTitle && !readOnly ? (
                  <Input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => {
                      setEditingTitle(false);
                      if (title.trim() && title !== card.title)
                        save({ title: title.trim() }, { field: "title", old: card.title, new: title.trim() });
                    }}
                    onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                    className="text-lg font-semibold border-2 border-[#0079BF] bg-white"
                    dir="auto"
                  />
                ) : (
                  <h2
                    className={`text-lg font-semibold leading-snug ${card.completed ? "line-through text-muted-foreground" : "text-foreground"} ${!readOnly ? "cursor-pointer hover:bg-muted rounded px-1 -mx-1" : ""}`}
                    onClick={() => !readOnly && setEditingTitle(true)}
                    dir={isHebrew(title) ? "rtl" : "ltr"}
                  >
                    {title}
                  </h2>
                )}
                {/* Subtitle: context */}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {clientName && <><span className="font-medium">{clientName}</span> · </>}
                  in list <span className="font-medium underline">{listTitle}</span>
                </p>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-muted hover:bg-border transition-colors mt-0.5"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1">
            {card.cover_color && <div className="h-8 w-full shrink-0" style={{ backgroundColor: card.cover_color }} />}

            <div className="flex flex-col sm:flex-row gap-0 p-0">

              {/* ── MAIN CONTENT (left) ── */}
              <div className="flex-1 min-w-0 px-5 py-5 space-y-5">

                {/* Read-only badge */}
                {readOnly && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-2">
                    <Eye className="h-3.5 w-3.5 shrink-0" />
                    You have view-only access to this board.
                  </div>
                )}

                {/* Label pills */}
                {labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {labels.map((l, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: l.color }}
                      >
                        {l.name || "Label"}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlignLeft className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Description</h3>
                    {!editingDesc && !readOnly && (
                      <button
                        onClick={() => setEditingDesc(true)}
                        className="ml-auto text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-border px-2 py-0.5 rounded transition-colors"
                      >
                        <Pencil className="h-3 w-3 inline mr-1" />
                        Edit
                      </button>
                    )}
                  </div>
                  {editingDesc && !readOnly ? (
                    <div>
                      <div className="bg-white rounded-lg border border-border overflow-hidden [&_.ql-toolbar]:rounded-t-lg [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-container]:border-0 [&_.ql-container]:text-sm [&_.ql-editor]:min-h-[140px] [&_.ql-editor]:max-h-[260px] [&_.ql-editor]:overflow-y-auto">
                        <ReactQuill
                          value={description}
                          onChange={setDescription}
                          placeholder="Add a more detailed description..."
                          theme="snow"
                          modules={{
                            toolbar: [
                              [{ header: [1, 2, 3, false] }],
                              ["bold", "italic", "underline", "strike"],
                              [{ color: [] }, { background: [] }],
                              [{ list: "ordered" }, { list: "bullet" }],
                              ["link", "blockquote", "code-block"],
                              ["clean"],
                            ],
                          }}
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={() => { setEditingDesc(false); save({ description }, { field: "description", old: card.description || "", new: description }); }} className="bg-[#0079BF] hover:bg-[#026AA7] text-white">
                          Save
                        </Button>
                        <button onClick={() => { setEditingDesc(false); setDescription(card.description || ""); }}>
                          <X className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="bg-card rounded-lg border border-border p-3 text-sm text-foreground min-h-[72px] max-h-[260px] overflow-y-auto"
                    >
                      {description ? (
                        <div
                          onClick={() => !readOnly && setEditingDesc(true)}
                          className={`prose prose-sm max-w-none [&_a]:text-[#0079BF] [&_a]:underline [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-5 [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground ${!readOnly ? "cursor-pointer" : "cursor-default"}`}
                          dangerouslySetInnerHTML={{ __html: description }}
                        />
                      ) : (
                        <span
                          onClick={() => !readOnly && setEditingDesc(true)}
                          className={`text-muted-foreground ${!readOnly ? "cursor-pointer" : "cursor-default"}`}
                        >
                          {readOnly ? "No description." : "Add a more detailed description..."}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Checklist */}
                {checklist && (
                  <div>
                    <Checklist
                      checklist={checklist}
                      readOnly={readOnly}
                      onDelete={readOnly ? undefined : async () => {
                        setChecklist(null);
                        await base44.entities.Card.update(card.id, { checklists: [] });
                        onUpdate({ ...card, checklists: [] });
                      }}
                      onChange={readOnly ? undefined : async (next) => {
                        setChecklist(next);
                        await base44.entities.Card.update(card.id, { checklists: [next] });
                        onUpdate({ ...card, checklists: [next] });
                      }}
                      onToggleItem={readOnly ? undefined : async (item, newChecked) => {
                        await base44.entities.Activity.create({
                          card_id: card.id, board_id: card.board_id, type: "change",
                          field_changed: `checklist item "${item?.text || ""}"`,
                          old_value: newChecked ? "unchecked" : "checked",
                          new_value: newChecked ? "checked" : "unchecked",
                          text: item?.text || "",
                          author_name: user?.full_name || user?.email || "Someone",
                          author_email: user?.email || "",
                        });
                        loadActivities();
                      }}
                    />
                  </div>
                )}

                {/* Time Tracking */}
                {enableTimeTracking && <TimeTracker card={card} user={user} />}

                {/* Attachments */}
                {(attachments.length > 0 || !readOnly) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground flex-1">Attachments</h3>
                      {!readOnly && (
                        <label className="cursor-pointer">
                          <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                          <span className="text-xs text-[#0079BF] hover:underline font-medium">
                            {uploadingFile ? "Uploading..." : "+ Add"}
                          </span>
                        </label>
                      )}
                    </div>
                    {attachments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No attachments yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {attachments.map((att) => {
                          const isImage = att.type?.startsWith("image/");
                          return (
                            <div key={att.id} className="flex items-center gap-2 bg-card rounded-lg border border-border p-2 group/att">
                              {isImage ? (
                                <img src={att.url} alt={att.name} className="h-10 w-14 object-cover rounded shrink-0" />
                              ) : (
                                <div className="h-10 w-14 bg-muted rounded flex items-center justify-center shrink-0">
                                  <FileText className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{att.name}</p>
                                <p className="text-[11px] text-muted-foreground">{new Date(att.uploaded_at).toLocaleDateString()}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-muted rounded">
                                  <Download className="h-3.5 w-3.5 text-gray-400" />
                                </a>
                                {!readOnly && (
                                  <button onClick={() => deleteAttachment(att.id)} className="p-1 hover:bg-muted rounded opacity-0 group-hover/att:opacity-100 transition-opacity">
                                    <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Activity */}
                <div>
                  <button
                    onClick={() => setShowActivity(!showActivity)}
                    className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground w-full mb-2"
                  >
                    <Activity className="h-4 w-4" />
                    Activity
                    {activities.length > 0 && <span className="text-xs font-normal text-gray-400">({activities.length})</span>}
                    <ChevronDown className={`h-4 w-4 transition-transform ml-auto ${showActivity ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showActivity && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        {!readOnly && (
                          <div className="flex gap-2 mb-4">
                            <div className="h-8 w-8 rounded-full bg-[#0079BF] flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {(user?.full_name || user?.email || "?")[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="bg-card text-sm min-h-[40px] resize-none"
                                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                              />
                              {comment.trim() && (
                                <Button size="sm" onClick={postComment} className="mt-1.5 bg-[#0079BF] hover:bg-[#026AA7] text-white">Save</Button>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="space-y-3">
                          {activities.map((a) => (
                            <div key={a.id} className="flex gap-2 items-start group">
                              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
                                {(a.author_name || "?")[0].toUpperCase()}
                              </div>
                              <div className="flex-1">
                                {a.type === "comment" ? (
                                  <div>
                                    <span className="text-xs font-semibold text-foreground">{a.author_name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">{moment.utc(a.created_date).local().fromNow()}</span>
                                    <div className="bg-card rounded-lg border border-border p-2 mt-1 text-sm">{a.text}</div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground leading-relaxed">
                                    <span className="font-semibold text-foreground">{a.author_name}</span>
                                    {" changed "}<span className="font-medium">{a.field_changed}</span>
                                    {a.old_value ? <> from <span className="bg-red-100 text-red-700 px-1 rounded">{a.old_value}</span></> : null}
                                    {" to "}<span className="bg-green-100 text-green-700 px-1 rounded">{a.new_value || "—"}</span>
                                    <span className="text-gray-400 ml-2">{moment.utc(a.created_date).local().fromNow()}</span>
                                  </div>
                                )}
                              </div>
                              {a.type === "comment" && !readOnly && (
                                <button onClick={() => deleteActivity(a.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── SIDEBAR (right) ── */}
              <div className="w-full sm:w-[220px] shrink-0 border-t sm:border-t-0 sm:border-l border-border px-4 py-5 space-y-3 bg-card/60">

                {/* Priority: 2×2 grid */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Flag className="h-3 w-3" /> Priority
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRIORITY_OPTIONS.map((opt) => {
                      const active = priority === opt.value;
                      return (
                        <button
                          key={opt.value}
                          disabled={readOnly}
                          onClick={async () => {
                            const next = priority === opt.value ? "" : opt.value;
                            setPriority(next);
                            await save({ priority: next || null }, { field: "priority", old: priority || "none", new: next || "none" });
                          }}
                          className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all border ${
                            active
                              ? `${opt.activeBg} ${opt.activeText} border-transparent`
                              : "bg-muted text-muted-foreground border-transparent hover:border-border"
                          } ${readOnly ? "opacity-60 cursor-default" : "cursor-pointer"}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border/60" />

                {/* Assigned to */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <UserCircle2 className="h-3 w-3" /> Assigned To
                  </p>
                  <AssigneeSelector
                    card={card}
                    boardId={boardId || card.board_id}
                    currentUser={currentUser}
                    readOnly={readOnly}
                    onUpdate={(updated) => onUpdate(updated)}
                  />
                </div>

                <div className="border-t border-border/60" />

                {/* Due date — popover on click, no inline shortcuts */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Due Date
                  </p>
                  {readOnly ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {dueDateDisplay}
                    </div>
                  ) : (
                    <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                      <PopoverTrigger asChild>
                        <button className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs transition-colors hover:bg-muted cursor-pointer ${dueDate && !card.completed && new Date(dueDate) < new Date(new Date().toDateString()) ? "text-red-600 border-red-200" : "text-foreground"}`}>
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 text-left font-medium">{dueDateDisplay}</span>
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-auto" align="start">
                        <CalendarPicker
                          mode="single"
                          selected={dueDate ? new Date(dueDate + "T00:00:00") : undefined}
                          onSelect={(date) => {
                            if (!date) {
                              setDueDate("");
                              save({ due_date: null }, { field: "due date", old: card.due_date || "", new: "" });
                            } else {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, "0");
                              const d = String(date.getDate()).padStart(2, "0");
                              const val = `${y}-${m}-${d}`;
                              setDueDate(val);
                              save({ due_date: val }, { field: "due date", old: card.due_date || "", new: val });
                            }
                            setDueDateOpen(false);
                          }}
                          initialFocus
                        />
                        {dueDate && (
                          <div className="px-3 pb-3 pt-1">
                            <button
                              onClick={() => { setDueDate(""); save({ due_date: null }, { field: "due date", old: card.due_date || "", new: "" }); setDueDateOpen(false); }}
                              className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
                            >
                              Remove due date
                            </button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                <div className="border-t border-border/60" />

                {/* Team meeting */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Team Meeting
                  </p>
                  <button
                    disabled={readOnly}
                    onClick={() => save({ team_meeting: !card.team_meeting }, { field: "team meeting", old: card.team_meeting ? "Yes" : "No", new: !card.team_meeting ? "Yes" : "No" })}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      card.team_meeting ? "bg-purple-100 border-purple-300 text-purple-700" : "bg-card border-border text-muted-foreground hover:bg-muted"
                    } ${readOnly ? "cursor-default opacity-60" : "cursor-pointer"}`}
                  >
                    {card.team_meeting ? <Check className="h-3.5 w-3.5 shrink-0" /> : <span className="h-3.5 w-3.5 rounded-sm border border-current inline-block shrink-0" />}
                    <span className="flex-1 text-left">{card.team_meeting ? "On agenda" : "Not on agenda"}</span>
                    {!readOnly && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  </button>
                </div>

                <div className="border-t border-border/60" />

                {/* Labels */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Labels
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={readOnly}>
                      <button className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs transition-colors ${!readOnly ? "hover:bg-muted cursor-pointer" : "cursor-default"}`}>
                        <span className="flex-1 text-left text-muted-foreground font-medium">
                          {labels.length === 0 ? "No labels" : `${labels.length} label${labels.length > 1 ? "s" : ""}`}
                        </span>
                        {!readOnly && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52 p-1.5 space-y-1" onCloseAutoFocus={(e) => e.preventDefault()}>
                      {labelDefinitions.map((opt) => {
                        const active = labels.find((l) => l.color === opt.color);
                        const isEditing = editingOptionColor === opt.color;
                        return (
                          <div key={opt.color} className="flex items-center gap-1 group/label">
                            {isEditing ? (
                              <div className="flex items-center gap-1 flex-1">
                                <div className="h-7 w-7 rounded-sm shrink-0" style={{ backgroundColor: opt.color }} />
                                <Input
                                  autoFocus
                                  value={editingOptionName}
                                  onChange={(e) => setEditingOptionName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveLabelOptionName(); if (e.key === "Escape") setEditingOptionColor(null); }}
                                  onBlur={saveLabelOptionName}
                                  className="h-7 text-xs flex-1"
                                />
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => toggleLabel(opt)}
                                  className="flex items-center gap-2 flex-1 rounded-sm px-2 py-1.5 hover:opacity-90 transition-all text-left"
                                  style={{ backgroundColor: opt.color }}
                                >
                                  <span className="text-white text-xs font-semibold flex-1">{opt.name}</span>
                                  {active && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingOptionColor(opt.color); setEditingOptionName(opt.name); }}
                                  className="opacity-0 group-hover/label:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                                >
                                  <Pencil className="h-3 w-3 text-gray-500" />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="border-t border-border/60" />

                {/* Checklist */}
                {!readOnly && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <CheckSquare className="h-3 w-3" /> Checklist
                    </p>
                    {!checklist && (
                      <button
                        onClick={() => setChecklist({ id: crypto.randomUUID(), title: "Checklist", items: [] })}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 text-left font-medium">Add checklist</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowAIGenerator(true)}
                      className="mt-1.5 w-full flex items-center gap-2 px-3 py-2 rounded-full bg-purple-100 border border-purple-200 text-xs text-purple-700 font-semibold hover:bg-purple-200 transition-colors cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      Generate with AI
                    </button>
                  </div>
                )}

                {/* Actions */}
                {!readOnly && (
                  <>
                    <div className="border-t border-border/60" />
                    <div className="space-y-1.5">
                      <button
                        onClick={() => setShowSaveTemplate(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <BookmarkPlus className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 text-left font-medium">Save as template</span>
                      </button>
                      {onArchive && (
                        <button
                          onClick={() => { onArchive(card); onClose(); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Archive className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1 text-left font-medium">Archive card</span>
                        </button>
                      )}
                    </div>
                    <div className="border-t border-border/60" />
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-600 font-semibold hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 text-left">Delete card</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}