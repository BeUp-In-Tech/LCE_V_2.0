import { useState, useMemo, useEffect } from "react";
import { Package, CalendarClock, TrendingUp, Sparkles, ChevronRight, RotateCcw, Clock, X, Loader2 } from "lucide-react";
import pickupImage from "../../../assets/dashboard/pickup.webp"

import EditSubscriptionModal from "../../../components/shared/modal/EditSubscriptionModal";
import { useDashboardSubscription } from "../../../hooks/useDashboardSubscription";
import { subscriptionAPI } from "../../../services/api";
import { parseDateSafe, formatDateObj } from "../../../utils/dateHelpers";

interface LeftComponent {
    successful: boolean;
    upcomingPage?: boolean;
    setSuccessful: (value: boolean) => void;
    setSchedulePage?: React.Dispatch<React.SetStateAction<boolean>>;
    setUpcomingPage?: React.Dispatch<React.SetStateAction<boolean>>;
}

const BagProgressRing = ({ used, total }: { used: number; total: number }) => {
    const size = 80;
    const stroke = 6;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = total > 0 ? Math.min(used / total, 1) : 0;
    const [currentOffset, setCurrentOffset] = useState(circumference);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setCurrentOffset(circumference - progress * circumference);
        }, 100);
        return () => clearTimeout(timeout);
    }, [progress, circumference]);

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                {}
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke="#E2F0E7" strokeWidth={stroke} />
                {}
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke="url(#bagGradient)" strokeWidth={stroke}
                    strokeLinecap="round" strokeDasharray={circumference}
                    strokeDashoffset={currentOffset}
                    className="transition-all duration-1000 ease-out" />
                <defs>
                    <linearGradient id="bagGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#83faceff" />
                        <stop offset="100%" stopColor="#6EE7B7" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                <span className="text-xl font-bold text-[#064E3B]">{used}</span>
                <span className="text-xs text-[#047857] font-medium opacity-60">/</span>
                <span className="text-xs text-[#047857] font-medium opacity-60">{total}</span>
            </div>
        </div>
    );
};

