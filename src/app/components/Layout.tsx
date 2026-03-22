import { Outlet, NavLink } from "react-router";
import { Compass, Swords, Scroll, ScrollText, User, Flame } from "lucide-react";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  { path: "/", icon: Flame, label: "Tavern (Home)" },
  { path: "/roadmap", icon: Compass, label: "Questlines (Roadmap)" },
  { path: "/practice", icon: Swords, label: "Arena (Practice)" },
  { path: "/create", icon: Scroll, label: "Forge (Create)" },
  { path: "/profile", icon: User, label: "Character Sheet" },
];

export function Layout() {
  return (
    <div className="flex h-screen w-full bg-[#0a0f1d] text-slate-300 font-sans selection:bg-purple-500/30 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/60 bg-[#0d1424] flex flex-col z-20 shadow-2xl">
        <div className="h-16 flex items-center px-6 border-b border-slate-800/60 shrink-0 gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            <ScrollText className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-wider text-slate-100 uppercase">Mythic<span className="text-purple-400">Code</span></span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                  isActive
                    ? "bg-slate-800/50 text-white shadow-[inset_2px_0_0_rgba(168,85,247,1)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-5 h-5", isActive ? "text-purple-400" : "group-hover:text-slate-300")} />
                  <span className="font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border-2 border-indigo-500 overflow-hidden">
               <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Felix" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">Sir Codealot</p>
              <p className="text-xs text-indigo-400 truncate">Lvl 12 Frontend Mage</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="flex-1 p-8 z-10 w-full max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
