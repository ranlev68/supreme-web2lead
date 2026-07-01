import { useState } from "react";
import { X, FileText, Loader2, Copy, Check, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function StatusReport({ board, cards, lists, onClose }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [copied, setCopied] = useState(false);
  const [tone, setTone] = useState("professional");

  const activeCards = cards.filter(c => !c.is_archived);
  const completedCards = activeCards.filter(c => c.completed);
  const openCards = activeCards.filter(c => !c.completed);

  const generateReport = async () => {
    setLoading(true);
    setReport("");

    const listSummaries = lists.map(list => {
      const listCards = activeCards.filter(c => c.list_id === list.id);
      return {
        list: list.title,
        total: listCards.length,
        completed: listCards.filter(c => c.completed).length,
        cards: listCards.map(c => ({
          title: c.title,
          status: c.completed ? "Done" : "In Progress",
          priority: c.priority || null,
          due_date: c.due_date || null,
          assigned_to: c.assigned_to_name || c.assigned_to || null,
        }))
      };
    });

    const overdue = openCards.filter(c => c.due_date && new Date(c.due_date) < new Date());
    const dueSoon = openCards.filter(c => {
      if (!c.due_date) return false;
      const diff = (new Date(c.due_date) - new Date()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 3;
    });

    // Fetch recent activities for all active cards
    const cardIds = new Set(activeCards.map(c => c.id));
    let recentActivities = [];
    try {
      const allActivities = await base44.entities.Activity.filter({ board_id: board.id }, "-created_date", 100);
      recentActivities = allActivities
        .filter(a => cardIds.has(a.card_id))
        .slice(0, 60)
        .map(a => {
          const cardTitle = activeCards.find(c => c.id === a.card_id)?.title || "Unknown card";
          if (a.type === "comment") {
            return `[Comment on "${cardTitle}"] by ${a.author_name}: ${a.text}`;
          } else {
            return `[Change on "${cardTitle}"] ${a.author_name} changed ${a.field_changed} from "${a.old_value}" to "${a.new_value}"`;
          }
        });
    } catch {}

    const prompt = `
You are a project manager writing a status report for a manager.

Board: "${board.title}"
Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
Tone: ${tone}

Stats:
- Total active tasks: ${activeCards.length}
- Completed: ${completedCards.length} (${activeCards.length > 0 ? Math.round((completedCards.length / activeCards.length) * 100) : 0}%)
- Open: ${openCards.length}
- Overdue: ${overdue.length}
- Due in next 3 days: ${dueSoon.length}

Lists breakdown:
${JSON.stringify(listSummaries, null, 2)}

${overdue.length > 0 ? `Overdue tasks: ${overdue.map(c => c.title).join(", ")}` : ""}
${dueSoon.length > 0 ? `Due soon: ${dueSoon.map(c => c.title).join(", ")}` : ""}

${recentActivities.length > 0 ? `Recent activity (last events on active cards):\n${recentActivities.join("\n")}` : ""}

Write a concise, well-structured status report (plain text, no markdown headers, use clear sections with labels like "SUMMARY:", "PROGRESS:", "INSIGHTS:", "RISKS:", "NEXT STEPS:"). 
Derive insights from the recent activity — highlight what changed, who is active, blockers mentioned in comments, and momentum signals.
Keep it under 350 words. Tone: ${tone}.
    `.trim();

    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setReport(result);
    setLoading(false);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openEmail = () => {
    const subject = encodeURIComponent(`Status Report: ${board.title}`);
    const body = encodeURIComponent(report);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg text-foreground">Status Report</h2>
            <span className="text-sm text-muted-foreground truncate max-w-[160px]">{board.title}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border shrink-0">
          <div className="px-4 py-3 text-center">
            <p className="text-2xl font-bold text-foreground">{activeCards.length}</p>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-2xl font-bold text-green-600">{completedCards.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-2xl font-bold text-orange-500">{openCards.filter(c => c.due_date && new Date(c.due_date) < new Date()).length}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
        </div>

        {/* Controls */}
        <div className="px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground shrink-0">Tone:</label>
            <div className="flex gap-1.5">
              {["professional", "concise", "casual"].map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                    tone === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {!report && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Click "Generate" to create an AI-powered status report based on your board's current state.</p>
            </div>
          )}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating your report...</p>
            </div>
          )}
          {report && !loading && (
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">{report}</pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-2 shrink-0">
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Generating..." : report ? "Regenerate" : "Generate Report"}
          </button>
          {report && (
            <>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
              </button>
              <button
                onClick={openEmail}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}