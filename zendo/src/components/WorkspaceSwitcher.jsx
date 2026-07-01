import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/components/WorkspaceContext";

import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Settings, Check, Star, Users } from "lucide-react";

export default function WorkspaceSwitcher({ workspaceOnly = false }) {
  const { workspaces, currentWorkspace, switchWorkspace, refreshWorkspaces, user } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const createWorkspace = async (e) => {
    e.preventDefault();
    if (!newName.trim() || loading || !user) return;
    setLoading(true);
    try {
      const ws = await base44.entities.Workspace.create({
        name: newName.trim(),
        owner_email: user.email,
      });
      await base44.entities.WorkspaceMember.create({
        workspace_id: ws.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        role: "owner",
      });
      setNewName("");
      setCreating(false);
      refreshWorkspaces();
      switchWorkspace(ws.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const specialViews = { favorites: "Favorites", shared: "Shared with Me" };
  const isSpecial = currentWorkspace === "favorites" || currentWorkspace === "shared";
  const displayName = isSpecial ? specialViews[currentWorkspace] : (currentWorkspace ? currentWorkspace.name : "All Workspaces");
  const initials = isSpecial ? (currentWorkspace === "favorites" ? "★" : "Sh") : (currentWorkspace ? currentWorkspace.name.slice(0, 2).toUpperCase() : "All");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors group">
          <div className="h-6 w-6 rounded bg-[#8B0000] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            {initials.slice(0, 2)}
          </div>
          <span className="text-sm font-semibold text-gray-800 max-w-[120px] truncate hidden sm:inline">
            {displayName}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Workspaces</p>
        </div>
        {!workspaceOnly && (
          <>
            <DropdownMenuItem onClick={() => switchWorkspace("all")} className="flex items-center gap-2 cursor-pointer">
              <div className="h-5 w-5 rounded bg-gray-400 flex items-center justify-center text-white text-[9px] font-bold shrink-0">All</div>
              <span className="flex-1 truncate text-sm">All Workspaces</span>
              {!currentWorkspace && <Check className="h-3.5 w-3.5 text-[#8B0000]" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => switchWorkspace("favorites")} className="flex items-center gap-2 cursor-pointer">
              <div className="h-5 w-5 rounded bg-yellow-400 flex items-center justify-center text-white shrink-0">
                <Star className="h-3 w-3" fill="white" stroke="none" />
              </div>
              <span className="flex-1 truncate text-sm">Favorites</span>
              {currentWorkspace === "favorites" && <Check className="h-3.5 w-3.5 text-[#8B0000]" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => switchWorkspace("shared")} className="flex items-center gap-2 cursor-pointer">
              <div className="h-5 w-5 rounded bg-[#5B4FCF] flex items-center justify-center text-white shrink-0">
                <Users className="h-3 w-3" />
              </div>
              <span className="flex-1 truncate text-sm">Shared with Me</span>
              {currentWorkspace === "shared" && <Check className="h-3.5 w-3.5 text-[#8B0000]" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => switchWorkspace(ws.id)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="h-5 w-5 rounded bg-[#8B0000] flex items-center justify-center text-white text-[9px] font-bold shrink-0">
              {ws.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="flex-1 truncate text-sm">{ws.name}</span>
            {currentWorkspace && ws.id === currentWorkspace.id && <Check className="h-3.5 w-3.5 text-[#8B0000]" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {creating ? (
          <form onSubmit={createWorkspace} className="px-2 py-1.5 flex items-center gap-1.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Workspace name"
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#8B0000]"
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") setCreating(false);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <button type="submit" disabled={loading} className="text-xs bg-[#8B0000] text-white px-2 py-1 rounded hover:bg-[#6b0000] disabled:opacity-50">
              {loading ? "…" : "Add"}
            </button>
          </form>
        ) : (
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setCreating(true); }} className="flex items-center gap-2 cursor-pointer">
            <Plus className="h-4 w-4 text-gray-400" />
            <span className="text-sm">New workspace</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={createPageUrl("WorkspaceSettings")} className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4 text-gray-400" />
            <span className="text-sm">Workspace settings</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}