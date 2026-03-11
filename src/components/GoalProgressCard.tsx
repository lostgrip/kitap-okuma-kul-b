import { Leaf, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReadingLogEntry, computeStreak } from '@/hooks/useReadingLog';
import { Goal } from '@/types';

interface GoalProgressCardProps {
    logs: ReadingLogEntry[];
    goals: Goal[];
    totalPagesThisWeek: number;
    completedBooksThisMonth: number;
}

const GoalProgressCard = ({ logs, goals, totalPagesThisWeek, completedBooksThisMonth }: GoalProgressCardProps) => {
    const streak = computeStreak(logs);
    const weeklyGoal = goals.find(g => g.goal_type === 'weekly');
    const monthlyGoal = goals.find(g => g.goal_type === 'monthly');

    const weeklyPagePct = weeklyGoal && weeklyGoal.target_pages > 0
        ? Math.min(100, Math.round((totalPagesThisWeek / weeklyGoal.target_pages) * 100))
        : null;

    const monthlyBookPct = monthlyGoal && monthlyGoal.target_books > 0
        ? Math.min(100, Math.round((completedBooksThisMonth / monthlyGoal.target_books) * 100))
        : null;

    return (
        <div className="bg-card rounded-xl p-5 shadow-card mb-6">
            <h3 className="font-serif font-semibold text-base mb-4 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary" />
                Okuma Alışkanlığı
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-4">
                {/* Consistency */}
                <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-forest-light/10 to-forest/10 rounded-xl border border-forest/20">
                    <Leaf className={cn('w-6 h-6 mb-1', streak > 0 ? 'text-forest' : 'text-muted-foreground')} />
                    <span className="text-2xl font-bold">{streak}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">günlük akış</span>
                </div>

                {/* Weekly pages */}
                <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <TrendingUp className="w-6 h-6 mb-1 text-primary" />
                    <span className="text-2xl font-bold">{totalPagesThisWeek}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">sayfa/hafta</span>
                </div>

                {/* Monthly books */}
                <div className="flex flex-col items-center justify-center p-3 bg-green-500/10 rounded-xl border border-green-200/30 dark:border-green-800/30">
                    <Target className="w-6 h-6 mb-1 text-green-600 dark:text-green-400" />
                    <span className="text-2xl font-bold">{completedBooksThisMonth}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">kitap/ay</span>
                </div>
            </div>

            {/* Progress bars */}
            {weeklyPagePct !== null && (
                <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Haftalık sayfa hedefi</span>
                        <span>{totalPagesThisWeek}/{weeklyGoal!.target_pages}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn('h-full rounded-full transition-all duration-500', weeklyPagePct >= 100 ? 'bg-green-500' : 'bg-primary')}
                            style={{ width: `${weeklyPagePct}%` }}
                        />
                    </div>
                    {weeklyPagePct >= 100 && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">🎉 Haftalık hedefine ulaştın!</p>
                    )}
                </div>
            )}

            {monthlyBookPct !== null && (
                <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Aylık kitap hedefi</span>
                        <span>{completedBooksThisMonth}/{monthlyGoal!.target_books}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn('h-full rounded-full transition-all duration-500', monthlyBookPct >= 100 ? 'bg-green-500' : 'bg-amber-400')}
                            style={{ width: `${monthlyBookPct}%` }}
                        />
                    </div>
                    {monthlyBookPct >= 100 && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">🎉 Aylık hedefine ulaştın!</p>
                    )}
                </div>
            )}

            {weeklyPagePct === null && monthlyBookPct === null && (
                <p className="text-sm text-muted-foreground">Hedef belirleyin ve ilerleyişinizi takip edin.</p>
            )}
        </div>
    );
};

export default GoalProgressCard;
