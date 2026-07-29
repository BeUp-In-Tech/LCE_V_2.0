import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type LearnMoreModalProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const LearnMoreModal: React.FC<LearnMoreModalProps> = ({ isOpen, setIsOpen }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-white rounded-2xl w-full max-w-[500px] shadow-xl overflow-hidden relative"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-[#FFAB00] text-xl font-medium">Note:</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                                <X size={24} strokeWidth={1.5} />
                            </button>
                        </div>
                        <p className="text-[#2F393D] text-[15px] leading-relaxed">
                            Weekends <span className="text-gray-400">(Sun & Mon)</span> and National holidays won't be count as for next day delivery service. Ex. If you schedule a pickup before weekend or holidays then your next day delivery will be the next business day, which is the day after holiday.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LearnMoreModal;
