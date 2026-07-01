import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Building2, BarChart2, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navigate, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminUsers from "@/components/admin/AdminUsers.jsx";
import AdminWorkspaces from "@/components/admin/AdminWorkspaces.jsx";
import AdminAnalytics from "@/components/admin/AdminAnalytics.jsx";

const TABS = [
  { id: "users", label: "User Management", icon: Users },
  { id: "workspaces", label: "Workspace Overview", icon: Building2 },
  { id: "analytics", label: "Board Analytics", icon: BarChart2 },
];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    base44.auth.me().then((u) => {
      setCurrentUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#0079BF] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "admin") {
    return <Navigate to={createPageUrl("Boards")} replace />;
  }

  return (
    <div className="min-h-screen bg-[#f1f2f4]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="h-8 w-8 bg-[#8B0000] rounded-md flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-500">Manage users, workspaces, and analytics</p>
          </div>
          <button
            onClick={() => navigate(createPageUrl("Boards"))}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? "border-[#0079BF] text-[#0079BF]"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "workspaces" && <AdminWorkspaces />}
        {activeTab === "analytics" && <AdminAnalytics />}
      </div>
    </div>
  );
}