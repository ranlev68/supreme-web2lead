import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Trash2, Crown, Eye, Pencil } from "lucide-react";

export default function CollaborationPanel({ boardId, open, onClose, currentUserEmail }) {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && boardId) loadMembers();
  }, [open, boardId]);

  const loadMembers = async () => {
    const data = await base44.entities.BoardMember.filter({ board_id: boardId });
    // Enrich with profile pictures from User entity
    const emails = data.map(m => m.user_email);
    let userMap = {};
    if (emails.length > 0) {
      const users = await base44.entities.User.filter({ email: { "$in": emails } });
      users.forEach(u => { userMap[u.email] = u; });
    }
    setMembers(data.map(m => ({ ...m, _profile_picture: userMap[m.user_email]?.profile_picture || null })));
  };

  const invite = async () => {
    setError("");
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address."); return; }
    const existing = members.find((m) => m.user_email.toLowerCase() === email.trim().toLowerCase());
    if (existing) { setError("This person is already a member."); return; }
    setLoading(true);
    try {
      await base44.users.inviteUser(email.trim(), "user");
    } catch (_) {
      // user may already exist in the app — that's fine
    }
    await base44.entities.BoardMember.create({
      board_id: boardId,
      user_email: email.trim().toLowerCase(),
      user_name: email.trim().split("@")[0],
      role,
    });
    setEmail("");
    setRole("editor");
    setLoading(false);
    loadMembers();
  };

  const updateRole = async (member, newRole) => {
    await base44.entities.BoardMember.update(member.id, { role: newRole });
    loadMembers();
  };

  const removeMember = async (member) => {
    await base44.entities.BoardMember.delete(member.id);
    loadMembers();
  };

  const RoleIcon = ({ role }) =>
    role === "viewer" ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[360px] sm:w-[400px] p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Board Members
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100%-64px)] overflow-y-auto">
          {/* Invite section */}
          <div className="px-5 py-4 border-b bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Invite someone</p>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Email address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && invite()}
                className="text-sm flex-1"
              />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-28 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <Button
              size="sm"
              onClick={invite}
              disabled={loading}
              className="w-full bg-[#0079BF] hover:bg-[#026AA7] text-white"
            >
              {loading ? "Inviting..." : "Invite"}
            </Button>
          </div>

          {/* Members list */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Members ({members.length})
            </p>

            {/* Board owner (current user) */}
            <div className="flex items-center gap-3 py-2.5 border-b">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-[#0079BF] text-white text-xs font-bold">
                  {(currentUserEmail || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{currentUserEmail}</p>
                <p className="text-xs text-gray-400">Board owner</p>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs font-medium">
                <Crown className="h-3 w-3" />
                Owner
              </div>
            </div>

            {members.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No members yet. Invite someone above.</p>
            )}

            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 py-2.5 border-b last:border-b-0">
                <Avatar className="h-8 w-8 shrink-0">
                  {member._profile_picture && <AvatarImage src={member._profile_picture} alt={member.user_name} />}
                  <AvatarFallback className="bg-gray-400 text-white text-xs font-bold">
                    {member.user_email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{member.user_name || member.user_email}</p>
                  <p className="text-xs text-gray-400 truncate">{member.user_email}</p>
                </div>
                <Select value={member.role} onValueChange={(val) => updateRole(member, val)}>
                  <SelectTrigger className="h-7 w-24 text-xs gap-1 border-gray-200">
                    <RoleIcon role={member.role} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  onClick={() => removeMember(member)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove member"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Permissions legend */}
          <div className="mt-auto px-5 py-4 bg-gray-50 border-t text-xs text-gray-500 space-y-1.5">
            <p className="font-semibold text-gray-600 mb-1">Permission levels</p>
            <div className="flex items-center gap-2"><Pencil className="h-3.5 w-3.5 text-gray-400" /><span><strong>Editor</strong> — can add, edit, and delete cards</span></div>
            <div className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-gray-400" /><span><strong>Viewer</strong> — can view and comment only</span></div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}