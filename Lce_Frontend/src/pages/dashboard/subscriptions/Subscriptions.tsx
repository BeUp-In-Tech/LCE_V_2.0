import { useState, useEffect } from 'react';
import { Loader2, Package, CheckCircle, AlertTriangle, RefreshCw, Calendar, Truck, DollarSign, Clock, CreditCard, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardSubscription } from '../../../hooks/useDashboardSubscription';
import { subscriptionAPI } from '../../../services/api';
import { useToast } from '../../../components/Toast';
import { useAuth } from '../../../context/useAuth';
import ChangePlanModal from '../../../components/shared/modal/ChangePlanModal';

interface PricingOption {
    id: number;
    bags: number;
    pricePerBag: number;
    yearlySavings: number;
    recommended?: boolean;
}

const Subscriptions = () => {
    const { activeSubscription, pendingChange, isLoading, refresh } = useDashboardSubscription();
    const toast = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isCancelling, setIsCancelling] = useState(false);
    const [isReverting, setIsReverting] = useState(false);
    const [isCancellingPending, setIsCancellingPending] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
    
    const [allPlans, setAllPlans] = useState<any[]>([]);
    const [plansLoading, setPlansLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isSubscribing, setIsSubscribing] = useState(false);

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

    const selectedOption = pricingOptions.find(o => o.id === selectedId);
    const dynamicPrice = selectedOption ? selectedOption.pricePerBag : 59;

    useEffect(() => {
        if (activeSubscription) return; 
        const fetchPlans = async () => {
            try {
                setPlansLoading(true);
                const response = await subscriptionAPI.getPlans();
                const plans = response.data.plans || [];
                setAllPlans(plans);
                
                const defaultPlan = plans.find((p: any) => p.billing_cycle === 'annual' && p.bags_per_month === 1);
                if (defaultPlan) setSelectedId(defaultPlan.id);
            } catch (err) {
                console.error('Failed to fetch subscription plans:', err);
            } finally {
                setPlansLoading(false);
            }
        };
        fetchPlans();
    }, [activeSubscription]);

    const handleSubscribe = async () => {
        if (!selectedId || !selectedOption) return;
        setIsSubscribing(true);
        try {
            await subscriptionAPI.create({
                plan_id: selectedId,
                billing_cycle: billingCycle,
            });
            toast.showSuccess('Subscription activated successfully!');
            await refresh();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string; error?: string } } };
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to subscribe. Please try again.';
            toast.showError(errorMessage);
        } finally {
            setIsSubscribing(false);
        }
    };

    const handleCancel = async () => {
        if (!activeSubscription) return;
        if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.')) return;
        setIsCancelling(true);
        try {
            await subscriptionAPI.cancel(activeSubscription.id);
            toast.showSuccess('Subscription cancellation scheduled. It will remain active until the end of your billing period.');
            await refresh();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.showError(error.response?.data?.message || 'Failed to cancel subscription.');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleRevertCancel = async () => {
        if (!activeSubscription) return;
        setIsReverting(true);
        try {
            await subscriptionAPI.revertCancel(activeSubscription.id);
            toast.showSuccess('Subscription reactivated successfully!');
            await refresh();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.showError(error.response?.data?.message || 'Failed to reactivate subscription.');
        } finally {
            setIsReverting(false);
        }
    };

    const handleCancelPendingChange = async () => {
        if (!confirm('Are you sure you want to cancel this pending plan change?')) return;
        setIsCancellingPending(true);
        try {
            await subscriptionAPI.cancelPendingChange();
            toast.showSuccess('Pending plan change has been cancelled.');
            await refresh();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string; message?: string } } };
            toast.showError(error.response?.data?.error || error.response?.data?.message || 'Failed to cancel pending change.');
        } finally {
            setIsCancellingPending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-[#00A7EE]" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="px-2 sm:px-10 max-w-4xl">
                <h1 className="text-[28px] sm:text-[36px] font-bold text-[#2F393D] mb-2">
                    Subscriptions
                </h1>
                <p className="text-[#4B5457] mb-8">
                    Manage your Wash & Fold subscription plan.
                </p>

                {activeSubscription ? (
                    <div className="space-y-6">
                        {}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                {activeSubscription.status === 'cancelled_pending' ? (
                                    <AlertTriangle className="text-amber-500" size={22} />
                                ) : (
                                    <CheckCircle className="text-green-500" size={22} />
                                )}
                                <h2 className="text-xl font-semibold text-[#2F393D]">
                                    {activeSubscription.status === 'cancelled_pending'
                                        ? 'Subscription — Cancellation Pending'
                                        : 'Active Subscription'}
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Plan</p>
                                    <div className="text-lg font-semibold text-[#2F393D] leading-tight pt-0.5">
                                        {activeSubscription.plan.name.includes('Subscribe & Save') ? (
                                            <>
                                                <div className="text-sm font-medium text-slate-500">Subscribe &amp; Save</div>
                                                <div>{activeSubscription.plan.name.replace('Subscribe & Save ', '')}</div>
                                            </>
                                        ) : (
                                            activeSubscription.plan.name
                                        )}
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Bags / Month</p>
                                    <p className="text-lg font-semibold text-[#2F393D]">
                                        {activeSubscription.plan.bags_per_month} Bag{activeSubscription.plan.bags_per_month > 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Price / Bag</p>
                                    <p className="text-lg font-semibold text-[#2F393D]">
                                        ${Math.round(activeSubscription.plan.price_per_bag)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Billing Cycle</p>
                                    <p className="text-lg font-semibold text-[#2F393D] capitalize">
                                        {activeSubscription.billing_cycle}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Bags This Month</p>
                                    <div className="flex items-end gap-1">
                                        <p className="text-lg font-semibold text-[#2F393D]">
                                            {activeSubscription.bags.used}
                                        </p>
                                        <p className="text-sm text-slate-500 mb-0.5">
                                            / {activeSubscription.plan.bags_per_month}
                                        </p>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-[#00A7EE] h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, (activeSubscription.bags.used / activeSubscription.plan.bags_per_month) * 100)}%` }}
                                        />
                                    </div>
                                    {(activeSubscription.bags.balance ?? 0) > 0 && (
                                        <p className="text-xs text-slate-500 mt-1.5">
                                            +{activeSubscription.bags.balance} banked bag{(activeSubscription.bags.balance ?? 0) > 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</p>
                                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                                        activeSubscription.status === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {activeSubscription.status === 'cancelled_pending' ? 'Cancelling' : 'Active'}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#00A7EE] text-white rounded-lg font-medium hover:bg-[#0092D1] transition-colors"
                                >
                                    <RefreshCw size={16} />
                                    Upgrade / Change Plan
                                </button>

                                {activeSubscription.status === 'cancelled_pending' ? (
                                    <button
                                        onClick={handleRevertCancel}
                                        disabled={isReverting}
                                        className="flex items-center gap-2 px-5 py-2.5 border border-green-300 text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors disabled:opacity-50"
                                    >
                                        {isReverting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                        Reactivate Subscription
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCancel}
                                        disabled={isCancelling}
                                        className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                                    >
                                        {isCancelling ? <Loader2 className="animate-spin" size={16} /> : null}
                                        Cancel Subscription
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Pending Change Banner */}
                        {pendingChange && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                                <div className="flex items-start gap-3">
                                    <Clock className="text-amber-500 shrink-0 mt-0.5" size={20} />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-amber-800">
                                            {pendingChange.plan.bags_per_month < (activeSubscription?.plan.bags_per_month ?? 0)
                                                ? 'Pending Downgrade'
                                                : 'Pending Upgrade'}
                                        </p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Your plan will change to <strong>{pendingChange.plan.name}</strong>{' '}
                                            ({pendingChange.billing_cycle}) on{' '}
                                            <strong>{new Date(pendingChange.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
                                        </p>
                                        <p className="text-xs text-amber-600 mt-1">
                                            {pendingChange.plan.bags_per_month < (activeSubscription?.plan.bags_per_month ?? 0)
                                                ? 'This change takes effect at your next cron date.'
                                                : 'This change takes effect at midnight tonight.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-amber-200 flex justify-end">
                                    <button
                                        onClick={handleCancelPendingChange}
                                        disabled={isCancellingPending}
                                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                                    >
                                        {isCancellingPending ? <Loader2 className="animate-spin" size={14} /> : <X size={14} />}
                                        Cancel Change
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Info Banner */}
                        <div className="bg-[#E6F6FD] border border-[#B3E5FC] rounded-xl p-4 flex items-start gap-3">
                            <Package className="text-[#00A7EE] shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="text-sm text-[#2F393D] font-medium">How subscription bags work</p>
                                <p className="text-sm text-[#4B5457] mt-1">
                                    Each bag holds approximately 20–25 lbs of laundry. Your bag allocation refreshes at the start of each billing cycle.
                                    Unused bags are banked and carry over as long as your subscription remains active.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* No active subscription — inline plan browser */
                    <div className="bg-gray-100 rounded-2xl p-6 sm:p-8 md:p-12 shadow-sm">
                        <header className="mb-4">
                            <h2 className="text-2xl font-semibold text-[#2F393D]">
                                Wash & Fold - Subscribe & Save
                            </h2>
                        </header>

                        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 p-2 justify-center">
                            {/* Left Section — Features */}
                            <div className="flex flex-col">
                                <p className="text-[#2F393D] text-sm md:text-base leading-relaxed mb-8">
                                    Get our all-inclusive Wash & Fold subscription! Pay by
                                    the bag, not by the pound, and save up to 15%
                                    compared to Pay Per Order.
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

                            {/* Right Section — Plan Cards */}
                            <div className="flex flex-col gap-3">
                                {/* Toggle Button */}
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

                                <button
                                    type="button"
                                    onClick={() => setShowConfirmation(true)}
                                    disabled={!selectedId || isSubscribing}
                                    className="mt-4 w-full bg-[#00aeef] hover:bg-[#0096ce] text-white text-lg font-medium py-3 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    Subscribe Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {}
                {showConfirmation && selectedOption && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
                        <div className="absolute inset-0" onClick={() => setShowConfirmation(false)} />
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200">
                            <button
                                type="button"
                                onClick={() => setShowConfirmation(false)}
                                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>

                            <div className="text-center mb-5">
                                <div className="mx-auto w-12 h-12 bg-[#E6F6FD] rounded-full flex items-center justify-center mb-3">
                                    <CheckCircle className="text-[#00A7EE]" size={24} />
                                </div>
                                <h3 className="text-xl font-semibold text-[#2F393D]">Confirm Subscription</h3>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Plan</span>
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
                                <div className="flex justify-between text-base">
                                    <span className="font-semibold text-[#2F393D]">Total Charge Today</span>
                                    <span className="font-bold text-[#2F393D]">
                                        ${billingCycle === 'annual'
                                            ? (selectedOption.pricePerBag * selectedOption.bags * 12 - selectedOption.yearlySavings).toLocaleString()
                                            : (selectedOption.pricePerBag * selectedOption.bags).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {user?.payment?.card_last_four ? (
                                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-5">
                                    <CreditCard className="text-blue-500 shrink-0" size={20} />
                                    <div className="text-sm">
                                        <span className="text-slate-600">Charging card ending in </span>
                                        <span className="font-semibold text-[#2F393D]">
                                            {user.payment.card_last_four}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
                                    <CreditCard className="text-amber-500 shrink-0" size={20} />
                                    <div className="text-sm text-amber-800">
                                        Please add a payment method to subscribe.
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmation(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!user?.payment?.card_last_four) {
                                            setShowConfirmation(false);
                                            navigate('/dashboard/payment');
                                            return;
                                        }
                                        setShowConfirmation(false);
                                        handleSubscribe();
                                    }}
                                    disabled={isSubscribing}
                                    className="flex-1 py-2.5 bg-[#00aeef] hover:bg-[#0096ce] text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubscribing && <Loader2 className="animate-spin" size={16} />}
                                    {user?.payment?.card_last_four ? 'Confirm & Pay' : 'Add Payment Method'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {}
            {isModalOpen && (
                <ChangePlanModal
                    isOpen={isModalOpen}
                    setIsOpen={setIsModalOpen}
                    currentPlanId={activeSubscription?.plan?.id}
                    currentBillingCycle={(activeSubscription?.billing_cycle as 'monthly' | 'annual') || 'monthly'}
                    nextCronDate={activeSubscription?.next_cron_date}
                    onPlanChanged={async (planDetails) => {
                        if (!activeSubscription) return;
                        try {
                            const response = await subscriptionAPI.update(activeSubscription.id, {
                                plan_id: planDetails.planId,
                                billing_cycle: planDetails.billingCycle,
                            });
                            await refresh();
                            toast.showSuccess(response.data?.message || 'Plan change scheduled successfully!');
                        } catch (err: unknown) {
                            const error = err as { response?: { data?: { error?: string; message?: string } } };
                            toast.showError(error.response?.data?.error || error.response?.data?.message || 'Failed to change plan.');
                        }
                    }}
                />
            )}
        </div>
    );
};

export default Subscriptions;
