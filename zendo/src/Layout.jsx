import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, LogOut, User, Settings, Shield, Layers } from "lucide-react";
import GlobalSearch from "./components/GlobalSearch";
import { WorkspaceProvider } from "./components/WorkspaceContext";
import WorkspaceSwitcher from "./components/WorkspaceSwitcher";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeProvider } from "./components/ThemeProvider";
import { useAuth } from "@/lib/AuthContext";

export default function Layout({ children, currentPageName }) {
  const { user, logout } = useAuth();

  const initials = user?.full_name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";

  const handleLogout = () => {
    logout();
  };

  return (
    <ThemeProvider>
    <WorkspaceProvider user={user}>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-14 bg-card border-b border-border flex items-center px-3 shrink-0 shadow-sm">
          <div className="flex items-center gap-2 w-full min-w-0">
            {/* Logo */}
            <Link
              to="/Boards"
              className="flex items-center gap-2 text-[#4A5568] font-bold text-xl tracking-tight hover:opacity-80 transition-opacity shrink-0"
            >
              <div className="h-7 w-7 bg-[#8B0000] rounded-md flex items-center justify-center">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="3" width="20" height="4" rx="1"/>
                  <rect x="2" y="10" width="20" height="4" rx="1"/>
                  <rect x="2" y="17" width="20" height="4" rx="1"/>
                </svg>
              </div>
              <span className="text-[#1a1a2e] hidden md:inline">ZenDO</span>
            </Link>
            <div className="w-px h-5 bg-gray-200 shrink-0 hidden sm:block" />
            {/* Workspace switcher - only on Boards and WorkspaceSettings pages */}
            {(currentPageName === "Boards" || currentPageName === "WorkspaceSettings") && (
              <div className="shrink-0">
                <WorkspaceSwitcher workspaceOnly={currentPageName === "WorkspaceSettings"} />
              </div>
            )}
            {/* Search - fills remaining space */}
            <div className="flex-1 min-w-0 flex justify-center">
              <GlobalSearch />
            </div>

            {/* My Work */}
            <Link
              to="/my-work"
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-md transition-colors text-sm font-medium shrink-0"
            >
              <Layers className="h-4 w-4" />
              <span className="hidden lg:inline">My Work</span>
            </Link>
            {/* Time Reports */}
            <Link
              to={createPageUrl("TimeReports")}
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-md transition-colors text-sm font-medium shrink-0"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden lg:inline">Time Reports</span>
            </Link>
            {/* Profile */}
            <div className="shrink-0">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hover:opacity-80 transition-opacity">
                      <Avatar className="h-8 w-8">
                        {user.profile_picture && <AvatarImage src={user.profile_picture} alt={user.full_name} />}
                        <AvatarFallback className="bg-[#0079BF] text-white text-xs font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="font-semibold text-sm">{user.full_name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("Profile")} className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" />
                        Profile Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("AppSettings")} className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        App Settings
                      </Link>
                    </DropdownMenuItem>
                    {user.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("AdminPanel")} className="cursor-pointer">
                          <Shield className="h-4 w-4 mr-2" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted" />
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </WorkspaceProvider>
    </ThemeProvider>
  );
}