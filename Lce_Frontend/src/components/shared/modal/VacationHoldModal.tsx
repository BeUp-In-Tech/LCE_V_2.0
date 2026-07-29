import React, { useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { vacationHoldAPI } from '../../../services/api';
import { getPTDate } from '../../../utils/dateHelpers';

interface VacationHoldModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onSuccess: () => void;
}

const VacationHoldModal: React.FC<VacationHoldModalProps> = ({ isOpen, setIsOpen, onSuccess }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setError(null);

        if (!startDate || !endDate) {
            setError("Please select both start and end dates.");
            return;
        }

        setIsLoading(true);
        try {
            await vacationHoldAPI.create({
                start_date: startDate,
                end_date: endDate
            });
            setSuccess(true);
            onSuccess();
            // Auto-close after success animation
            setTimeout(() => {
                setIsOpen(false);
                setSuccess(false);
                setStartDate('');
                setEndDate('');
            }, 1500);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string; message?: string } } };
            setError(err.response?.data?.error || err.response?.data?.message || "Failed to schedule vacation hold. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setError(null);
        setSuccess(false);
        setStartDate('');
        setEndDate('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-xl">
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={24} />
                </button>

                {success ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                            <CheckCircle className="text-green-500" size={40} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Vacation Hold Scheduled!</h2>
                        <p className="text-sm text-gray-500 mt-2">Your pickups will be paused during this period.</p>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Schedule Vacation Hold</h2>
                        <p className="text-sm text-gray-500 mb-6">We'll pause your pickups during this period.</p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]"
                                    value={startDate}
                                    onChange={(e) => { setStartDate(e.target.value); setError(null); }}
                                    min={getPTDate().toISOString().split('T')[0]}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]"
                                    value={endDate}
                                    onChange={(e) => { setEndDate(e.target.value); setError(null); }}
                                    min={startDate || getPTDate().toISOString().split('T')[0]}
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="w-full bg-[#00AEEF] text-white font-bold py-3 rounded-lg mt-4 hover:bg-[#0096ce] transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                            >
                                {isLoading && <Loader2 className="animate-spin" size={20} />}
                                {isLoading ? 'Scheduling...' : 'Confirm Vacation Hold'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default VacationHoldModal;
