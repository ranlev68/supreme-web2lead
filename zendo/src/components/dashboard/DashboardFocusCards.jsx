import { CalendarClock, AlertTriangle, Hourglass, RefreshCw, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const CARDS = [
  {
    key: "today",
    label: "Due today",
    icon: CalendarClock,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-500",
    sublabel: (n) => n > 0 ? `${Math.min(n, 3)} high priority` : "All clear",
    sublabelColor: "text-orange-500",
  },
  {
    key: "overdue",
    label: "Overdue",
    icon: AlertTriangle,
    iconBg: "bg-red-100",
    iconColor: "text-red-500",
    sublabel: (n) => n > 0 ? `${Math.min(n, 2)} high priority` : "Nothing overdue",
    sublabelColor: "text-red-500",
  },
  {
    key: "waiting",
    label: "Waiting for you",
    icon: Hourglass,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-500",
    sublabel: (n) => `${n} card${n !== 1 ? "s" : ""}`,
    sublabelColor: "text-violet-500",
  },
  {
    key: "recentlyUpdated",
    label: "Recently updated",
    icon: RefreshCw,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-500",
    sublabel: () => "Last 24 hours",
    sublabelColor: "text-slate-400",
  },
];

export default function DashboardFocusCards({ stats, cardsLoading }) {
  if (cardsLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CARDS.map(card => {
        const items = stats[card.key] || [];
        const count = items.length;
        const Icon = card.icon;
        return (
          <Link
            key={card.key}
            to="/my-work"
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
              <span className="text-xs text-slate-500 font-medium">{card.label}</span>
            </div>
            <div>
              <span className="text-3xl font-bold text-slate-800">{count}</span>
            </div>
            <span className={`text-xs font-medium ${card.sublabelColor}`}>
              {card.sublabel(count)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}