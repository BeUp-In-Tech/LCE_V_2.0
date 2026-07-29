import { ArrowUp, ArrowDown, Calendar, Clock, CreditCard, DollarSign, Loader2, Truck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscriptionAPI } from "../../../services/api";
import { useAuth } from "../../../context/useAuth";

interface PricingOption {
    id: number;
    bags: number;
    pricePerBag: number;
    yearlySavings: number;
    recommended?: boolean;
}

interface ModalProps {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onPlanChanged?: (planDetails: { planId: number; price: number; bags: number; billingCycle: 'monthly' | 'annual'; yearlySavings: number }) => void;
    currentPlanId?: number;
    currentBillingCycle?: 'monthly' | 'annual';
    nextCronDate?: string;
}

type ChangeType = 'upgrade' | 'downgrade' | 'new';

const ChangePlanModal: React.FC<ModalProps> = ({ isOpen, setIsOpen, onPlanChanged, currentPlanId, currentBillingCycle, nextCronDate }) => {
    const [selectedId, setSelectedId] = useState<number | null>(currentPlanId ?? null);
    const [error, setError] = useState<string | null>(null);
    
    const [allPlans, setAllPlans] = useState<any[]>([]);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(currentBillingCycle ?? 'annual');
    const [plansLoading, setPlansLoading] = useState(true);
    const [showConfirmStep, setShowConfirmStep] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    
    const pricingOptions: PricingOption[] = allPlans
        .filter(p => p.billing_cycle === billingCycle)
        .map(plan => ({
            id: plan.id,
            bags: plan.bags_per_month,
            pricePerBag: Math.round(plan.price_per_bag),
            yearlySavings: Math.round(plan.annual_savings || 0),
            recommended: plan.bags_per_month === 4, 
        }))
        .sort((a, b) => a.bags - b.bags);

    
    useEffect(() => {
        const fetchPlans = async () => {
            try {
                setPlansLoading(true);
                const response = await subscriptionAPI.getPlans();
                const plans = response.data.plans || [];
                setAllPlans(plans);

                
                if (currentPlanId) {
                    setSelectedId(currentPlanId);
                    
                    
                    const currentPlan = plans.find((p: any) => p.id === currentPlanId);
                    if (currentPlan) setBillingCycle(currentPlan.billing_cycle);
                } else {
                    
                    const defaultPlan = plans.find((p: any) => p.billing_cycle === 'annual' && p.bags_per_month === 1);
                    if (defaultPlan) setSelectedId(defaultPlan.id);
                }
            } catch (err) {
                console.error('Failed to fetch subscription plans:', err);
                setError('Failed to load plans. Please refresh.');
            } finally {
                setPlansLoading(false);
            }
        };

        if (isOpen) {
            fetchPlans();
            setShowConfirmStep(false);
        }
    }, [isOpen, currentPlanId]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setError(null);
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const selectedOption = pricingOptions.find(o => o.id === selectedId);
    const dynamicPrice = selectedOption ? selectedOption.pricePerBag : 59;

    
    const determineChangeType = (): ChangeType => {
        if (!currentPlanId || !currentBillingCycle) return 'new';

        
        const currentPlan = allPlans.find((p: any) => p.id === currentPlanId);
        
        const newPlan = allPlans.find((p: any) => p.id === selectedId);
        if (!currentPlan || !newPlan) return 'new';

        const oldMonthly = currentPlan.price_per_bag * currentPlan.bags_per_month;
        const newMonthly = newPlan.price_per_bag * newPlan.bags_per_month;

        if (newMonthly > oldMonthly) return 'upgrade';
        if (newMonthly === oldMonthly && billingCycle === 'annual' && currentBillingCycle === 'monthly') return 'upgrade';
        return 'downgrade';
    };

    const changeType = determineChangeType();

    const handleConfirmChoice = () => {
        const selectedPlan = pricingOptions.find(option => option.id === selectedId);
        if (!selectedPlan || selectedId === null) {
            setError("Please select a valid plan");
            return;
        }

        
        if (currentPlanId && currentPlanId !== selectedId) {
            setShowConfirmStep(true);
            return;
        }

        
        if (currentPlanId && currentBillingCycle && billingCycle !== currentBillingCycle) {
            setShowConfirmStep(true);
            return;
        }

        
        setIsOpen(false);
        onPlanChanged?.({
            planId: selectedId,
            price: selectedPlan.pricePerBag * selectedPlan.bags,
            bags: selectedPlan.bags,
            billingCycle: billingCycle,
            yearlySavings: selectedPlan.yearlySavings
        });
    };

    const handleFinalConfirm = () => {
        if (!selectedOption || selectedId === null) return;

        
        if (!user?.payment?.card_last_four) {
            setIsOpen(false);
            navigate('/dashboard/payment');
            return;
        }

        setIsSubmitting(true);
        setIsOpen(false);
        onPlanChanged?.({
            planId: selectedId,
            price: selectedOption.pricePerBag * selectedOption.bags,
            bags: selectedOption.bags,
            billingCycle: billingCycle,
            yearlySavings: selectedOption.yearlySavings
        });
        setIsSubmitting(false);
    };

    
    if (showConfirmStep && selectedOption) {
        const totalCharge = billingCycle === 'annual'
            ? (selectedOption.pricePerBag * selectedOption.bags * 12 - selectedOption.yearlySavings)
            : (selectedOption.pricePerBag * selectedOption.bags);

        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-black/25">
                <div
                    className="absolute inset-0"
                    onClick={() => { setShowConfirmStep(false); setIsOpen(false); }}
                />
                <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 sm:p-8 animate-in slide-in-from-bottom-10 sm:zoom-in-95 fade-in duration-300">
                    <button
                        type="button"
                        onClick={() => { setShowConfirmStep(false); setIsOpen(false); }}
                        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>

                    {}
                    <div className="text-center mb-5">
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                            changeType === 'upgrade'
                                ? 'bg-emerald-100'
                                : 'bg-blue-100'
                        }`}>
                            {changeType === 'upgrade'
                                ? <ArrowUp className="text-emerald-600" size={24} />
                                : <ArrowDown className="text-blue-600" size={24} />
                            }
                        </div>
                        <h3 className="text-xl font-semibold text-[#2F393D]">
                            Confirm Plan {changeType === 'upgrade' ? 'Upgrade' : 'Downgrade'}
                        </h3>
                    </div>

                    {}
                    {changeType === 'upgrade' ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 mb-5">
                            <div className="flex items-start gap-2.5">
                                <ArrowUp className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                                <div>
                                    <p className="text-sm font-semibold text-emerald-800">Upgrade takes effect at midnight</p>
                                    <p className="text-xs text-emerald-700 mt-1">
                                        Your new plan activates tonight. Any remaining balance from your current plan will be credited automatically.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 w-full text-center">
                            <Clock className="text-blue-600 mx-auto mb-2" size={20} />
                            <p className="text-sm font-semibold text-blue-800">
                                Downgrade on next cycle
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                                You'll keep your current bag limits until:
                            </p>
                            <div className="mt-2">
                                <span className="inline-block px-4 py-1.5 bg-blue-100/50 text-blue-900 font-bold rounded-full text-sm border border-blue-200/50 shadow-sm">
                                    {nextCronDate ? new Date(nextCronDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Plan details */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-5">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">New Plan</span>
                            <span className="font-medium text-[#2F393D]">{selectedOption.bags} Bag{selectedOption.bags > 1 ? 's' : ''} / month</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Billing Cycle</span>
                            <span className="font-medium text-[#2F393D] capitalize">{billingCycle}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Price per bag</span>
                            <span className="font-medium text-[#2F393D]">${selectedOption.pricePerBag}</span>
                        </div>
                        {billingCycle === 'annual' && selectedOption.yearlySavings > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Annual Savings</span>
                                <span className="font-medium text-green-600">${selectedOption.yearlySavings}</span>
                            </div>
                        )}
                        <hr className="border-slate-200" />
                        {changeType === 'upgrade' ? (
                            <div className="flex justify-between text-base">
                                <span className="font-semibold text-[#2F393D]">
                                    {billingCycle === 'annual' ? 'Annual Total' : 'Monthly Total'}
                                </span>
                                <span className="font-bold text-[#2F393D]">
                                    ${totalCharge.toLocaleString()}
                                </span>
                            </div>
                        ) : (
                            <div className="flex justify-between text-base">
                                <span className="font-semibold text-[#2F393D]">New Rate</span>
                                <span className="font-bold text-[#2F393D]">
                                    ${totalCharge.toLocaleString()}{billingCycle === 'annual' ? '/yr' : '/mo'}
                                </span>
                            </div>
                        )}
                    </div>

                    {}
                    {changeType === 'upgrade' && (
                        user?.payment?.card_last_four ? (
                            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-5">
                                <CreditCard className="text-blue-500 shrink-0" size={20} />
                                <div className="text-sm">
                                    <span className="text-slate-600">Will charge card ending in </span>
                                    <span className="font-semibold text-[#2F393D]">
                                        {user.payment.card_last_four}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
                                <CreditCard className="text-amber-500 shrink-0" size={20} />
                                <div className="text-sm text-amber-800">
                                    Please add a payment method before upgrading.
                                </div>
                            </div>
                        )
                    )}

                    {}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setShowConfirmStep(false)}
                            className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={handleFinalConfirm}
                            disabled={isSubmitting}
                            className={`flex-1 py-2.5 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                                changeType === 'upgrade'
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-[#00aeef] hover:bg-[#0096ce]'
                            }`}
                        >
                            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                            {changeType === 'upgrade'
                                ? (user?.payment?.card_last_four ? 'Confirm Upgrade' : 'Add Payment Method')
                                : 'Confirm Downgrade'
                            }
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-black/25">
            <div
                className="absolute inset-0"
                onClick={() => setIsOpen(false)}
            />
            <div
                className="
                    relative w-full sm:max-w-4xl
                    max-h-[90vh] bg-gray-100 rounded-t-2xl sm:rounded-lg
                    overflow-hidden flex flex-col
                    animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-300
                "
            >
                <div className="w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
                >
                    <X size={24} />
                </button>

                <div className="p-8 md:p-12">
                    <header className="mb-4">
                        <h2 className="text-2xl font-semibold text-[#2F393D]">
                            Wash & Fold - Subscribe & Save
                        </h2>
                    </header>

                    <div className="grid md:grid-cols-2 gap-10 lg:gap-16 p-2 justify-center">
                        {}
                        <div className="flex flex-col">
                            <p className="text-[#2F393D] text-sm md:text-base leading-relaxed mb-8">
                                Get our all-inclusive Wash & Fold subscription! Pay by
                                the bag, not by the pound, and save up to 15%
                                compared to Pay-As-You-Go.
                            </p>

                            <div className="space-y-5 p-6 border border-slate-100 rounded-3xl bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-sky-100 text-sky-500 rounded-full shadow-sm">
                                        <Calendar size={18} />
                                    </div>
                                    <span className="text-[#2F393D] font-medium">
                                        Reschedule or cancel anytime
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-sky-100 text-sky-500 rounded-full shadow-sm">
                                        <Truck size={18} />
                                    </div>
                                    <div className="flex gap-1.5 font-medium">
                                        <span className="line-through text-slate-500">$9.99</span>
                                        <span className="text-[#2F393D]">pickup & delivery</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-sky-100 text-sky-500 rounded-full shadow-sm">
                                        <DollarSign size={18} />
                                    </div>
                                    <div className="flex gap-1.5 font-medium">
                                        <span className="line-through text-slate-500">$5.00</span>
                                        <span className="text-[#2F393D]">service fee</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-sky-100 text-sky-500 rounded-full shadow-sm">
                                        <Clock size={18} />
                                    </div>
                                    <span className="text-slate-700 font-medium text-sm">
                                        Pickups & Deliveries 8am - 5pm
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-sky-100 text-sky-500 rounded-full shadow-sm">
                                        <DollarSign size={18} />
                                    </div>
                                    <span className="text-slate-700 font-medium text-sm">
                                        Additional bag will be charged ${dynamicPrice}/bag
                                    </span>
                                </div>
                            </div>
                        </div>

                        {}
                        <div className="flex flex-col gap-3">

                            {}
                            <div className="flex bg-slate-200/60 p-1 rounded-xl mb-4 mx-auto w-full sm:w-fit justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBillingCycle('monthly');
                                        const currentPlan = allPlans.find(p => p.id === selectedId);
                                        const bags = currentPlan ? currentPlan.bags_per_month : 1;
                                        const newPlan = allPlans.find(p => p.billing_cycle === 'monthly' && p.bags_per_month === bags);
                                        if (newPlan) {
                                            setSelectedId(newPlan.id);
                                        } else {
                                            const fallback = allPlans.find(p => p.billing_cycle === 'monthly' && p.bags_per_month === 1);
                                            if (fallback) setSelectedId(fallback.id);
                                        }
                                    }}
                                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${billingCycle === 'monthly'
                                        ? 'bg-white text-sky-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBillingCycle('annual');
                                        const currentPlan = allPlans.find(p => p.id === selectedId);
                                        const bags = currentPlan ? currentPlan.bags_per_month : 1;
                                        const newPlan = allPlans.find(p => p.billing_cycle === 'annual' && p.bags_per_month === bags);
                                        if (newPlan) {
                                            setSelectedId(newPlan.id);
                                        } else {
                                            const fallback = allPlans.find(p => p.billing_cycle === 'annual' && p.bags_per_month === 1);
                                            if (fallback) setSelectedId(fallback.id);
                                        }
                                    }}
                                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${billingCycle === 'annual'
                                        ? 'bg-white text-sky-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Annual <span className="hidden sm:inline-block bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20 text-[10px] px-2 py-0.5 rounded-full font-bold">Save up to 15%</span>
                                </button>
                            </div>
                            {plansLoading ? (
                                <div className="flex flex-col gap-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="animate-pulse border rounded-2xl p-4 border-gray-200">
                                            <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                                            <div className="h-4 bg-gray-100 rounded w-24"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : pricingOptions.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No plans available at the moment.
                                </div>
                            ) : (
                                pricingOptions.map(option => (
                                    <div
                                        key={option.id}
                                        onClick={() => setSelectedId(option.id)}
                                        className={`cursor-pointer border rounded-2xl p-4 transition-all
                                        ${selectedId === option.id
                                                ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex gap-3 items-center">
                                                <div
                                                    className={`w-5 h-5 rounded-full border flex items-center justify-center
                                                    ${selectedId === option.id
                                                            ? 'border-sky-500'
                                                            : 'border-[#C0C3C4]'
                                                        }`}
                                                >
                                                    {selectedId === option.id && (
                                                        <div className="w-3 h-3 bg-sky-500 rounded-full" />
                                                    )}
                                                </div>

                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-lg font-bold text-[#2F393D]">
                                                        {option.bags} Bag
                                                    </span>
                                                    <span className="text-slate-500 text-xs font-semibold">/ month</span>
                                                </div>
                                            </div>

                                            {option.recommended && (
                                                <span className="bg-[#6F48C7] text-white text-[11px] px-3 py-1 rounded-full font-medium tracking-wide">
                                                    Recommended
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-end pl-8">
                                            <div className="min-h-[36px] flex flex-col justify-end">
                                                {billingCycle === 'annual' ? (
                                                    <>
                                                        <div className="text-xs text-slate-500">Paid annually</div>
                                                        <div className="text-xs text-[#4CAF50] font-medium mt-0.5">
                                                            saves ${option.yearlySavings}/yr
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-xs text-slate-500">Paid monthly</div>
                                                )}
                                            </div>

                                            <div className="text-right flex items-baseline gap-1">
                                                <span className="text-xl font-bold text-[#2F393D]">
                                                    ${option.pricePerBag}
                                                </span>
                                                <span className="text-sm font-semibold text-[#2F393D]">
                                                    / bag
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            {error && (
                                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleConfirmChoice}
                                className="mt-4 w-full bg-[#00aeef] hover:bg-[#0096ce] text-white text-lg font-medium py-3 rounded-xl transition-all shadow-lg active:scale-[0.98]"
                            >
                                {currentPlanId ? 'Review Change' : 'Confirm Choice'}
                            </button>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePlanModal;
