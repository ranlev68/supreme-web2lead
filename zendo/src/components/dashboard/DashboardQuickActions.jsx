import { LayoutDashboard, StickyNote, Layers, Upload, Sparkles } from "lucide-react";

const ACTIONS = [
  {
    key: "board",
    label: "Create board",
    icon: LayoutDashboard,
    gradient: "from-blue-500 to-indigo-500",
    bg: "bg-blue-50",
    color: "text-blue-600",
  },
  {
    key: "card",
    label: "Create card",
    icon: StickyNote,
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    color: "text-emerald-600",
  },
  {
    key: "template",
    label: "Use template",
    icon: Layers,
    gradient: "from-violet-500 to-purple-500",
    bg: "bg-violet-50",
    color: "text-violet-600",
  },
  {
    key: "ai",
    label: "Plan with AI",
    sublabel: "Get started",
    icon: Sparkles,
    gradient: "from-pink-500 to-rose-400",
    bg: "bg-pink-50",
    color: "text-pink-600",
  },
];

export default function DashboardQuickActions({ onCreateBoard, onCreateCard, onUseTemplate }) {
  const handlers = {
    board: onCreateBoard,
    card: onCreateCard,
    template: onUseTemplate,
    ai: () => {},
  };

  return (
    <div>
      <h2 className="font-semibold text-slate-800 mb-3">Start something new</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              onClick={handlers[action.key]}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-center gap-3 group"
            >
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">{action.label}</p>
                {action.sublabel && (
                  <p className="text-xs text-violet-500 font-medium mt-0.5">{action.sublabel}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}