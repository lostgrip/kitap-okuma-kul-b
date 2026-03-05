import { useEffect, useState } from 'react';
import { CloudRain, Trees } from 'lucide-react';

interface ZenReadingSessionProps {
    onClose: () => void;
}

const ZEN_COLORS = [
    // pastel mavi → şeftali → lavanta → sage → krem
    ['#c8d9e8', '#d6e4f0'],
    ['#f0ddd0', '#f5e6da'],
    ['#d9d0e8', '#e8dff5'],
    ['#cce0d0', '#daeee0'],
    ['#f0ece0', '#faf6ea'],
];

const ZenReadingSession = ({ onClose }: ZenReadingSessionProps) => {
    const [colorIdx, setColorIdx] = useState(0);
    const [pulseScale, setPulseScale] = useState(1);
    const [rainActive, setRainActive] = useState(false);
    const [forestActive, setForestActive] = useState(false);

    // Slowly cycle background colors every 6 seconds
    useEffect(() => {
        const t = setInterval(() => {
            setColorIdx((i) => (i + 1) % ZEN_COLORS.length);
        }, 6000);
        return () => clearInterval(t);
    }, []);

    // Pulse the circle
    useEffect(() => {
        const t = setInterval(() => {
            setPulseScale((s) => (s === 1 ? 1.15 : 1));
        }, 3000);
        return () => clearInterval(t);
    }, []);

    const [from, to] = ZEN_COLORS[colorIdx];

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-between transition-all duration-[3000ms] ease-in-out"
            style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}
        >
            {/* Top: Exit */}
            <div className="w-full flex justify-center pt-12">
                <button
                    onClick={onClose}
                    className="text-sm font-serif text-stone-500/70 hover:text-stone-700/90 transition-colors duration-300 tracking-widest"
                >
                    Dünyaya Dön
                </button>
            </div>

            {/* Center: Breathing circle */}
            <div className="flex items-center justify-center flex-1">
                <div
                    className="rounded-full border border-stone-300/40"
                    style={{
                        width: 160,
                        height: 160,
                        background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.55), rgba(255,255,255,0.1))',
                        transform: `scale(${pulseScale})`,
                        transition: 'transform 3s ease-in-out',
                        boxShadow: '0 0 60px rgba(255,255,255,0.3)',
                    }}
                />
            </div>

            {/* Bottom: Ambient icons */}
            <div className="flex items-center gap-8 pb-14">
                <button
                    onClick={() => setRainActive((v) => !v)}
                    className="flex flex-col items-center gap-1 transition-opacity duration-300"
                    style={{ opacity: rainActive ? 1 : 0.35 }}
                    aria-label="Yağmur sesi"
                >
                    <CloudRain className="w-7 h-7 text-stone-500" />
                    <span className="text-[10px] tracking-widest text-stone-400 font-sans">yağmur</span>
                </button>

                <button
                    onClick={() => setForestActive((v) => !v)}
                    className="flex flex-col items-center gap-1 transition-opacity duration-300"
                    style={{ opacity: forestActive ? 1 : 0.35 }}
                    aria-label="Orman sesi"
                >
                    <Trees className="w-7 h-7 text-stone-500" />
                    <span className="text-[10px] tracking-widest text-stone-400 font-sans">orman</span>
                </button>
            </div>
        </div>
    );
};

export default ZenReadingSession;
