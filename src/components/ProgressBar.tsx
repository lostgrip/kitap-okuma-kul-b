import { cn } from '@/lib/utils';

interface ProgressBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

const ProgressBar = ({
  current,
  total,
  showLabel = true,
  size = 'md',
  className,
  animated = true,
}: ProgressBarProps) => {
  const percentage = Math.min(Math.round((current / total) * 100), 100);

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm text-muted-foreground">
            Page {current} of {total}
          </span>
          <span className="text-sm font-semibold text-primary">{percentage}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-muted rounded-full overflow-hidden',
          heights[size]
        )}
      >
        <div
          className={cn(
            'h-full bg-primary rounded-full transition-all duration-500 ease-out',
            animated && 'animate-progress'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
