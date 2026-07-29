import { useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpne: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onConfirm?: (reason: any) => void;
}

const CanclelationModal: React.FC<ModalProps> = ({ isOpne, setIsOpen, onConfirm }) => {
    const [selectedReason, setSelectedReason] = useState<string>('others');
    const [otherText, setOtherText] = useState<string>('');

    const reasons = [
        { id: 'plans', label: 'Plans changed' },
        { id: 'time', label: 'Need to chnage pickup time' },
        { id: 'vacation', label: 'Going vacation' },
        { id: 'another', label: 'Found another service' },
        { id: 'others', label: 'Others' },
    ];

    const handleCancelation = () => {
        const info = {
            resonText: otherText,
            resonOption: selectedReason,
        }
        if (onConfirm) {
            onConfirm(info);
        }
        setIsOpen(false)
        console.log(info);
    }

    const handleGoBack = () => {
        setIsOpen(false);
    }

    return (
        <>
            {isOpne && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25">

                    {}
                    <div className="w-full max-w-150 pt-3 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">

                        <div className="flex justify-between items-center px-8   border-gray-100">
                            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800">Cancel Pickup</h2>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className='cursor-pointer' size={28} />
                            </button>
                        </div>
                        <hr className='border border-gray-100 mb-2 mt-3' />

                        <div className="px-8 ">
                            <p className="text-lg text-slate-700 font-medium mb-3">
                                What's the reason for canceling your pickup?
                            </p>

                            <div className="space-y-2">
                                {reasons.map((reason) => (
                                    <label key={reason.id} className="flex items-center group cursor-pointer">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="radio"
                                                name="reason"
                                                className="peer appearance-none h-5 w-5 border-2 border-gray-300 rounded-full checked:border-indigo-600 transition-all"
                                                checked={selectedReason === reason.label}
                                                onChange={() => setSelectedReason(reason.label)}
                                            />
                                            <div className="absolute w-2 h-2 bg-teal-600 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="ml-3 text-slate-700 text-lg group-hover:text-slate-900">
                                            {reason.label}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="mt-4">
                                <input
                                    type="text"
                                    placeholder="Type your reason here"
                                    className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    value={otherText}
                                    onChange={(e) => setOtherText(e.target.value)}
                                />
                            </div>
                        </div>
                        <hr  className='border border-gray-100 mt-3'/>

                        <div className="flex flex-col sm:flex-row justify-end gap-4 px-8 py-3  border-gray-50">
                            <button onClick={handleGoBack} className="px-4 py-2 cursor-pointer bg-gray-100 text-slate-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                                Go Back
                            </button>
                            <button onClick={handleCancelation} className="px-4 py-2 cursor-pointer bg-red-100 text-red-500 font-semibold rounded-xl hover:bg-red-200 transition-colors">
                                Confirm Cancelation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CanclelationModal;