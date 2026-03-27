import {
  Shield,
  Target,
  Award,
  Swords,
  Compass,
  Circle,
  CheckCircle,
  BookOpen,
  Trophy,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { useAchievements, useProfile } from '../../hooks';
import type { Activity } from '../../types/progress';

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'lesson_completed':
      return <BookOpen className="w-4 h-4 text-blue-400" />;
    case 'course_completed':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'achievement_unlocked':
      return <Trophy className="w-4 h-4 text-chart-1" />;
    case 'practice_completed':
      return <Target className="w-4 h-4 text-purple-400" />;
    default:
      return <Circle className="w-4 h-4 text-muted-foreground" />;
  }
};

const getActivityColor = (type: Activity['type']) => {
  switch (type) {
    case 'lesson_completed':
      return 'border-l-blue-500/50 bg-blue-500/5';
    case 'course_completed':
      return 'border-l-green-500/50 bg-green-500/5';
    case 'achievement_unlocked':
      return 'border-l-amber-500/50 bg-amber-500/5';
    case 'practice_completed':
      return 'border-l-purple-500/50 bg-purple-500/5';
    default:
      return 'border-l-slate-500/50 bg-slate-500/5';
  }
};

const getSkillColor = (index: number) => {
  const colors = [
    'bg-orange-500',
    'bg-yellow-400',
    'bg-cyan-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-red-500',
    'bg-primary',
  ];
  return colors[index % colors.length];
};

export function Profile() {
  const { data: profile, isLoading, error } = useProfile();
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-6 pb-8 border-b border-border">
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

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Failed to Load Profile</h2>
        <p className="text-muted-foreground mb-6">There was an error loading your profile data.</p>
      </div>
    );
  }

  const xpProgress =
    (profile.total_xp /
      Math.max(profile.total_xp + profile.xp_to_next_level, 1)) *
    100;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-6 pb-8 border-b border-border">
        <div className="w-32 h-32 shrink-0 rounded-full border-4 border-primary bg-secondary shadow-[0_0_30px_rgba(99,102,241,0.5)] overflow-hidden relative">
          <img
            src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.avatar_seed || profile.display_name}`}
            alt="Hero Avatar"
            className="w-full h-full object-cover z-10 relative"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/50 to-transparent z-20" />
        </div>
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
            {profile.display_name}
            <span className="text-sm font-normal px-3 py-1 bg-primary/20 text-primary rounded-full border border-primary/30 shadow-[0_0_10px_rgba(99,102,241,0.3)]">
              Level {profile.level} {profile.title}
            </span>
          </h1>
          <p className="text-muted-foreground mt-2 text-lg italic">
            &ldquo;A journey of a thousand bugs begins with a single line of code.&rdquo;
          </p>

          <div className="flex items-center gap-4 mt-6">
            <div className="flex flex-col text-foreground bg-card/60 p-3 rounded-lg border border-border/50">
              <span className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
                Current Path
              </span>
              <span className="font-bold text-primary flex items-center gap-2">
                <Compass className="w-4 h-4" /> {profile.current_path?.title || 'Explorer'}
              </span>
            </div>
            <div className="flex flex-col text-foreground bg-card/60 p-3 rounded-lg border border-border/50">
              <span className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
                Total XP
              </span>
              <span className="font-bold text-chart-1 flex items-center gap-2">
                <Award className="w-4 h-4" /> {profile.total_xp}
              </span>
            </div>
            <div className="flex flex-col text-foreground bg-card/60 p-3 rounded-lg border border-border/50">
              <span className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
                Quests Conquered
              </span>
              <span className="font-bold text-chart-2 flex items-center gap-2">
                <Target className="w-4 h-4" /> {profile.quests_completed}
              </span>
            </div>
          </div>

          <div className="mt-4 max-w-md">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress to Level {profile.level + 1}</span>
              <span>{profile.xp_to_next_level} XP needed</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-primary/20 bg-card/40">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-indigo-100">
              <Swords className="text-primary" /> Mastery (Skills)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {profile.skills.length > 0 ? (
              profile.skills.map((skill, index) => (
                <SkillBar
                  key={skill.name}
                  name={skill.name}
                  level={skill.level}
                  progress={Math.min(100, Math.round((skill.xp % 1000) / 10))}
                  color={getSkillColor(index)}
                />
              ))
            ) : (
              <p className="text-muted-foreground/70 text-center py-4">
                No skills unlocked yet. Complete lessons to gain skills!
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-card/40">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-amber-100">
              <Shield className="text-chart-1" /> Relics & Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {achievementsLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : achievements && achievements.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {achievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    title={achievement.title}
                    desc={achievement.description ?? 'Achievement unlocked through progress.'}
                    icon={achievement.icon ?? 'Trophy'}
                    active={achievement.unlocked}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground/70 text-center py-4">
                No achievements unlocked yet. Keep exploring to earn relics!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-500/20 bg-card/40">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-emerald-100">
            <Target className="text-chart-2" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.recent_activity.length > 0 ? (
            <div className="space-y-3">
              {profile.recent_activity.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border-l-2 ${getActivityColor(activity.type)}`}
                >
                  <div className="p-2 bg-secondary/50 rounded-lg">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-foreground capitalize">
                      {activity.type.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-xs text-muted-foreground/70">{activity.description}</p>
                  </div>
                  <div className="text-right">
                    {activity.xp_earned > 0 && (
                      <span className="text-xs font-medium text-chart-1">+{activity.xp_earned} XP</span>
                    )}
                    <p className="text-xs text-muted-foreground/50">
                      {activity.timestamp
                        ? new Date(activity.timestamp).toLocaleDateString()
                        : 'Just now'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground/70 text-center py-4">
              No recent activity. Start your adventure today!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SkillBar({
  name,
  level,
  progress,
  color,
}: {
  name: string;
  level: number;
  progress: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-foreground font-medium">{name}</span>
        <span className="text-muted-foreground">Lvl {level}</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-1000 shadow-[0_0_10px_currentColor]`}
          style={{ width: `${progress}%`, opacity: 0.8 }}
        />
      </div>
    </div>
  );
}

function AchievementCard({
  title,
  desc,
  icon,
  active,
}: {
  title: string;
  desc: string;
  icon: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all ${
        active
          ? 'bg-secondary/80 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
          : 'bg-card/30 border-border opacity-60'
      }`}
    >
      <div className="mb-3 w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-300">
        {active ? <Trophy className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
      </div>
      <h4 className="text-xs font-bold text-foreground leading-tight mb-1">{title}</h4>
      <p className="text-[10px] text-muted-foreground/70 leading-tight">{desc}</p>
      <span className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground/60">
        {icon}
      </span>
    </div>
  );
}
