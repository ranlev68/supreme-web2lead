import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { UserCircle2, ChevronDown, Check } from "lucide-react";

function InitialsAvatar({ name, size = 24 }) {
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="rounded-full bg-[#0079BF] text-white flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

export { InitialsAvatar };

export default function AssigneeSelector({ card, boardId, currentUser, readOnly, onUpdate }) {
  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!boardId) return;
    base44.entities.BoardMember.filter({ board_id: boardId }).then(setMembers);
  }, [boardId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = async (email, name) => {
    setOpen(false);
    const oldName = card.assigned_to_name || card.assigned_to || "Unassigned";
    const newName = name || "Unassigned";
    await base44.entities.Card.update(card.id, {
      assigned_to: email || null,
      assigned_to_name: name || null,
    });
    // Log activity
    await base44.entities.Activity.create({
      card_id: card.id,
      board_id: card.board_id,
      type: "change",
      field_changed: "assigned to",
      old_value: oldName,
      new_value: newName,
      author_name: currentUser?.full_name || currentUser?.email || "Someone",
      author_email: currentUser?.email || "",
      text: email
        ? `${currentUser?.full_name || "Someone"} assigned this card to ${name}`
        : `${currentUser?.full_name || "Someone"} unassigned this card`,
    });
    onUpdate?.({ ...card, assigned_to: email || null, assigned_to_name: name || null });
  };

  const assignedName = card.assigned_to_name || card.assigned_to;

  // Build member list: always include board owner/creator if in members, plus current user
  const memberOptions = members.map((m) => ({ email: m.user_email, name: m.user_name || m.user_email }));

  return (
    <div className="relative" ref={ref}>
      <button
        disabled={readOnly}
        onClick={() => !readOnly && setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 min-h-[32px] bg-card border border-border rounded px-2 py-1.5 text-left transition-colors ${
          !readOnly ? "hover:border-muted-foreground cursor-pointer" : "cursor-default"
        }`}
      >
        {assignedName ? (
          <>
            <InitialsAvatar name={assignedName} size={20} />
            <span className="text-xs text-foreground flex-1 truncate">{assignedName}</span>
          </>
        ) : (
          <>
            <UserCircle2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground flex-1">Unassigned</span>
          </>
        )}
        {!readOnly && <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-xl py-1 max-h-52 overflow-y-auto">
          {/* None option */}
          <button
            onClick={() => handleSelect(null, null)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-xs transition-colors"
          >
            <UserCircle2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left text-muted-foreground">None / Unassigned</span>
            {!card.assigned_to && <Check className="h-3.5 w-3.5 text-primary" />}
          </button>

          {memberOptions.length > 0 && (
            <div className="border-t border-border mt-1 pt-1">
              {memberOptions.map((m) => (
                <button
                  key={m.email}
                  onClick={() => handleSelect(m.email, m.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-xs transition-colors"
                >
                  <InitialsAvatar name={m.name} size={20} />
                  <span className="flex-1 text-left text-foreground truncate">{m.name}</span>
                  {card.assigned_to === m.email && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}