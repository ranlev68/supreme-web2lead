import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/components/WorkspaceContext";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, UserPlus, Crown, Shield, Eye, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_ICONS = { owner: Crown, admin: Shield, member: User, viewer: Eye };
const ROLE_LABELS = { owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" };

export default function WorkspaceSettings() {
  const navigate = useNavigate();
  const { currentWorkspace, currentUserRole, refreshWorkspaces, workspaces } = useWorkspace();
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [wsName, setWsName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [myRole, setMyRole] = useState(null);

  // Use the actual workspace object; fall back to first workspace if in a special/all view
  const activeWorkspace = (currentWorkspace && typeof currentWorkspace === "object")
    ? currentWorkspace
    : (workspaces[0] || null);

  useEffect(() => {
    if (activeWorkspace) {
      setWsName(activeWorkspace.name);
      loadMembers(activeWorkspace.id);
    }
  }, [activeWorkspace?.id]);

  const loadMembers = async (workspaceId) => {
    const wsId = workspaceId || activeWorkspace?.id;
    if (!wsId) return;
    const [user, mems] = await Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.WorkspaceMember.filter({ workspace_id: wsId }),
    ]);
    setCurrentUser(user);
    setMembers(mems);
    const mine = mems.find((m) => m.user_email === user?.email);
    setMyRole(mine?.role || "member");
  };

  const saveName = async () => {
    if (!wsName.trim() || wsName === activeWorkspace.name) { setEditingName(false); return; }
    await base44.entities.Workspace.update(activeWorkspace.id, { name: wsName.trim() });
    refreshWorkspaces();
    setEditingName(false);
  };

  const inviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), "user");
      await base44.entities.WorkspaceMember.create({
        workspace_id: activeWorkspace.id,
        user_email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      setInviteEmail("");
      loadMembers(activeWorkspace.id);
    } catch (e) {
      console.error(e);
    } finally {
      setInviting(false);
    }
  };

  const updateRole = async (memberId, newRole) => {
    await base44.entities.WorkspaceMember.update(memberId, { role: newRole });
    loadMembers(activeWorkspace.id);
  };

  const removeMember = async (memberId) => {
    await base44.entities.WorkspaceMember.delete(memberId);
    loadMembers(activeWorkspace.id);
  };

  const deleteWorkspace = async () => {
    await base44.entities.Workspace.delete(activeWorkspace.id);
    refreshWorkspaces();
    navigate(createPageUrl("Boards"));
  };

  const canManage = myRole === "owner" || myRole === "admin";

  if (!activeWorkspace) return null;

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(createPageUrl("Boards"))} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Workspace Settings</h1>
      </div>

      {/* Name */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Workspace Name</h2>
        {editingName ? (
          <div className="flex gap-2">
            <Input value={wsName} onChange={(e) => setWsName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()} autoFocus className="flex-1" />
            <Button size="sm" onClick={saveName} className="bg-[#8B0000] hover:bg-[#6b0000] text-white">Save</Button>
            <Button size="sm" variant="outline" onClick={() => { setEditingName(false); setWsName(activeWorkspace.name); }}>Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-800 font-medium">{activeWorkspace.name}</span>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setEditingName(true)}>Rename</Button>
            )}
          </div>
        )}
      </section>

      {/* Members */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Members ({members.length})</h2>
        <div className="space-y-2 mb-4">
          {members.map((m) => {
            const Icon = ROLE_ICONS[m.role] || User;
            const isMe = m.user_email === currentUser?.email;
            const isOwner = m.role === "owner";
            return (
              <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50">
                <div className="h-8 w-8 rounded-full bg-[#8B0000]/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#8B0000]">{(m.user_name || m.user_email)[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{m.user_name || m.user_email}</p>
                  <p className="text-xs text-gray-400 truncate">{m.user_email}</p>
                </div>
                {canManage && !isMe && !isOwner ? (
                  <Select value={m.role} onValueChange={(val) => updateRole(m.id, val)}>
                    <SelectTrigger className="w-28 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-md">
                    <Icon className="h-3 w-3" /> {ROLE_LABELS[m.role]}
                  </span>
                )}
                {canManage && !isMe && !isOwner && (
                  <button onClick={() => removeMember(m.id)} className="text-gray-300 hover:text-red-500 transition-colors ml-1">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Invite */}
        {canManage && (
          <form onSubmit={inviteMember} className="flex gap-2 pt-3 border-t border-gray-100">
            <Input
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
              className="flex-1 text-sm"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-28 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" disabled={inviting} className="bg-[#8B0000] hover:bg-[#6b0000] text-white shrink-0">
              <UserPlus className="h-4 w-4 mr-1" /> Invite
            </Button>
          </form>
        )}
      </section>

      {/* Danger zone */}
      {myRole === "owner" && (
        <section className="bg-white rounded-xl border border-red-100 p-5">
          <h2 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h2>
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600 flex-1">Are you sure? This cannot be undone.</p>
              <Button size="sm" onClick={deleteWorkspace} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Permanently delete this workspace and all its data.</p>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)} className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-1" /> Delete workspace
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}