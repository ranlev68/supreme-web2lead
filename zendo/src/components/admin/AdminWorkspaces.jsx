import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Users, LayoutList } from "lucide-react";

export default function AdminWorkspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setLoading(true);
    const [wsData, members, boards] = await Promise.all([
      base44.entities.Workspace.list(),
      base44.entities.WorkspaceMember.list(),
      base44.entities.Board.list(),
    ]);

    const enriched = wsData.map((ws) => ({
      ...ws,
      memberCount: members.filter((m) => m.workspace_id === ws.id).length,
      boardCount: boards.filter((b) => b.workspace_id === ws.id).length,
      owner: members.find((m) => m.workspace_id === ws.id && m.role === "owner"),
    }));

    setWorkspaces(enriched);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin h-6 w-6 border-4 border-[#0079BF] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((ws) => (
          <div key={ws.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#5B4FCF] flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 truncate">{ws.name}</h3>
                {ws.owner && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">Owner: {ws.owner.user_name || ws.owner.user_email}</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex gap-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Users className="h-3.5 w-3.5 text-gray-400" />
                {ws.memberCount} member{ws.memberCount !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <LayoutList className="h-3.5 w-3.5 text-gray-400" />
                {ws.boardCount} board{ws.boardCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ))}
        {workspaces.length === 0 && (
          <p className="text-sm text-gray-400 col-span-3">No workspaces found.</p>
        )}
      </div>
    </div>
  );
}