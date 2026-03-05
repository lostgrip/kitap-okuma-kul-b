import { cn } from '@/lib/utils';

interface MindfulProgressCardProps {
    bookTitle: string;
    bookCover?: string | null;
    currentPage: number;
    totalPages: number;
}

const MindfulProgressCard = ({ bookTitle, bookCover, currentPage, totalPages }: MindfulProgressCardProps) => {
    // Calculate fill ratio without exposing numbers
    const fillRatio = totalPages > 0 ? Math.min(1, currentPage / totalPages) : 0;
    const fillPercent = Math.round(fillRatio * 100);

    return (
        <div className="relative rounded-3xl overflow-hidden shadow-card mb-6 min-h-[200px]">
            {/* Background: book cover blurred */}
            {bookCover && (
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${bookCover})` }}
                />
            )}
            {/* Dark veil */}
            <div className="absolute inset-0 bg-[#1a1a14]/70 backdrop-blur-sm" />

            {/* Sage green fill — rises from bottom */}
            <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-[2000ms] ease-out"
                style={{ height: `${fillPercent}%`, background: 'linear-gradient(to top, rgba(134,155,108,0.45), rgba(134,155,108,0.1))' }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-8 min-h-[200px]">
                <p className="text-white/60 text-xs font-sans uppercase tracking-[0.2em] mb-3">
                    Şu an bu dünyadasın...
                </p>
                <h3 className="font-serif text-xl font-semibold text-white leading-snug mb-4">
                    {bookTitle}
                </h3>
                <p className="text-white/50 text-xs font-sans leading-relaxed max-w-[220px]">
                    Ne kadar okuduğunun bir önemi yok,<br />burada olman yeterli.
                </p>
            </div>
        </div>
    );
};

export default MindfulProgressCard;
