export default function DashboardGreeting({ user }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const emoji = hour < 12 ? "👋" : hour < 17 ? "☀️" : "🌙";
  const name = user?.full_name?.split(" ")[0] || "there";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 p-6 text-white shadow-lg">
      {/* Decorative blobs */}
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute right-20 bottom-0 h-24 w-24 rounded-full bg-pink-400/20 blur-xl" />
      <div className="absolute left-1/2 top-2 h-16 w-16 rounded-full bg-yellow-300/10 blur-xl" />

      <div className="relative">
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {name}! {emoji}
        </h1>
        <p className="mt-1 text-sm text-white/75">
          Here's what needs your attention today.
        </p>
      </div>
    </div>
  );
}