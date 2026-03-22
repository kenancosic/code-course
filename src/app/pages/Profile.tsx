import { Shield, Target, Award, Swords, Compass, Circle, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Progress } from "../components/ui/Progress";
import { Skeleton } from "../components/ui/skeleton";
import { useProfile } from "../../hooks";

export function Profile() {
  const { data: profile, isLoading, error } = useProfile();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-6 pb-8 border-b border-slate-800">
          <Skeleton className="w-32 h-32 rounded-full" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
            <div className="flex items-center gap-4 mt-6">
              <Skeleton className="h-16 w-32" />
              <Skeleton className="h-16 w-32" />
              <Skeleton className="h-16 w-32" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Failed to Load Profile</h2>
        <p className="text-slate-400 mb-6">There was an error loading your profile data.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-6 pb-8 border-b border-slate-800">
        <div className="w-32 h-32 shrink-0 rounded-full border-4 border-indigo-500 bg-slate-800 shadow-[0_0_30px_rgba(99,102,241,0.5)] overflow-hidden relative">
          <img 
            src={profile?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile?.name || 'Hero'}`} 
            alt="Hero Avatar" 
            className="w-full h-full object-cover z-10 relative" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/50 to-transparent z-20" />
        </div>
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            {profile?.name || "Sir Codealot"}
            <span className="text-sm font-normal px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.3)]">Level 1 Adventurer</span>
          </h1>
          <p className="text-slate-400 mt-2 text-lg italic">"{profile?.bio || "A journey of a thousand bugs begins with a single line of code."}"</p>
          
          <div className="flex items-center gap-4 mt-6">
            <div className="flex flex-col text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Current Path</span>
              <span className="font-bold text-indigo-400 flex items-center gap-2"><Compass className="w-4 h-4"/> Explorer</span>
            </div>
            <div className="flex flex-col text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Total XP</span>
              <span className="font-bold text-amber-400 flex items-center gap-2"><Award className="w-4 h-4"/> 0</span>
            </div>
            <div className="flex flex-col text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Quests Conquered</span>
              <span className="font-bold text-emerald-400 flex items-center gap-2"><Target className="w-4 h-4"/> 0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Skills Radar / List */}
        <Card className="border-indigo-500/20 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-indigo-100">
              <Swords className="text-indigo-400" /> Mastery (Skills)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SkillBar name="HTML/CSS Glyphs" level={0} color="bg-orange-500" />
            <SkillBar name="JavaScript Incantations" level={0} color="bg-yellow-400" />
            <SkillBar name="React Rituals" level={0} color="bg-cyan-500" />
            <SkillBar name="Node.js Dark Arts" level={0} color="bg-green-500" />
            <SkillBar name="Database Lore" level={0} color="bg-purple-500" />
          </CardContent>
        </Card>

        {/* Achievements / Inventory */}
        <Card className="border-amber-500/20 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-amber-100">
              <Shield className="text-amber-400" /> Relics & Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <AchievementCard title="First Steps" desc="Begin your coding journey." icon={<Circle className="text-slate-600 w-8 h-8" />} />
              <AchievementCard title="The Archmage" desc="Finish the React path." icon={<Award className="text-slate-600 w-8 h-8" />} />
              <AchievementCard title="Labyrinth Walker" desc="Master recursion." icon={<Target className="text-slate-600 w-8 h-8" />} />
              <AchievementCard title="Data Hoarder" desc="Save 10 custom courses." icon={<Shield className="text-slate-600 w-8 h-8" />} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SkillBar({ name, level, color }: { name: string, level: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-200 font-medium">{name}</span>
        <span className="text-slate-400">Lvl {Math.floor(level / 10)}</span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000 shadow-[0_0_10px_currentColor]`} style={{ width: `${level}%`, opacity: 0.8 }} />
      </div>
    </div>
  )
}

function AchievementCard({ title, desc, icon, active = false }: { title: string, desc: string, icon: React.ReactNode, active?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all ${active ? 'bg-slate-800/80 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-slate-900/30 border-slate-800 opacity-50 grayscale'}`}>
      <div className="mb-3">{icon}</div>
      <h4 className="text-xs font-bold text-slate-200 leading-tight mb-1">{title}</h4>
      <p className="text-[10px] text-slate-500 leading-tight">{desc}</p>
    </div>
  )
}
