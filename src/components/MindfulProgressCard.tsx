import { cn } from '@/lib/utils';

interface MindfulProgressCardProps {
    bookTitle: string;
    bookCover?: string | null;
    currentPage: number;
    totalPages: number;
}

const MindfulProgressCard = ({ bookTitle, bookCover, currentPage, totalPages }: MindfulProgressCardProps) => {
    const fillRatio = totalPages > 0 ? Math.min(1, currentPage / totalPages) : 0;
    const fillPercent = Math.round(fillRatio * 100);

    return (
        <div className="relative rounded-xl overflow-hidden shadow-elevated min-h-[180px]">
            {bookCover && (
                <div
                    className="absolute inset-0 bg-cover bg-center scale-105"
                    style={{ backgroundImage: `url(${bookCover})` }}
                />
            )}
            <div className="absolute inset-0 bg-foreground/65 backdrop-blur-sm" />

            {/* Fill from bottom */}
            <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-[2000ms] ease-out"
                style={{
                    height: `${fillPercent}%`,
                    background: 'linear-gradient(to top, hsla(140, 20%, 42%, 0.4), hsla(140, 20%, 42%, 0.08))'
                }}
            />

            <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-8 min-h-[180px]">
                <p className="text-primary-foreground/50 text-[11px] font-sans uppercase tracking-[0.2em] mb-3">
                    Şu an bu dünyadasın...
                </p>
                <h3 className="font-serif text-lg font-semibold text-primary-foreground leading-snug mb-3">
                    {bookTitle}
                </h3>
                <p className="text-primary-foreground/40 text-xs font-sans leading-relaxed max-w-[200px]">
                    Ne kadar okuduğunun bir önemi yok,<br />burada olman yeterli.
                </p>
            </div>
        </div>
    );
};

export default MindfulProgressCard;