const DashboardLeftColumn: React.FC<LeftComponent> = ({ successful, setSuccessful }) => {
    const { activeSubscription, refresh, pendingChange } = useDashboardSubscription();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReverting, setIsReverting] = useState(false);
    const [isCancellingPending, setIsCancellingPending] = useState(false);

    
    const [modalSubscription, setModalSubscription] = useState(activeSubscription);

    if (activeSubscription && activeSubscription !== modalSubscription) {
        setModalSubscription(activeSubscription);
    }

    
    const daysUntilRenewal = useMemo(() => {
        if (!activeSubscription) return null;
        const dateStr = activeSubscription.status === 'cancelled_pending'
            ? activeSubscription.end_date
            : activeSubscription.next_renewal_date;
        if (!dateStr) return null;
        const target = parseDateSafe(dateStr);
        const now = new Date();
        const diff = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return diff;
    }, [activeSubscription]);

    const isCancelling = activeSubscription?.status === 'cancelled_pending';
    const bankedBags = activeSubscription?.bags?.balance ?? 0;

    const hasContent = successful || (activeSubscription && (activeSubscription.status === 'active' || activeSubscription.status === 'cancelled_pending'));

    return (
        <div className="xl:col-span-1 mx-auto w-full">
            {
                successful ? (
                    <div className="w-full">
                        <div className="rounded-xl bg-[#F5FCFF] px-2 py-4">
                            <div className="max-w-90 mx-auto">
                                <img className="w-full" src={pickupImage} alt="pickupImage" />
                            </div>
                            <p className="text-[#2F393D] font-semibold text-base text-center my-4">Hey, Need Another Service?</p>
                            <div className="flex items-center justify-center">
                                <button onClick={() => setSuccessful(false)} className="bg-[#00A7EE] hover:bg-[#0099d3] text-[#FFFFFF] w-full py-4 rounded-full">
                                    Schedule Another Pickup
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null
            }

            {}
            {activeSubscription && (activeSubscription.status === 'active' || activeSubscription.status === 'cancelled_pending') && (
                <div
                    className="group mt-8 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
                    style={{
                        background: isCancelling
                            ? 'linear-gradient(135deg, #FFFDF5 0%, #FFF8E1 100%)'
                            : 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 50%, #F0FDFA 100%)',
                    }}
                >
                    {}
                    <div className="rounded-t-2xl px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between"
                        style={{
                            background: isCancelling
                                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                                : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-white/80" />
                            <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                                {activeSubscription.plan.name.includes('Subscribe & Save')
                                    ? activeSubscription.plan.name.replace('Subscribe & Save ', 'Subscribe & Save · ')
                                    : activeSubscription.plan.name}
                            </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${
                            isCancelling
                                ? 'bg-white/20 text-white'
                                : 'bg-white/20 text-white'
                        }`}>
                            {isCancelling ? 'Cancelling' : 'Active'}
                        </span>
                    </div>

                    {}
                    <div className="p-5">

                        {}
                        <div className="flex items-start gap-4">
                            {}
                            <div className="flex flex-col items-center shrink-0">
                                <BagProgressRing
                                    used={activeSubscription.bags.used ?? 0}
                                    total={activeSubscription.plan.bags_per_month ?? 1}
                                />
                                <span className="text-[10px] font-semibold text-[#4B7A64] mt-1.5 uppercase tracking-wider">
                                    This Month
                                </span>
                            </div>

                            {}
                            <div className="flex-1 min-w-0 space-y-2.5">
                                {}
                                <div className="bg-white/70 backdrop-blur-sm rounded-xl px-3.5 py-2.5 border border-emerald-100/60">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <CalendarClock size={12} className={isCancelling ? 'text-amber-500' : 'text-emerald-500'} />
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                            {isCancelling
                                                ? 'Ends On'
                                                : `${activeSubscription.billing_cycle === 'monthly' ? 'Monthly' : 'Annual'} Renewal`}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-base font-bold text-[#064E3B]">
                                            {isCancelling
                                                ? formatDateObj(parseDateSafe(activeSubscription.end_date))
                                                : formatDateObj(parseDateSafe(activeSubscription.next_renewal_date))}
                                        </span>
                                        {daysUntilRenewal !== null && (
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                                isCancelling
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : daysUntilRenewal <= 7
                                                        ? 'bg-orange-100 text-orange-700'
                                                        : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {daysUntilRenewal === 0 ? 'Today' : `${daysUntilRenewal}d`}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {}
                                {!isCancelling && (
                                    <div className="bg-white/70 backdrop-blur-sm rounded-xl px-3.5 py-2.5 border border-emerald-100/60">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <TrendingUp size={12} className="text-emerald-500" />
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                                Plan Details
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Price per bag</span>
                                                <span className="font-bold text-[#064E3B]">${Math.round(activeSubscription.plan.price_per_bag)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Billing Cycle</span>
                                                <span className="font-bold text-[#064E3B] capitalize">{activeSubscription.billing_cycle}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Included Bags</span>
                                                <span className="font-bold text-[#064E3B]">{activeSubscription.plan.bags_per_month}/mo</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {}
                        {(activeSubscription.credit_lbs !== undefined) ? (
                            <div className="mt-3 flex items-center gap-2 bg-emerald-50/80 border border-emerald-200/50 rounded-lg px-3 py-2">
                                <Package size={14} className="text-emerald-500 shrink-0" />
                                <span className="text-xs font-medium text-emerald-700">
                                    +{activeSubscription.credit_lbs} LBS Light Bag credits available
                                </span>
                            </div>
                        ) : null}

                        {}
                        {isCancelling && (
                            <div className="mt-3 bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2 text-xs text-amber-700">
                                Your Subscriptoin will be cancel soon.<br/><br/>
                                You can undo this below
                            </div>
                        )}

                        {}
                        {pendingChange && !isCancelling && (
                            <div className="mt-3 bg-amber-50 border border-amber-200/60 rounded-lg p-3">
                                <div className="flex items-start gap-2 mb-2">
                                    <Clock className="text-amber-500 shrink-0 mt-0.5" size={14} />
                                    <div>
                                        <p className="text-xs font-semibold text-amber-800">
                                            {pendingChange.plan.bags_per_month < (activeSubscription?.plan.bags_per_month ?? 0)
                                                ? 'Pending Downgrade'
                                                : 'Pending Upgrade'}
                                        </p>
                                        <p className="text-[10px] text-amber-700 mt-0.5">
                                            To <strong>{pendingChange.plan.name}</strong> on <strong>{formatDateObj(parseDateSafe(pendingChange.start_date))}</strong>.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!confirm('Are you sure you want to cancel this pending plan change?')) return;
                                        setIsCancellingPending(true);
                                        try {
                                            await subscriptionAPI.cancelPendingChange();
                                            await refresh();
                                        } catch {
                                            alert('Failed to cancel pending change.');
                                        } finally {
                                            setIsCancellingPending(false);
                                        }
                                    }}
                                    disabled={isCancellingPending}
                                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition-colors border border-amber-300 shadow-sm"
                                >
                                    {isCancellingPending ? <Loader2 className="animate-spin" size={14} /> : <X size={14} />}
                                    Cancel Change
                                </button>
                            </div>
                        )}

                        {}
                        <div className="mt-4">
                            {isCancelling ? (
                                <button
                                    onClick={async () => {
                                        setIsReverting(true);
                                        try {
                                            await subscriptionAPI.revertCancel(activeSubscription.id);
                                            refresh();
                                        } catch {
                                            alert('Failed to undo cancellation. Please try again.');
                                        } finally {
                                            setIsReverting(false);
                                        }
                                    }}
                                    disabled={isReverting}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow disabled:opacity-60"
                                >
                                    <RotateCcw size={14} className={isReverting ? 'animate-spin' : ''} />
                                    {isReverting ? 'Restoring…' : 'Undo Cancellation'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm hover:shadow group-hover:border-emerald-300"
                                >
                                    Edit Subscription
                                    <ChevronRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {modalSubscription && (
                <EditSubscriptionModal
                    isOpen={isEditModalOpen}
                    setIsOpen={setIsEditModalOpen}
                    subscription={modalSubscription}
                    onUpdated={refresh}
                />
            )}
        </div>
    );
};

export default DashboardLeftColumn;