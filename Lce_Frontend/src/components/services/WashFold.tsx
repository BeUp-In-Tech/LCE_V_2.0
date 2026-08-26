import { useState, useEffect } from 'react'
import { CheckCircle, CreditCard, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import loundrayImage from "../../assets/dashboard/WashImage.webp";
import ChangePlanModal from '../shared/modal/ChangePlanModal';
import EditSubscriptionModal from '../shared/modal/EditSubscriptionModal';
import AddPaymentModal from '../shared/modal/AddPaymentModal';
import { subscriptionAPI, utilityAPI } from '../../services/api';
import { useDashboardSubscription } from '../../hooks/useDashboardSubscription';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../Toast';

type WashFoldProps = {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    onServiceChange?: (service: { type: 'paygo' | 'subscribe', price: number, planId?: number }) => void;
}

interface SelectedPlan {
    bags: number;
    pricePerBag: number;
    totalPrice: number;
    annualSavings: number;
    planId: number;
    billingCycle: 'monthly' | 'annual';
}

const WashFold: React.FC<WashFoldProps> = ({ checked, onCheckedChange, onServiceChange }) => {

    const { activeSubscription, refresh: refreshSubscription } = useDashboardSubscription();
    const { user, refreshUser } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [internalChecked, setInternalChecked] = useState<boolean>(false);
    const [selectedService, setSelectedService] = useState<string>('');
    const isChecked = typeof checked === 'boolean' ? checked : internalChecked;
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
    const [pendingPlanDetails, setPendingPlanDetails] = useState<{ planId: number; price: number; bags: number; billingCycle: 'monthly' | 'annual'; yearlySavings: number } | null>(null);
    const [isSubscribing, setIsSubscribing] = useState(false);

    
    const [ppoRate, setPpoRate] = useState<number>(3.39);
    const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>({
        bags: 1,
        pricePerBag: 70,
        totalPrice: 70,
        annualSavings: 126,
        planId: 5,
        billingCycle: 'annual'
    });

    
    useEffect(() => {
        const fetchPricing = async () => {
            try {
                
                const pricesRes = await utilityAPI.getPrices();
                if (pricesRes.data?.base_rate) {
                    setPpoRate(pricesRes.data.base_rate);
                }

                
                const plansRes = await subscriptionAPI.getPlans();
                const plans = plansRes.data?.plans || [];
                const defaultPlan = plans.find((p: { bags_per_month: number; billing_cycle: string }) =>
                    p.bags_per_month === 1 && p.billing_cycle === 'annual'
                );
                if (defaultPlan) {
                    setSelectedPlan({
                        bags: defaultPlan.bags_per_month,
                        pricePerBag: Math.round(defaultPlan.price_per_bag),
                        totalPrice: Math.round(defaultPlan.monthly_total),
                        annualSavings: Math.round(defaultPlan.annual_savings),
                        planId: defaultPlan.id,
                        billingCycle: 'annual'
                    });
                }
            } catch (err) {
                console.error('Failed to fetch pricing:', err);
            }
        };
        fetchPricing();
    }, []);

    const handleCheckedChange = (value: boolean) => {
        if (onCheckedChange) onCheckedChange(value);
        else setInternalChecked(value);
    }

    return (
        <div className={` rounded-2xl ${checked ? 'border border-[#e8ecec] p-4' : ''} `}>
            <label onClick={() => handleCheckedChange(!isChecked)} className={`flex justify-between gap-3 cursor-pointer border rounded-xl p-4 transition-all duration-200 ${isChecked ? 'bg-[#E6F6FD] border-[#00A7EE]' : 'border-[#EBECEC] bg-white'} `}>
                <div className='flex gap-x-4'>
                    <div className='pt-2'>
                        {isChecked ? (
                            <div className="w-5 h-5 bg-[#00A7EE] rounded-md flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-white">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        ) : (
                            <div className='w-5 h-5 border-2 rounded-md border-[#00A7EE]'></div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row ">
                        <div className="flex-1">
                            <h1 className="text-[#2F393D] text-lg sm:text-xl font-semibold">
                                Wash & Fold Laundry
                            </h1>
                            <p className="text-base max-w-[80%] text-[#4B5457] leading-[150%] roboto-flex mt-1">
                                You can Pay Per Order or Subscribe & Save. Choose what fits for you...
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-19 ">
                    <img src={loundrayImage} className="w-full" alt="loundray image" />
                </div>
            </label>
            {
            isChecked && (
                activeSubscription ? (
                                        <div className="mt-4 border flex justify-between border-[#00A7EE] bg-[#E6F6FD] rounded-xl p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 bg-[#00A7EE] rounded-full flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-white">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                    <h3 className="text-[#2F393D] text-lg font-semibold">Active Subscription</h3>
                                </div>

                                <div className="ml-8 space-y-1">
                                    <p className="text-sm text-[#4B5457]">
                                        <span className="font-semibold text-[#2F393D]">{activeSubscription.plan.name}</span>
                                        {' '}&mdash;{' '}
                                        <span className="font-medium">{activeSubscription.plan.bags_per_month} Bag{activeSubscription.plan.bags_per_month > 1 ? 's' : ''}/month</span>
                                    </p>
                                    <p className="text-sm text-[#4B5457]">
                                        <span className="font-semibold text-[#2F393D]">${Math.round(activeSubscription.plan.price_per_bag)}</span>/bag
                                        {' '}&bull;{' '}
                                        Billed <span className="capitalize">{activeSubscription.billing_cycle}</span>
                                    </p>
                                    <p className="text-xs text-[#4B5457] mt-1">
                                        Bags used: <span className="font-medium">{activeSubscription.bags.used}</span> / <span className="font-medium">{activeSubscription.bags.total}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                    <div>
                            <button
                            type="button"
                            onClick={() => setIsOpen(true)}
                            className="mt-4 w-full sm:w-auto flex items-center justify-center rounded-lg border border-[#00A7EE]/30 bg-white px-5 py-2.5 text-sm font-medium text-[#00A7EE] hover:bg-[#00A7EE]/10 hover:border-[#00A7EE]/50 transition-all duration-200 cursor-pointer"
                        >
                            Upgrade / Change Plan
                        </button>
                    </div>

                        {isOpen && <EditSubscriptionModal
                            isOpen={isOpen}
                            setIsOpen={setIsOpen}
                            subscription={activeSubscription}
                            onUpdated={() => {
                                refreshSubscription();
                            }}
                        />}
                    </div>
                ) : (
                    <>
                    {/* ── NO SUBSCRIPTION — SHOW PAYGO / SUBSCRIBE OPTIONS ── */}
                    <div className="relative flex flex-col sm:flex-row gap-4 mt-6">
                        {/* Pay Per Order */}
                        <div
                            onClick={() => {
                                setSelectedService("paygo");
                                if (onServiceChange) onServiceChange({ type: 'paygo', price: 0 });
                            }}
                            className={`flex-1 border rounded-2xl p-5 cursor-pointer transition-all duration-300 ${selectedService === "paygo"
                                ? "border-[#00A7EE] bg-[#F0F9FF] ring-1 ring-[#00A7EE]"
                                : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                                }`}>
                            <div className="flex flex-col h-full">
                                <h3 className="text-[#2F393D] text-xl font-bold mb-1">Pay Per Order</h3>
                                <p className="text-xl font-bold text-[#2F393D] mb-1">
                                    ${ppoRate.toFixed(2)} <span className="text-slate-500 text-sm font-normal">/pound</span>
                                </p>
                                <p className="text-slate-500 text-sm">Fast and flexible</p>
                            </div>
                        </div>

                        {}
                        <div className="hidden sm:flex items-center justify-center relative px-2">
                            <div className="absolute inset-y-0 left-1/2 w-px bg-slate-200"></div>
                            <div className="relative bg-white px-2 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                                OR
                            </div>
                        </div>
                        <div className="flex sm:hidden items-center justify-center py-2">
                            <div className="absolute left-0 right-0 h-px bg-slate-200"></div>
                            <div className="relative bg-white px-3 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                                OR
                            </div>
                        </div>

                        {}
                        <div
                            onClick={() => {
                                setSelectedService("subscribe");
                                if (onServiceChange) onServiceChange({ type: 'subscribe', price: selectedPlan.totalPrice, planId: selectedPlan.planId });
                            }}
                            className={`flex-1 border rounded-2xl p-5 cursor-pointer transition-all duration-300 ${selectedService === "subscribe"
                                ? "border-[#00A7EE] bg-[#F0F9FF] ring-1 ring-[#00A7EE]"
                                : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                                }`}>
                            <div className="flex flex-col h-full">
                                <h3 className="text-[#2F393D] text-xl font-bold mb-1">Subscribe & Save!</h3>
                                
                                {selectedService === 'subscribe' ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-lg font-bold text-[#2F393D]">{selectedPlan.bags} Bag/mo</span>
                                            <div className="text-right">
                                                <span className="text-xl font-bold text-[#2F393D]">${selectedPlan.pricePerBag}</span>
                                                <span className="text-slate-500 text-sm">/bag</span>
                                            </div>
                                        </div>
                                        {selectedPlan.billingCycle === 'annual' && (
                                            <p className="text-[11px] text-slate-500">
                                                pay annually <span className="text-emerald-500 font-bold">Save ${selectedPlan.annualSavings}/ yr</span>
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsOpen(true);
                                            }}
                                            className="w-full mt-3 py-1.5 bg-white border border-[#00A7EE] text-[#00A7EE] text-xs font-bold rounded-xl hover:bg-[#F0F9FF] transition-colors"
                                        >
                                            Change Plan
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-slate-500 text-sm">1, 2, 4, & 8 Bags/month</p>
                                        <p className="text-[#2F393D] text-sm font-medium">
                                            From <span className="text-lg font-bold">$54</span> <span className="text-slate-500 text-sm font-normal">/bag</span>
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                            pay annually <span className="text-emerald-500 font-bold">Save $113/ yr</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {isOpen && (
                        <ChangePlanModal
                            isOpen={isOpen}
                            setIsOpen={setIsOpen}
                            currentPlanId={undefined}
                            currentBillingCycle={undefined}
                            nextCronDate={(activeSubscription as any)?.next_cron_date}
                            onPlanChanged={(planDetails) => {
                                if (planDetails.planId === 0) {
                                    setSelectedService('paygo');
                                    if (onServiceChange) onServiceChange({ type: 'paygo', price: 0 });
                                } else {
                                    setPendingPlanDetails(planDetails);
                                    setShowConfirmation(true);
                                }
                            }}
                        />
                    )}

                        {}
                        {showConfirmation && pendingPlanDetails && (
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
                                            <span className="font-medium text-[#2F393D]">{pendingPlanDetails.bags} Bag{pendingPlanDetails.bags > 1 ? 's' : ''} / month</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Billing Cycle</span>
                                            <span className="font-medium text-[#2F393D] capitalize">{pendingPlanDetails.billingCycle}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Price per bag</span>
                                            <span className="font-medium text-[#2F393D]">${Math.round(pendingPlanDetails.price / pendingPlanDetails.bags)}</span>
                                        </div>
                                        {pendingPlanDetails.billingCycle === 'annual' && pendingPlanDetails.yearlySavings > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Annual Savings</span>
                                                <span className="font-medium text-green-600">${pendingPlanDetails.yearlySavings}</span>
                                            </div>
                                        )}
                                        <hr className="border-slate-200" />
                                        <div className="flex justify-between text-base">
                                            <span className="font-semibold text-[#2F393D]">Total Charge Today</span>
                                            <span className="font-bold text-[#2F393D]">
                                                ${pendingPlanDetails.billingCycle === 'annual'
                                                    ? (pendingPlanDetails.price * 12 - pendingPlanDetails.yearlySavings).toLocaleString()
                                                    : pendingPlanDetails.price.toLocaleString()}
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
                                            disabled={isSubscribing}
                                            onClick={async () => {
                                                if (!user?.payment?.card_last_four) {
                                                    setShowAddPaymentModal(true);
                                                    return;
                                                }
                                                setIsSubscribing(true);
                                                try {
                                                    await subscriptionAPI.create({
                                                        plan_id: pendingPlanDetails.planId,
                                                        billing_cycle: pendingPlanDetails.billingCycle,
                                                    });
                                                    toast.showSuccess('Subscription activated successfully!');
                                                    setShowConfirmation(false);
                                                    
                                                    setSelectedPlan({
                                                        bags: pendingPlanDetails.bags,
                                                        pricePerBag: pendingPlanDetails.price / pendingPlanDetails.bags,
                                                        totalPrice: pendingPlanDetails.price,
                                                        annualSavings: selectedPlan.annualSavings,
                                                        planId: pendingPlanDetails.planId,
                                                        billingCycle: pendingPlanDetails.billingCycle
                                                    });
                                                    if (onServiceChange) onServiceChange({ type: 'subscribe', price: pendingPlanDetails.price, planId: pendingPlanDetails.planId });
                                                    await refreshSubscription();
                                                } catch (err: unknown) {
                                                    const error = err as { response?: { data?: { message?: string; error?: string } } };
                                                    const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to subscribe. Please try again.';
                                                    toast.showError(errorMessage);
                                                } finally {
                                                    setIsSubscribing(false);
                                                }
                                            }}
                                            className="flex-1 py-2.5 bg-[#00aeef] hover:bg-[#0096ce] text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isSubscribing && <Loader2 className="animate-spin" size={16} />}
                                            {user?.payment?.card_last_four ? 'Confirm & Pay' : 'Add Payment Method'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}


                    </>
                )
            )
        }

        {showAddPaymentModal && (
            <AddPaymentModal
                isOpen={showAddPaymentModal}
                setIsOpen={setShowAddPaymentModal}
                onSuccess={async () => {
                    setShowAddPaymentModal(false);
                    if (refreshUser) await refreshUser(); 
                    toast.showSuccess('Payment method added successfully!');
                }}
            />
        )}
        </div>
    )
}

export default WashFold