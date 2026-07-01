import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Newspaper, RefreshCw, Bookmark, BookmarkCheck,
  EyeOff, Plus, X, Settings, ExternalLink
} from "lucide-react";
import moment from "moment";

// ── topic extractor ───────────────────────────────────────────────────────────
function extractTopicsFromBoards(boards, cards) {
  const words = [];
  boards.forEach(b => {
    if (b.title) words.push(...b.title.split(/\s+/));
    (b.label_definitions || []).forEach(l => l.name && words.push(...l.name.split(/\s+/)));
  });
  cards.forEach(c => {
    if (c.title) words.push(...c.title.split(/\s+/));
    (c.labels || []).forEach(l => l.name && words.push(...l.name.split(/\s+/)));
  });
  const stopWords = new Set([
    "the","a","an","and","or","of","to","in","for","on","at","by","with","is","it",
    "this","that","are","was","be","as","do","if","my","we","you","all","new","add",
    "card","task","todo","board","list","item","work","done","week","day","month",""
  ]);
  const counts = {};
  words.forEach(w => {
    const clean = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (clean.length > 3 && !stopWords.has(clean)) counts[clean] = (counts[clean] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
}

// Gradient palettes for cards without images (Flipboard-style bold colors)
const CARD_GRADIENTS = [
  "from-red-600 to-rose-800",
  "from-blue-600 to-indigo-800",
  "from-emerald-600 to-teal-800",
  "from-violet-600 to-purple-800",
  "from-amber-500 to-orange-700",
  "from-sky-500 to-cyan-700",
];

// ── Hero card (large, top-left) ───────────────────────────────────────────────
function HeroArticleCard({ article, index, isSaved, onSave, onHide }) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  return (
    <div className="relative rounded-xl overflow-hidden group cursor-pointer h-64 md:h-80">
      {/* Background */}
      {article.thumbnail ? (
        <img src={article.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
      ) : null}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      {/* Dark overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />

      {/* Action buttons */}
      <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={e => { e.preventDefault(); onSave(article); }}
          className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
          title={isSaved ? "Unsave" : "Save"}
        >
          {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 text-yellow-400" /> : <Bookmark className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={e => { e.preventDefault(); onHide(article.url); }}
          className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
          title="Hide"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex flex-col justify-end p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {article.source}
          </span>
          {article.published_at && (
            <span className="text-[10px] text-white/60">{moment(article.published_at).fromNow()}</span>
          )}
        </div>
        <h3 className="text-white font-bold text-lg leading-tight line-clamp-3 group-hover:underline">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-white/70 text-xs mt-1.5 line-clamp-2">{article.summary}</p>
        )}
      </a>
    </div>
  );
}

// ── Small tile card ───────────────────────────────────────────────────────────
function SmallArticleCard({ article, index, isSaved, onSave, onHide }) {
  const gradient = CARD_GRADIENTS[(index + 2) % CARD_GRADIENTS.length];
  return (
    <div className="relative rounded-xl overflow-hidden group cursor-pointer h-36">
      {article.thumbnail ? (
        <img src={article.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
      ) : null}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={e => { e.preventDefault(); onSave(article); }}
          className="p-1 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
        >
          {isSaved ? <BookmarkCheck className="h-3 w-3 text-yellow-400" /> : <Bookmark className="h-3 w-3" />}
        </button>
        <button
          onClick={e => { e.preventDefault(); onHide(article.url); }}
          className="p-1 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
        >
          <EyeOff className="h-3 w-3" />
        </button>
      </div>

      <a href={article.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex flex-col justify-end p-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/70 mb-1">{article.source}</span>
        <h4 className="text-white font-semibold text-xs leading-snug line-clamp-3 group-hover:underline">
          {article.title}
        </h4>
      </a>
    </div>
  );
}

// ── Skeleton placeholders ─────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-64 md:h-80 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NewsFeed({ boards, cards }) {
  const [articles, setArticles] = useState([]);
  const [detectedTopics, setDetectedTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [prefs, setPrefs] = useState(null);
  const [prefsId, setPrefsId] = useState(null);

  useEffect(() => {
    async function loadPrefs() {
      const user = await base44.auth.me();
      const existing = await base44.entities.UserNewsPreferences.filter({ user_email: user.email });
      if (existing.length > 0) {
        setPrefs(existing[0]);
        setPrefsId(existing[0].id);
      } else {
        const created = await base44.entities.UserNewsPreferences.create({
          user_email: user.email, custom_topics: [], hidden_article_urls: [], saved_articles: [], feed_disabled: false,
        });
        setPrefs(created);
        setPrefsId(created.id);
      }
    }
    loadPrefs();
  }, []);

  useEffect(() => {
    if (boards.length > 0) setDetectedTopics(extractTopicsFromBoards(boards, cards));
  }, [boards, cards]);

  const fetchNews = useCallback(async () => {
    if (!prefs || detectedTopics.length === 0) return;
    setLoading(true);
    const allTopics = [...new Set([...detectedTopics, ...(prefs.custom_topics || [])])];
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional news curator. Search the web for 5 REAL, recent news articles published in the past 7 days relevant to these topics: ${allTopics.join(", ")}.
Today is ${moment().format("MMMM D, YYYY")}.
For each article return ONLY real, working data you found online:
- title: the actual article headline
- source: the actual publication name (Forbes, TechCrunch, Reuters, Wired, etc.)
- summary: 1-2 sentence summary of the article
- published_at: the real publication date as ISO string
- url: the REAL working URL of the article
- thumbnail: the REAL og:image URL of the article (this is usually found in the page's meta tags — it's a full https:// image URL). This field is required and must be a real image URL.
Return only articles you actually found with real URLs and real images. Do not invent or hallucinate URLs.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          articles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" }, source: { type: "string" },
                summary: { type: "string" }, published_at: { type: "string" },
                url: { type: "string" }, thumbnail: { type: "string" }
              }
            }
          }
        }
      }
    });
    const hidden = new Set(prefs.hidden_article_urls || []);
    const fresh = (result.articles || []).filter(a => !hidden.has(a.url));
    setArticles(fresh);
    setLoading(false);
  }, [prefs, detectedTopics]);

  useEffect(() => {
    if (prefs && detectedTopics.length > 0) fetchNews();
  }, [fetchNews]);

  async function updatePrefs(patch) {
    setPrefs(p => ({ ...p, ...patch }));
    await base44.entities.UserNewsPreferences.update(prefsId, patch);
  }

  async function handleSave(article) {
    const saved = prefs.saved_articles || [];
    const already = saved.find(a => a.url === article.url);
    await updatePrefs({ saved_articles: already ? saved.filter(a => a.url !== article.url) : [...saved, article] });
  }

  async function handleHide(url) {
    await updatePrefs({ hidden_article_urls: [...(prefs.hidden_article_urls || []), url] });
    setArticles(prev => prev.filter(a => a.url !== url));
  }

  async function addTopic() {
    const topic = newTopic.trim().toLowerCase();
    if (!topic || (prefs.custom_topics || []).includes(topic)) return;
    await updatePrefs({ custom_topics: [...(prefs.custom_topics || []), topic] });
    setNewTopic("");
  }

  async function removeTopic(topic) {
    await updatePrefs({ custom_topics: (prefs.custom_topics || []).filter(t => t !== topic) });
  }

  if (prefs?.feed_disabled) {
    return (
      <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-border bg-card">
        <span className="text-sm text-muted-foreground flex items-center gap-2">
          <Newspaper className="h-4 w-4" /> News feed is disabled
        </span>
        <Button variant="ghost" size="sm" onClick={() => updatePrefs({ feed_disabled: false })}>Enable</Button>
      </div>
    );
  }

  const savedUrls = new Set((prefs?.saved_articles || []).map(a => a.url));
  const allTopics = [...new Set([...detectedTopics, ...(prefs?.custom_topics || [])])];
  const [hero, ...rest] = articles;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-red-500" />
            News Relevant To Your Work
          </h2>
          {/* Topic pills */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            {allTopics.map(topic => (
              <Badge key={topic} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize gap-1 rounded-full">
                {topic}
                {(prefs?.custom_topics || []).includes(topic) && (
                  <button onClick={() => removeTopic(topic)} className="hover:text-destructive ml-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchNews} disabled={loading} title="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSettings(s => !s)} title="Settings">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="p-3 bg-muted/60 rounded-xl border border-border space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Follow Topics</p>
          <div className="flex gap-2">
            <Input
              placeholder="Add a topic (e.g. salesforce, AI, architecture)"
              value={newTopic}
              onChange={e => setNewTopic(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTopic()}
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8 shrink-0" onClick={addTopic}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <button
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            onClick={() => { updatePrefs({ feed_disabled: true }); setShowSettings(false); }}
          >
            Disable news feed
          </button>
        </div>
      )}

      {/* Magazine grid */}
      {loading ? (
        <GridSkeleton />
      ) : articles.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm rounded-xl border border-dashed border-border">
          No articles found. Try adding topics above or refreshing.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Hero */}
          {hero && (
            <HeroArticleCard
              article={hero}
              index={0}
              isSaved={savedUrls.has(hero.url)}
              onSave={handleSave}
              onHide={handleHide}
            />
          )}
          {/* 2-col grid for the rest */}
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {rest.map((article, i) => (
                <SmallArticleCard
                  key={article.url + i}
                  article={article}
                  index={i}
                  isSaved={savedUrls.has(article.url)}
                  onSave={handleSave}
                  onHide={handleHide}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}