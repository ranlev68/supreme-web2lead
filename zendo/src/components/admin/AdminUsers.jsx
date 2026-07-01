import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await base44.entities.User.list();
    setUsers(data);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setInviteRole("user");
      loadUsers();
    } catch (e) {
      setInviteError(e.message || "Failed to invite user");
    }
    setInviting(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    await base44.entities.User.update(userId, { role: newRole });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
  };

  const handleDelete = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    await base44.entities.User.delete(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin h-6 w-6 border-4 border-[#0079BF] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Invite */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Invite New User
        </h2>
        <div className="flex gap-2 items-center flex-wrap">
          <Input
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            className="max-w-xs text-sm"
          />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-28 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={inviting} className="bg-[#0079BF] hover:bg-[#026AA7] text-white text-sm">
            {inviting ? "Inviting..." : "Invite"}
          </Button>
        </div>
        {inviteError && <p className="text-xs text-red-500 mt-2">{inviteError}</p>}
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">All Users ({users.length})</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8">
                        {u.profile_picture && <AvatarImage src={u.profile_picture} alt={u.full_name} />}
                        <AvatarFallback className="bg-[#0079BF] text-white text-xs font-semibold">
                          {(u.full_name || u.email || "?")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {u.is_verified && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {u.is_verified ? "Active (has logged in)" : "Never logged in"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{u.full_name || "—"}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              <Select value={u.role || "user"} onValueChange={(val) => handleRoleChange(u.id, val)}>
                <SelectTrigger className="w-24 text-xs h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs shrink-0">
                {u.role === "admin" ? "Admin" : "User"}
              </Badge>
              {u.role !== "admin" && (
                <button
                  onClick={() => handleDelete(u.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  title="Delete user"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}