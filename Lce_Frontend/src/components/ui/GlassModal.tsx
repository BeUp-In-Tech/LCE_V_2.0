import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, Gift } from 'lucide-react';

type ModalType = 'success' | 'error' | 'info' | 'gift';

interface GlassModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    type?: ModalType;
    autoClose?: number; 
}

const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    gift: Gift,
};

const colorMap = {
    success: {
        icon: 'text-emerald-400',
        glow: 'shadow-emerald-500/20',
        border: 'border-emerald-500/30',
        gradient: 'from-emerald-500/10 to-teal-500/10',
    },
    error: {
        icon: 'text-red-400',
        glow: 'shadow-red-500/20',
        border: 'border-red-500/30',
        gradient: 'from-red-500/10 to-rose-500/10',
    },
    info: {
        icon: 'text-cyan-400',
        glow: 'shadow-cyan-500/20',
        border: 'border-cyan-500/30',
        gradient: 'from-cyan-500/10 to-blue-500/10',
    },
    gift: {
        icon: 'text-teal-400',
        glow: 'shadow-teal-500/20',
        border: 'border-teal-500/30',
        gradient: 'from-teal-500/10 to-emerald-500/10',
    },
};

export const GlassModal = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    autoClose = 0,
}: GlassModalProps) => {
    const Icon = iconMap[type];
    const colors = colorMap[type];

    useEffect(() => {
        if (isOpen && autoClose > 0) {
            const timer = setTimeout(onClose, autoClose);
            return () => clearTimeout(timer);
        }
    }, [isOpen, autoClose, onClose]);

    
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            {}
            <div
                className={`
                    relative w-full max-w-md
                    bg-gradient-to-br ${colors.gradient}
                    bg-white/90 dark:bg-slate-900/90
                    backdrop-blur-xl
                    border ${colors.border}
                    rounded-2xl
                    shadow-2xl ${colors.glow}
                    p-6
                    animate-modalSlide
                    overflow-hidden
                `}
            >
                {}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none rounded-2xl" />

                {}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                {}
                <div className="relative flex flex-col items-center text-center">
                    {}
                    <div className={`mb-4 p-3 rounded-full bg-gradient-to-br ${colors.gradient} ${colors.glow} shadow-lg`}>
                        <Icon className={`w-8 h-8 ${colors.icon}`} />
                    </div>

                    {}
                    {title && (
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                            {title}
                        </h3>
                    )}

                    {}
                    <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                        {message}
                    </p>

                    {}
                    <button
                        onClick={onClose}
                        className={`
                            mt-6 px-8 py-2.5
                            bg-gradient-to-r from-cyan-500 to-blue-600
                            hover:from-cyan-400 hover:to-blue-500
                            text-white font-semibold
                            rounded-xl
                            shadow-lg shadow-cyan-500/30
                            hover:shadow-cyan-500/50
                            transition-all duration-200
                            cursor-pointer
                            transform hover:scale-105
                        `}
                    >
                        Got it!
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalSlide {
                    from { 
                        opacity: 0; 
                        transform: scale(0.95) translateY(-10px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: scale(1) translateY(0); 
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-modalSlide {
                    animation: modalSlide 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};
