import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Settings, Calendar, Slack, CheckCircle2, Plus, Sun, Moon, Monitor, Type, Globe, X } from "lucide-react";

const COUNTRIES = [
  { value: "US", label: "🇺🇸 United States" },
  { value: "GB", label: "🇬🇧 United Kingdom" },
  { value: "IL", label: "🇮🇱 Israel" },
  { value: "DE", label: "🇩🇪 Germany" },
  { value: "FR", label: "🇫🇷 France" },
  { value: "CA", label: "🇨🇦 Canada" },
  { value: "AU", label: "🇦🇺 Australia" },
  { value: "IN", label: "🇮🇳 India" },
  { value: "BR", label: "🇧🇷 Brazil" },
  { value: "JP", label: "🇯🇵 Japan" },
  { value: "ES", label: "🇪🇸 Spain" },
  { value: "IT", label: "🇮🇹 Italy" },
  { value: "NL", label: "🇳🇱 Netherlands" },
  { value: "PL", label: "🇵🇱 Poland" },
  { value: "PT", label: "🇵🇹 Portugal" },
  { value: "MX", label: "🇲🇽 Mexico" },
  { value: "ZA", label: "🇿🇦 South Africa" },
  { value: "SG", label: "🇸🇬 Singapore" },
  { value: "NZ", label: "🇳🇿 New Zealand" },
  { value: "SE", label: "🇸🇪 Sweden" },
  { value: "NO", label: "🇳🇴 Norway" },
  { value: "DK", label: "🇩🇰 Denmark" },
  { value: "FI", label: "🇫🇮 Finland" },
  { value: "CH", label: "🇨🇭 Switzerland" },
  { value: "AT", label: "🇦🇹 Austria" },
  { value: "BE", label: "🇧🇪 Belgium" },
  { value: "AR", label: "🇦🇷 Argentina" },
  { value: "CL", label: "🇨🇱 Chile" },
  { value: "KR", label: "🇰🇷 South Korea" },
  { value: "RU", label: "🇷🇺 Russia" },
];
import { useTheme, PALETTES } from "@/components/ThemeProvider";

const CACHE_KEY = "zendo_user_cache";
const WS_CACHE_KEY = "zendo_ws_cache";
function getCached(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } }
function setCache(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} }

