import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children, user }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null); // null = "All Workspaces"
  const [currentUserRole, setCurrentUserRole] = useState("owner");
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      if (!user) { setLoading(false); return; }

      const memberships = await base44.entities.WorkspaceMember.filter({ user_email: user.email });
      const wsIdSet = new Set(memberships.map((m) => m.workspace_id));

      let allWorkspaces = [];

      if (wsIdSet.size > 0) {
        const allWsList = await base44.entities.Workspace.list("-created_date", 200);
        allWorkspaces = allWsList.filter((w) => wsIdSet.has(w.id));
      }

      if (allWorkspaces.length === 0) {
        const ws = await base44.entities.Workspace.create({
          name: "Personal",
          owner_email: user.email,
        });
        await base44.entities.WorkspaceMember.create({
          workspace_id: ws.id,
          user_email: user.email,
          user_name: user.full_name || user.email,
          role: "owner",
        });
        memberships.push({ workspace_id: ws.id, role: "owner", user_email: user.email });
        allWorkspaces = [ws];
      }

      setWorkspaces(allWorkspaces);

      const savedId = localStorage.getItem("zendo_workspace_id");
      if (!savedId || savedId === "all") {
        setCurrentWorkspace(null);
      } else if (savedId === "favorites" || savedId === "shared") {
        setCurrentWorkspace(savedId);
      } else {
        const saved = allWorkspaces.find((w) => w.id === savedId);
        if (saved) {
          setCurrentWorkspace(saved);
          const myMembership = memberships.find((m) => m.workspace_id === saved.id);
          setCurrentUserRole(myMembership?.role || "member");
        } else {
          // Saved workspace no longer exists, reset to first
          setCurrentWorkspace(allWorkspaces[0] || null);
          const myMembership = memberships.find((m) => m.workspace_id === allWorkspaces[0]?.id);
          setCurrentUserRole(myMembership?.role || "member");
          localStorage.setItem("zendo_workspace_id", allWorkspaces[0]?.id || "all");
        }
      }
    } catch (e) {
      console.error("Failed to load workspaces", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const switchWorkspace = useCallback((workspaceId) => {
    if (workspaceId === "all") {
      setCurrentWorkspace(null);
      setCurrentUserRole("member");
      localStorage.setItem("zendo_workspace_id", "all");
      return;
    }
    if (workspaceId === "favorites" || workspaceId === "shared") {
      setCurrentWorkspace(workspaceId);
      setCurrentUserRole("member");
      localStorage.setItem("zendo_workspace_id", workspaceId);
      return;
    }
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) return;
    setCurrentWorkspace(ws);
    localStorage.setItem("zendo_workspace_id", workspaceId);
    if (user) {
      base44.entities.WorkspaceMember.filter({ workspace_id: workspaceId, user_email: user.email })
        .then(mems => setCurrentUserRole(mems[0]?.role || "member"))
        .catch(() => {});
    }
  }, [workspaces, user]);

  const refreshWorkspaces = useCallback(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  return (
    <WorkspaceContext.Provider value={{ workspaces, currentWorkspace, currentUserRole, switchWorkspace, refreshWorkspaces, loading, user }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}