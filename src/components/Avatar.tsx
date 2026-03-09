import { cn } from '@/lib/utils';

interface AvatarProps {
  src: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Avatar = ({ src, name, size = 'md', className }: AvatarProps) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden bg-muted ring-2 ring-background',
        sizes[size],
        className
      )}
    >
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default Avatar;