export default function AppSettings() {
  const navigate = useNavigate();
  const { theme, setTheme, mobileFontSize, setMobileFontSize, fontFamily, setFontFamily, palette, setPalette } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [preferences, setPreferences] = useState({
    default_workspace_id: "",
    preferred_board_view: "board",
    enable_time_tracking: false,
    board_tint_background: false,
    enable_start_date: false,
    show_holidays: false,
    holiday_countries: ["US"],
  });
  const [connectedIntegrations, setConnectedIntegrations] = useState({
    slack: false,
    googlecalendar: false,
  });

  useEffect(() => {
    const cachedUser = getCached(CACHE_KEY);
    const cachedWs = getCached(WS_CACHE_KEY);
    if (cachedUser) {
      setPreferences({
        default_workspace_id: cachedUser.default_workspace_id || "",
        preferred_board_view: cachedUser.preferred_board_view || "board",
        enable_time_tracking: cachedUser.enable_time_tracking || false,
        board_tint_background: cachedUser.board_tint_background || false,
        enable_start_date: cachedUser.enable_start_date || false,
        show_holidays: cachedUser.show_holidays || false,
        holiday_countries: cachedUser.holiday_countries?.length ? cachedUser.holiday_countries : ["US"],
      });
    }
    if (cachedWs) { setWorkspaces(cachedWs); setLoading(false); }

    // Refresh in background
    Promise.all([base44.auth.me(), base44.entities.WorkspaceMember.list()]).then(async ([u, memberships]) => {
      setCache(CACHE_KEY, u);
      const myMemberships = memberships.filter(m => m.user_email === u.email);
      const wsIds = myMemberships.map(m => m.workspace_id);
      const allWs = await base44.entities.Workspace.list();
      const myWs = allWs.filter(ws => wsIds.includes(ws.id));
      setCache(WS_CACHE_KEY, myWs);
      setPreferences({
        default_workspace_id: u.default_workspace_id || "",
        preferred_board_view: u.preferred_board_view || "board",
        enable_time_tracking: u.enable_time_tracking || false,
        board_tint_background: u.board_tint_background || false,
        enable_start_date: u.enable_start_date || false,
        show_holidays: u.show_holidays || false,
        holiday_countries: u.holiday_countries?.length ? u.holiday_countries : ["US"],
      });
      // Restore theme and font size from profile if localStorage is missing them
      if (u.mobile_font_size) setMobileFontSize(u.mobile_font_size);
      if (u.theme) setTheme(u.theme);
      if (u.font_family) setFontFamily(u.font_family);
      if (u.palette) setPalette(u.palette);
      setWorkspaces(myWs);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      default_workspace_id: preferences.default_workspace_id,
      preferred_board_view: preferences.preferred_board_view,
      enable_time_tracking: preferences.enable_time_tracking,
      board_tint_background: preferences.board_tint_background,
      enable_start_date: preferences.enable_start_date,
      show_holidays: preferences.show_holidays,
      holiday_countries: preferences.holiday_countries,
      mobile_font_size: mobileFontSize,
      theme: theme,
      font_family: fontFamily,
      palette: palette,
    });
    const cached = getCached(CACHE_KEY);
    if (cached) setCache(CACHE_KEY, { ...cached, ...preferences, mobile_font_size: mobileFontSize, theme });
    setSaving(false);
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> App Settings
            </CardTitle>
            <CardDescription>Customize your application preferences and integrations</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">

            {/* Application Preferences */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Application Preferences</h3>

              {/* Default Workspace */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Default Workspace</label>
                <Select
                  value={preferences.default_workspace_id}
                  onValueChange={(val) => setPreferences((prev) => ({ ...prev, default_workspace_id: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Board View */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Preferred Board View</label>
                <Select
                  value={preferences.preferred_board_view}
                  onValueChange={(val) => setPreferences((prev) => ({ ...prev, preferred_board_view: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="board">Board</SelectItem>
                    <SelectItem value="swimlane">Swimlanes</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="calendar">Calendar</SelectItem>
                    <SelectItem value="timeline">Timeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Tracking */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900">Enable Time Tracking</p>
                  <p className="text-xs text-gray-500 mt-0.5">Track time spent on cards and tasks</p>
                </div>
                <Switch
                  checked={preferences.enable_time_tracking}
                  onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, enable_time_tracking: checked }))}
                />
              </div>

              {/* Dark Mode */}
              <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900">Appearance</p>
                  <p className="text-xs text-gray-500 mt-0.5">Choose light, dark, or follow your system setting</p>
                </div>
                <div className="flex gap-2 mt-2">
                  {[
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "system", label: "System", icon: Monitor },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg border-2 text-xs font-medium transition-colors ${
                        theme === value
                          ? "border-[#0079BF] bg-blue-50 text-[#0079BF]"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2"><Type className="h-4 w-4" /> Font</p>
                  <p className="text-xs text-gray-500 mt-0.5">Choose your preferred font style</p>
                </div>
                <div className="flex gap-2 mt-2">
                  {[
                    { value: "inter", label: "Inter" },
                    { value: "geist", label: "Geist" },
                    { value: "jakarta", label: "Jakarta" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setFontFamily(value)}
                      className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                        fontFamily === value
                          ? "border-[#0079BF] bg-blue-50 text-[#0079BF]"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palette */}
              <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900">Color Palette</p>
                  <p className="text-xs text-gray-500 mt-0.5">Soft pastel themes that restyle the entire app</p>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {Object.entries(PALETTES).map(([key, pal]) => (
                    <button
                      key={key}
                      onClick={() => setPalette(key)}
                      className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all ${
                        palette === key
                          ? "border-gray-700 shadow-md scale-[1.03]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {/* Swatch strip */}
                      <div className="flex gap-1 justify-center w-full px-1 overflow-hidden">
                        {pal.swatch.map((color, i) => (
                          <span
                            key={i}
                            className="h-4 w-4 shrink-0 rounded-full border border-white shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{pal.label}</span>
                      <span className="text-[10px] text-gray-400">{pal.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Font Size */}
              <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2"><Type className="h-4 w-4" /> Mobile Text Size</p>
                  <p className="text-xs text-gray-500 mt-0.5">Adjust text size on mobile devices</p>
                </div>
                <div className="flex gap-2 mt-2">
                  {[
                    { value: "normal", label: "Normal" },
                    { value: "large", label: "Large" },
                    { value: "xlarge", label: "X-Large" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setMobileFontSize(value)}
                      className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                        mobileFontSize === value
                          ? "border-[#0079BF] bg-blue-50 text-[#0079BF]"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900">Enable Start Date on Cards</p>
                  <p className="text-xs text-gray-500 mt-0.5">Show a start date field on cards</p>
                </div>
                <Switch
                  checked={preferences.enable_start_date}
                  onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, enable_start_date: checked }))}
                />
              </div>

              {/* Board Tint Background */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900">Board Tint Background</p>
                  <p className="text-xs text-gray-500 mt-0.5">Use a 30% tint of the board color as the view background</p>
                </div>
                <Switch
                  checked={preferences.board_tint_background}
                  onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, board_tint_background: checked }))}
                />
              </div>

              {/* National Holidays */}
              <div className="p-3 border border-gray-200 rounded-lg bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-2"><Globe className="h-4 w-4" /> Show National Holidays</p>
                    <p className="text-xs text-gray-500 mt-0.5">Display public holidays on calendar views</p>
                  </div>
                  <Switch
                    checked={preferences.show_holidays}
                    onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, show_holidays: checked }))}
                  />
                </div>
                {preferences.show_holidays && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">Countries</label>
                    {/* Added countries list */}
                    <div className="space-y-1.5">
                      {preferences.holiday_countries.map((code) => {
                        const country = COUNTRIES.find(c => c.value === code);
                        return (
                          <div key={code} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5">
                            <span className="text-sm">{country?.label || code}</span>
                            <button
                              onClick={() => setPreferences((prev) => ({
                                ...prev,
                                holiday_countries: prev.holiday_countries.filter(c => c !== code)
                              }))}
                              className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {/* Add country */}
                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (!preferences.holiday_countries.includes(val)) {
                          setPreferences((prev) => ({ ...prev, holiday_countries: [...prev.holiday_countries, val] }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="+ Add a country..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.filter(c => !preferences.holiday_countries.includes(c.value)).map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Integrations — coming soon */}
            <div className="space-y-4 border-t pt-6 opacity-50 pointer-events-none">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">Integrations</h3>
                  <span className="text-xs bg-gray-100 text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Coming soon</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Connect external services to enhance your workflows</p>
              </div>
              <div className="grid gap-3">
                {/* Google Calendar */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Google Calendar</p>
                      <p className="text-xs text-gray-400">Sync events and tasks with your calendar</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled className="gap-1 text-gray-400">
                    <Plus className="h-4 w-4" /> Connect
                  </Button>
                </div>

                {/* Slack */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Slack className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Slack</p>
                      <p className="text-xs text-gray-400">Get board updates and notifications in Slack</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled className="gap-1 text-gray-400">
                    <Plus className="h-4 w-4" /> Connect
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#0079BF] hover:bg-[#026AA7] text-white">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}