import { useState } from "react";
import { Loader2, AlertTriangle, Calculator, Clock } from "lucide-react";
import { subscriptionAPI, type UserSubscription } from "../../../services/api";
import { parseDateSafe, getPTDate, formatDateObj } from '../../../utils/dateHelpers';

interface CancelSubscriptionModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    subscription: UserSubscription;
    onCancelled: () => void;
}

const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({ isOpen, setIsOpen, subscription, onCancelled }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ effectiveDate: string } | null>(null);

    if (!isOpen || !subscription) return null;

    const isAnnual = subscription.billing_cycle === 'annual';
    const startDate = parseDateSafe(subscription.start_date);
    const now = getPTDate();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isInCoolingOff = diffDays <= 5;

    const handleConfirmCancel = async () => {
        setIsSubmitting(true);
        try {
            const response = await subscriptionAPI.cancel(subscription.id);
            const data = response.data;
            setResult({
                effectiveDate: data.effective_date ?? subscription.end_date,
            });
            onCancelled();
        } catch (error) {
            console.error("Failed to cancel subscription", error);
            alert("Failed to cancel subscription. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setResult(null);
        setIsOpen(false);
    };

    
    if (result) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                    <div className="flex flex-col items-center text-center">
                        <div className="bg-amber-100 p-3 rounded-full mb-4">
                            <Clock className="text-amber-600 w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Cancellation Scheduled</h2>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 w-full mb-6 text-left">
                            <div className="space-y-2 text-sm text-amber-900">
                                {isAnnual ? (
                                    <p>
                                        Your subscription will remain active until the end of the busness day.<br/>
                                        You can undo this at any time before that date.
                                    </p>
                                ) : (
                                    <>
                                        <p>
                                            Your subscription will remain <strong>fully active</strong> until:
                                        </p>
                                        <p className="text-lg font-bold text-amber-800 text-center">
                                            {formatDateObj(parseDateSafe(result.effectiveDate))}
                                        </p>
                                        <p className="text-xs text-amber-700 mt-2 italic">
                                            You can undo this cancellation at any time before this date from your subscription settings.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleClose}
                            className="w-full py-3 rounded-xl font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-red-100 p-3 rounded-full mb-4">
                        <AlertTriangle className="text-red-600 w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Cancel Subscription?</h2>
                    <p className="text-gray-600 mb-6">
                        Are you sure you want to cancel your <br />
                         <strong>{subscription.plan.name}</strong>?
                    </p>

                    {isAnnual ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full mb-6 text-left text-sm text-gray-600">
                            Your subscription will remain active until the end of the busness day.
                            You can undo this at any time before that date.
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full mb-6 text-left text-sm text-gray-600">
                            Your subscription will remain active until the end of the current billing period ({formatDateObj(parseDateSafe(subscription.end_date))}).
                            You can undo this at any time before that date.
                        </div>
                    )}

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={handleClose}
                            className="flex-1 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                            disabled={isSubmitting}
                        >
                            Keep Plan
                        </button>
                        <button
                            onClick={handleConfirmCancel}
                            className="flex-1 py-3 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : "Confirm Cancel"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CancelSubscriptionModal;
