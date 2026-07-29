import { useState, useEffect, useRef } from "react";
import learnMore from "../../../assets/svg/learn-more.svg"
import { Link } from "react-router-dom";
import { Box, CalendarDays, Car, MapPinMinus, SquarePen, Loader2, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import cardImage from "../../../assets/dashboard/payment-card.webp"
import SchedualModal, { type BookingData } from "../../../components/shared/modal/SchedualModal";
import { addBusinessDays, addAvailableDays, isAvailablePickupDay, getDefaultBookingData, parseDateSafe, getPTDate, formatDateShort } from "../../../utils/dateHelpers";
import Upcommingpickup from "../../../components/dashboard/Upcommingpickup";
import AddressEditModal from "../../../components/shared/modal/AddressEditModal";
import DashboardLeftColumn from "./DashboardLeftColumn";
import SchedulePickup from "./SchedulePickup";
import WashFold from "../../../components/services/WashFold";
import ServiceCard from "../../../components/services/ServiceCard";
import ShowPriceModal from "../../../components/shared/modal/price/ShowPriceModal";
import DryCleaningPriceModal from "../../../components/shared/modal/price/DryCleaningPriceModal";
import LearnMoreModal from "../../../components/shared/modal/LearnMoreModal";
import { userAPI, recurringScheduleAPI, pickupAPI, type Pickup, type RecurringScheduleResponse } from "../../../services/api";
import { useAuth } from "../../../context/useAuth";
import { useToast } from "../../../components/Toast";
import { usePickups, usePromos, useRecurringSchedule, usePaymentMethods, usePickupZone, queryKeys } from "../../../hooks/useQueries";
import { DashboardSkeleton } from "../../../components/ui/Skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardSubscription } from "../../../hooks/useDashboardSubscription";

const Dashboards = () => {
    const { user, refreshUser } = useAuth();
    const toast = useToast();
    const qc = useQueryClient();

    
    const { data: pickupData, isLoading: pickupsLoading } = usePickups();
    const { data: promoData } = usePromos();
    const { data: pmData } = usePaymentMethods();
    const { data: scheduleData } = useRecurringSchedule();
    const { activeSubscription } = useDashboardSubscription();

    
    const userZip = user?.address?.zip;
    const { data: zoneData } = usePickupZone(userZip);
    const availableDays: string[] | undefined = zoneData?.available_days;
    const nonWorkingDays: string[] | undefined = zoneData?.non_working_days;

    const isLoading = pickupsLoading;

    const [washFoldChecked, setWashFoldChecked] = useState<boolean>(false);
    const [hangDryChecked, setHangDryChecked] = useState<boolean>(false);
    const [dryCleaningChecked, setDryCleaningChecked] = useState<boolean>(false);
    const [selectedService] = useState<string>('');
    const [schedule, setSchedule] = useState(false);





    const [data, setData] = useState<BookingData | null>(getDefaultBookingData(availableDays, nonWorkingDays));
    const [isEditAddress, setIsEditAddress] = useState<boolean>(false);
    const [overrideShowSchedule, setOverrideShowSchedule] = useState(false);

    // Derived state from React Query cache
    const allPickups: Pickup[] = pickupData?.pickups || [];
    const upcomingPickups = allPickups
        .filter((p: Pickup) => {
            const excludedStatuses = ['cancelled', 'delivered', 'completed', 'nolaundry', 'hold', 'done'];
            if (excludedStatuses.includes(p.status.toLowerCase())) return false;
            
            const ptToday = getPTDate();
            ptToday.setHours(0, 0, 0, 0);
            
            const pickupDate = parseDateSafe(p.pickup_date);
            pickupDate.setHours(0, 0, 0, 0);
            
            return pickupDate.getTime() >= ptToday.getTime();
        })
        .sort((a, b) => new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime());

    const [upcomingPage, setUpcomingPage] = useState<boolean>(false);
    const [scheduledPage, setSchedulePage] = useState<boolean>(false);
    const [isHangDryModalOpen, setIsHangDryModalOpen] = useState<boolean>(false);
    const [isDryCleaningModalOpen, setIsDryCleaningModalOpen] = useState<boolean>(false);
    const [isLearnMoreModalOpen, setIsLearnMoreModalOpen] = useState<boolean>(false);
    const [washFoldConfig, setWashFoldConfig] = useState<{ type: 'paygo' | 'subscribe', price: number, planId?: number }>({ type: 'paygo', price: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    interface ActivePromo {
        code: string;
        description?: string;
        type?: string;
        value?: number;
    }
    const activePromo: ActivePromo | null = promoData?.promo_codes?.[0] || null;
    const recurringSchedule: RecurringScheduleResponse | null = scheduleData || null;

    
    const userChangedSchedule = useRef(false);

    const [bannerPickupIndex, setBannerPickupIndex] = useState(0);

    
    
    
    
    
    useEffect(() => {
        if (availableDays && availableDays.length > 0 && !userChangedSchedule.current && !recurringSchedule?.has_recurring) {
            setData(getDefaultBookingData(availableDays, nonWorkingDays));
        }
    }, [availableDays, nonWorkingDays, recurringSchedule?.has_recurring]);

    
    useEffect(() => {
        if (recurringSchedule?.has_recurring && !userChangedSchedule.current) {
            let type: "weekly" | "one-time" | "bi-weekly" = 'one-time';
            let freq = 'Weekly';
            
            if (recurringSchedule.schedule_type === 'weekly') {
                type = 'weekly';
                freq = 'Weekly';
            } else if (recurringSchedule.schedule_type === 'bi_weekly' || recurringSchedule.schedule_type === 'bi-weekly') {
                type = 'weekly'; 
                freq = 'biweekly';
            }

            const reverseDayMap: Record<string, 'Mon'|'Tue'|'Wed'|'Thu'|'Fri'> = {
                'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri'
            };
            
            
            const shortDays = recurringSchedule.days
                .map(d => reverseDayMap[d])
                .filter((d): d is 'Mon'|'Tue'|'Wed'|'Thu'|'Fri' => Boolean(d));

            
            setData({
                service: '', 
                delivaryType: type,
                date: shortDays,
                frequency: freq,
                fullDate: (recurringSchedule as any).start_date || '',
                start_date: (recurringSchedule as any).start_date
            });
        }
    }, [recurringSchedule]);

    useEffect(() => {
        // Restore service selections saved during signup (Step 2)
        const saved = localStorage.getItem('selectedServices');
        if (saved) {
            try {
                const selections = JSON.parse(saved);
                if (selections.washFold) setWashFoldChecked(true);
                if (selections.hangDry) setHangDryChecked(true);
                if (selections.dryCleaning) setDryCleaningChecked(true);
                localStorage.removeItem('selectedServices');
            } catch {
                
            }
        }
    }, []);

    const refreshDashboard = () => {
        qc.invalidateQueries({ queryKey: queryKeys.pickups });
        qc.invalidateQueries({ queryKey: queryKeys.promos });
        qc.invalidateQueries({ queryKey: queryKeys.recurringSchedule });
        qc.invalidateQueries({ queryKey: queryKeys.services });
        qc.invalidateQueries({ queryKey: queryKeys.subscriptions });
    };

    const handleOk = async (newData: BookingData) => {
        console.log(newData);
        userChangedSchedule.current = true;
        setData(newData);

        try {
            
            
            let scheduleType = newData.delivaryType;
            if (scheduleType === 'weekly' && newData.frequency === 'biweekly') {
                scheduleType = 'bi-weekly';
            }

            const response = await recurringScheduleAPI.update({
                schedule_type: scheduleType,
                days: Array.isArray(newData.date) ? newData.date : [],
                start_date: newData.fullDate
            });

            if (response.data && response.data.warning) {
                alert(response.data.warning);
            }

            
            refreshDashboard();
        } catch (error) {
            console.error("Failed to save schedule", error);
        }
    }

    const handleAddressEdit = (): void => {
        setIsEditAddress(true);
    };

    interface AddressFormData {
        street: string;
        cityName: string;
        zipcode: string;
        aptno: string;
        stateName?: string;
    }

    const handleAddressUpdate = async (updatedAddress: AddressFormData) => {
        try {
            await userAPI.updateAddress({
                street: updatedAddress.street,
                city: updatedAddress.cityName,
                zip: updatedAddress.zipcode,
                apt: updatedAddress.aptno,
                state: updatedAddress.stateName
            });
            await refreshUser();
            
            refreshDashboard();
            setIsEditAddress(false);
        } catch (err) {
            console.error("Failed to update address", err);
        }
    };


    const handleOnSubmit = async () => {
        if (isSubmitting) return; 
        setIsSubmitting(true);
        try {
            if (!data || !data.fullDate) {
                toast.showWarning("Please schedule a time first.");
                setIsSubmitting(false);
                return;
            }

            
            const hasValidAddress = user?.address?.street &&
                user?.address?.zip &&
                user?.address?.city;

            if (!hasValidAddress) {
                toast.showWarning("Please add a valid pickup address before scheduling.");
                setIsSubmitting(false);
                return;
            }

            const pickupDate = data.fullDate;

            
            
            let type: 'wf' | 'dc' | 'both' | 'hd' | 'wf_hd' | 'hd_dc' | 'all' = 'wf';

            if (washFoldChecked && hangDryChecked && dryCleaningChecked) {
                type = 'all';  
            } else if (washFoldChecked && dryCleaningChecked) {
                type = 'both';  
            } else if (washFoldChecked && hangDryChecked) {
                type = 'wf_hd';  
            } else if (hangDryChecked && dryCleaningChecked) {
                type = 'hd_dc';  
            } else if (dryCleaningChecked) {
                type = 'dc';  
            } else if (hangDryChecked) {
                type = 'hd';  
            } else {
                type = 'wf';  
            }

            if (!washFoldChecked && !dryCleaningChecked && !hangDryChecked) {
                toast.showWarning("Please select at least one service (Wash & Fold, Hang Dry, or Dry Cleaning).");
                setIsSubmitting(false);
                return;
            }

            
            

            
            let paymentAmount = 0;
            const descParts: string[] = [];

            
            if (washFoldChecked) {
                if (washFoldConfig.type === 'subscribe') {
                    
                    paymentAmount += 0;
                    descParts.push(`Subscription: ${washFoldConfig.planId} Bag Plan (Billed Later)`);
                } else {
                    
                    paymentAmount += 0;
                    descParts.push(`Pay Per Order`);
                }
            }

            
            
            if (hangDryChecked) {
                descParts.push("Hang Dry - Pay Per Order (charged after processing)");
            }

            if (dryCleaningChecked) {
                descParts.push("Dry Cleaning/Launder & Press - Pay Per Order (charged after processing)");
            }

            let paymentDescription = descParts.join(" + ");
            if (!paymentDescription) paymentDescription = "Pickup Service";

            
            paymentAmount = parseFloat(paymentAmount.toFixed(2));

            console.log('Payment Amount:', paymentAmount); 

            
            let service_type: 'one_time' | 'weekly' | 'bi_weekly' = 'one_time';
            let preferred_day = '';

            if (data.delivaryType === 'weekly') {
                
                if (data.frequency === 'biweekly') {
                    service_type = 'bi_weekly';
                } else {
                    service_type = 'weekly';
                }
                if (Array.isArray(data.date)) {
                    preferred_day = data.date.join(',');
                }
            }

            
            const response = await pickupAPI.create({
                pickup_date: pickupDate,
                pickup_type: type,
                service_type: service_type,
                preferred_day: preferred_day,
                driver_instructions: '',
                payment_amount: paymentAmount, // Dynamic amount
                payment_description: paymentDescription,
                subscription_plan_id: washFoldConfig.type === 'subscribe' ? washFoldConfig.planId : undefined
            });

            
            const paymentInfo = response.data.payment;
            if (paymentInfo && paymentInfo.success) {
                toast.showSuccess(`Pickup scheduled successfully! Payment of $${paymentInfo.amount.toFixed(2)} processed.`);
            } else {
                toast.showSuccess("Pickup request created successfully!");
            }

            
            refreshDashboard();
            
            setOverrideShowSchedule(false);
            setWashFoldChecked(false);
            setHangDryChecked(false);
            setDryCleaningChecked(false);
            setData(getDefaultBookingData(availableDays, nonWorkingDays));

        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string; error?: string; code?: string } } };
            console.error("Failed to create pickup", error);

            const errorCode = err.response?.data?.code;
            const errorMsg = err.response?.data?.error || err.response?.data?.message || "Unknown error";

            if (errorCode === 'NO_PAYMENT_METHOD') {
                toast.showError("No payment method on file. Please add a card in the Payment section first.");
            } else if (errorCode === 'PAYMENT_FAILED') {
                toast.showError(`Payment failed: ${errorMsg}. Please check your payment method.`);
            } else {
                toast.showError(`Failed to create pickup: ${errorMsg}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    }


    const hasActivePickup = upcomingPickups.length > 0;
    
    const userAddress = (user?.address?.street || user?.address?.city || user?.address?.zip)
        ? [user.address.street, user.address.city, user.address.zip].filter(Boolean).join(', ')
        : "No address set";


    const getDateInfo = () => {
        const today = getPTDate();
        const formatPickupDisplay = (d: Date) => {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
        };

        
        const frequency = data?.delivaryType?.toLowerCase();
        if ((frequency === 'weekly' || frequency === 'bi-weekly') && Array.isArray(data?.date) && data.date.length > 0) {
            const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

            
            const upcomingDates: Date[] = [];
            for (const dayName of data.date) {
                const target = dayMap[dayName];
                if (target === undefined) continue;
                
                const todayIndex = today.getDay();
                let diff = (target - todayIndex + 7) % 7;
                
                if (diff === 0 && today.getHours() >= 8) diff = 7;
                
                let candidate = new Date(today);
                candidate.setDate(today.getDate() + diff);
                
                
                let safetyCounter = 0;
                while (!isAvailablePickupDay(candidate, availableDays, nonWorkingDays) && safetyCounter < 10) {
                    candidate.setDate(candidate.getDate() + 7);
                    safetyCounter++;
                }

                
                if (frequency === 'bi-weekly' && data.start_date) {
                    const startDate = new Date(data.start_date);
                    startDate.setHours(0,0,0,0);
                    
                    const checkDate = new Date(candidate);
                    checkDate.setHours(0,0,0,0);
                    
                    
                    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
                    const diffInWeeks = Math.round(Math.abs(checkDate.getTime() - startDate.getTime()) / msPerWeek);
                    
                    
                    if (diffInWeeks % 2 !== 0) {
                        candidate.setDate(candidate.getDate() + 7);
                        
                        let safetyCounter2 = 0;
                        while (!isAvailablePickupDay(candidate, availableDays, nonWorkingDays) && safetyCounter2 < 10) {
                            candidate.setDate(candidate.getDate() + 7);
                            safetyCounter2++;
                        }
                    }
                }

                upcomingDates.push(candidate);
            }

            
            upcomingDates.sort((a, b) => a.getTime() - b.getTime());

            const nearestPickup = upcomingDates[0] || today;
            const deliveryDate = addAvailableDays(nearestPickup, 1, availableDays, nonWorkingDays);

            return {
                pickup: formatPickupDisplay(nearestPickup),
                delivery: formatPickupDisplay(deliveryDate),
                pickupDate: formatDateShort(nearestPickup),
                headerDate: upcomingDates.map(d => formatDateShort(d)).join(' & '),
                headerDays: data.date.join(' , ')
            };
        }

        
        let current = today;
        if (data?.fullDate) {
            const [y, m, d] = data.fullDate.split('-').map(Number);
            current = new Date(y, m - 1, d);
        }

        const next = addAvailableDays(current, 1, availableDays, nonWorkingDays);

        return {
            pickup: formatPickupDisplay(current),
            delivery: formatPickupDisplay(next),
            pickupDate: formatDateShort(current)
        };
    };

    const dateInfo = getDateInfo();

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const hasPaymentReminder = !(pmData?.has_payment_method ?? user?.payment?.has_payment_method);
    const hasSuccessfulPickup = hasActivePickup && !overrideShowSchedule;
    const hasActiveSub = activeSubscription && (activeSubscription.status === 'active' || activeSubscription.status === 'cancelled_pending');
    
    const showLeftColumn = hasPaymentReminder || hasSuccessfulPickup || hasActiveSub;

    return (
        <div>
            {
                scheduledPage && <Upcommingpickup pickups={upcomingPickups} onRefresh={refreshDashboard} />
            }
            <div className="mt-5 px-4 sm:mt-0 sm:px-6 lg:px-8 max-w-7xl mx-auto">

                <main className="w-full pb-8">
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5 xl:gap-8">
                        {}
                        <div className="xl:col-span-2 xl:self-start">
                                {hasPaymentReminder && (
                                <div className="relative mb-6 flex flex-col gap-4 overflow-hidden rounded-2xl bg-[#794BE1] p-4 shadow-lg shadow-indigo-100 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                                    <div className="flex-1">
                                        <div className="flex gap-2 text-white mb-2">
                                            <CreditCard className='mt-1' size={18} />
                                            <h2 className="font-bold text-base">Add New Payment Method</h2>
                                        </div>
                                        <p className="text-indigo-100 text-xs mb-3 leading-snug">
                                            You'll need to add a payment method before your delivery.
                                        </p>
                                        <Link to='/dashboard/payment' className="inline-flex w-fit rounded-md bg-[#00A7EE] px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-cyan-500">
                                            Add Payment Method
                                        </Link>
                                    </div>
                                    <div className="w-16 h-16 rounded-md hidden sm:block shrink-0 ml-3">
                                        <img
                                            src={cardImage}
                                            alt="Payment"
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                    </div>
                                </div>
                            )}
                                {(!hasActivePickup || overrideShowSchedule) && (
                                    <div className="mb-6">
                                        <SchedulePickup />
                                    </div>
                                )}
                            <DashboardLeftColumn
                                successful={hasActivePickup && !overrideShowSchedule}
                                upcomingPage={upcomingPage}
                                setSuccessful={(successful) => setOverrideShowSchedule(!successful)}
                                    setSchedulePage={setSchedulePage}
                                    setUpcomingPage={setUpcomingPage}
                                />
                            </div>
                        {}
                        <div className={`${showLeftColumn ? 'xl:col-span-3' : 'xl:col-span-3'}`}>

                            {
                                (!hasActivePickup || overrideShowSchedule) ? (<div className="w-full rounded-lg relative xl:sticky xl:top-6">
                                    {}
                                    {hasActivePickup && (
                                        <div className="relative z-20 mb-8">
                                            {}
                                            <div className="absolute -top-12 -bottom-4 left-0 right-0 bg-white" />

                                            <div className="relative flex flex-col gap-y-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#00A7EE] to-[#3CC7C7] p-3 shadow-lg shadow-cyan-100 sm:p-4">

                                            <p className="text-white/80 text-sm">
                                                {(() => {
                                                    const type = upcomingPickups[bannerPickupIndex]?.pickup_type;
                                                    switch (type) {
                                                        case 'wf': return 'Wash & Fold Laundry';
                                                        case 'hd': return 'Hang Dry Laundry';
                                                        case 'dc': return 'Dry Cleaning';
                                                        case 'both': return 'Wash & Fold + Dry Cleaning';
                                                        case 'wf_hd': return 'Wash & Fold + Hang Dry';
                                                        case 'hd_dc': return 'Hang Dry + Dry Cleaning';
                                                        case 'all': return 'Wash & Fold + Hang Dry + Dry Cleaning';
                                                        default: return 'Wash & Fold Laundry';
                                                    }
                                                })()}
                                            </p>
                                            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex-1 overflow-hidden relative min-h-7">
                                                    <AnimatePresence mode="wait">
                                                        <motion.h2
                                                            key={upcomingPickups[bannerPickupIndex]?.id || 'none'}
                                                            initial={{ opacity: 0, x: 20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -20 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="text-base font-bold leading-tight text-white sm:text-lg"
                                                        >
                                                            Your pickup scheduled for {upcomingPickups.length > 0 ? formatDateShort(parseDateSafe(upcomingPickups[bannerPickupIndex].pickup_date)) : ''}
                                                        </motion.h2>
                                                    </AnimatePresence>
                                                </div>

                                                {upcomingPickups.length > 1 && (
                                                    <div className="flex items-center gap-2 text-white sm:ml-4">
                                                        <button
                                                            onClick={() => setBannerPickupIndex((prev) => (prev - 1 + upcomingPickups.length) % upcomingPickups.length)}
                                                            className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                                                        >
                                                            <ChevronLeft size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => setBannerPickupIndex((prev) => (prev + 1) % upcomingPickups.length)}
                                                            className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                                                        >
                                                            <ChevronRight size={20} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <button onClick={() => setOverrideShowSchedule(false)} className="text-white/90 text-sm hover:text-white inline-block underline underline-offset-4">
                                                    See Details 
                                                </button>
                                                {upcomingPickups.length > 1 && (
                                                    <span className="text-white/90 text-xs px-2 py-0.5 bg-white/10 rounded-full">
                                                        {bannerPickupIndex + 1} of {upcomingPickups.length}
                                                    </span>
                                                )}
                                            </div>
                                            </div>
                                        </div>
                                    )}

                                    <h1 className="text-[26px] sm:text-4xl font-semibold text-[#2F393D] mb-5">Schedule a Pickup</h1>
                                    <h2 className="text-lg text-[#4B5457] mb-3 mt-4">Services</h2>

                                    {/* Wash & Fold */}
                                    <WashFold
                                        checked={washFoldChecked}
                                        onCheckedChange={setWashFoldChecked}
                                        onServiceChange={setWashFoldConfig}
                                    />

{/* isHangDryModalOpen */}

                                    <div className={`rounded-2xl ${hangDryChecked ? 'border border-[#dbdedf] p-4' : '' }      my-4`}>
                                        {/* Hang Dry Laundry - static service card */}
                                        <ServiceCard
                                            service={{
                                                code: 'hang_dry',
                                                name: 'Hang Dry Laundry',
                                                description: 'Hang Dry Laundry pricing based on per items you send.',
                                                pricing_type: 'per_item',
                                            }}
                                            checked={hangDryChecked}
                                            onCheckedChange={setHangDryChecked}
                                            onOpenPricing={() => setIsHangDryModalOpen(true)}
                                        />

                                        {}
                                        {hangDryChecked && (
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-base font-medium text-[#4B5457]">Pay By</h3>
                                                </div>
                                                <div className="border border-[#C0C3C4] rounded-xl px-4 py-3">
                                                    <div className="flex items-center justify-between">
                                                        <h2 className="text-[#2F393D] text-lg font-semibold">Pay Per Order</h2>
                                                        <button
                                                            onClick={() => setIsHangDryModalOpen(true)}
                                                            className="rounded-lg border border-[#C0C3C4] px-4 py-2 text-sm font-medium text-[#4B5457] transition-colors hover:bg-gray-50 cursor-pointer">
                                                            See Pricing
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>


                                    <div className={`rounded-2xl ${dryCleaningChecked ? 'border border-[#EBECEC] p-4' : ""}  my-4 `}>
                                        {}
                                        <ServiceCard
                                            service={{
                                                code: 'dc',
                                                name: 'Dry Cleaning/Launder & Press',
                                                description: 'Dry cleaning / Launder & Press pricing based on the items you send.',
                                                pricing_type: 'per_item',
                                            }}
                                            checked={dryCleaningChecked}
                                            onCheckedChange={setDryCleaningChecked}
                                            onOpenPricing={() => setIsDryCleaningModalOpen(true)}
                                        />
                                        {}
                                        {dryCleaningChecked && (
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-base font-medium text-[#4B5457]">Pay By</h3>
                                                </div>
                                                <div className="border border-[#C0C3C4] rounded-xl px-4 py-3">
                                                    <div className="flex items-center justify-between">
                                                        <h2 className="text-[#2F393D] text-lg font-semibold">Pay Per Order</h2>
                                                        <button
                                                            onClick={() => setIsDryCleaningModalOpen(true)}
                                                            className="rounded-lg border border-[#C0C3C4] px-4 py-2 text-sm font-medium text-[#4B5457] transition-colors hover:bg-gray-50 cursor-pointer">
                                                            See Pricing
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    </div>



                                    {}
                                    <div className="mt-10 flex flex-col justify-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <h1 className="text-xl text-[#4B5457]">Your Scheduled Pickup</h1>
                                        <button
                                            onClick={() => setIsLearnMoreModalOpen(true)}
                                            className="flex gap-1 items-center hover:opacity-80 transition-opacity"
                                        >
                                            <span className="text-sm text-[#FFAB00] underline hover:text-[#e59900]">Learn More</span>
                                            <div className="max-w-4.5 underline">
                                                <img className="w-full" src={learnMore} alt="learn more svg" />
                                            </div>
                                        </button>
                                    </div>

                                    <div className="border border-[#C0C3C4] rounded-xl p-4 mt-5">
                                        {}
                                        {!data?.date && !recurringSchedule?.has_recurring ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                                <CalendarDays className="text-[#C0C3C4] w-12 h-12 mb-3" />
                                                <h2 className="text-lg font-semibold text-[#4B5457] mb-2">No Schedule Set</h2>
                                                <p className="text-sm text-[#858B8E] mb-4">Set up your pickup schedule to get started</p>
                                                <button
                                                    onClick={() => setSchedule(true)}
                                                    className="bg-[#6F48C7] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#5a3ba3] transition-colors"
                                                >
                                                    Schedule Pickup
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {}
                                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                    <div className="w-full md:w-auto">
                                                        <div className="flex flex-wrap items-center gap-1">
                                                            <CalendarDays className="text-[#858B8E] w-5 h-5" />
                                                            <h2 className="font-semibold text-lg sm:text-xl text-[#2F393D]">
                                                                {'headerDate' in dateInfo ? dateInfo.headerDate : dateInfo.pickupDate}
                                                            </h2>
                                                        </div>
                                                        <div className="mt-2">
                                                            <p className="text-sm text-[#858B8E]">Pickup: <span className="text-[#2F393D] font-semibold">
                                                                {dateInfo.pickup}
                                                            </span></p>
                                                            <p className="text-sm text-[#676E71]">Time: 8am - 5pm</p>
                                                        </div>

                                                    </div>

                                                    <div className="flex items-center justify-center gap-1">
                                                        <div className="h-0.5 w-10 sm:w-24 bg-[#858B8E]"></div>
                                                        <span><Car className="text-[#858B8E] w-5 h-5" /></span>
                                                        <div className="h-0.5 w-10 sm:w-24 bg-[#858B8E]"></div>
                                                    </div>

                                                    <div className="w-full md:ml-1 md:w-auto">
                                                        <div className="flex items-center gap-1 mt-2">
                                                            <Box className="text-[#858B8E] w-5 h-5" />
                                                            <h2 className="font-semibold text-lg sm:text-xl text-[#2F393D]">Next Day</h2>
                                                        </div>
                                                        <div className="mt-2">
                                                            <p className="text-sm text-[#858B8E]">Delivery: <span className="text-[#2F393D] font-semibold">{dateInfo.delivery}</span></p>
                                                            <p className="text-sm text-[#676E71]">Next business day</p>
                                                        </div>

                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="border-b border-[#C0C3C4] my-4"></div>
                                                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
                                                        <div className="bg-[#eff2f3] rounded-lg flex items-center gap-3 p-3 w-auto">
                                                            {}
                                                            {data?.delivaryType === 'weekly' ? (
                                                                <>
                                                                    <svg className="w-5 h-5 text-[#858B8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                                    <h2 className='text-[#2F393D] text-lg font-semibold'>
                                                                        {data?.frequency === 'biweekly' ? 'Bi-weekly' : 'Weekly'}
                                                                    </h2>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Car className="text-[#858B8E] text-lg " />
                                                                    <h2 className='text-[#2F393D] text-lg font-semibold'>One time pickup</h2>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <button onClick={() => setSchedule(true)} className="border cursor-pointer border-t-2 border-[#6d49c0] rounded-lg flex items-center gap-3 p-3 w-full sm:w-auto">
                                                                <p className="text-[#6F48C7] text-sm font-medium">Change Schedule</p>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {}
                                                    {
                                                        schedule && <SchedualModal
                                                            isOpne={schedule}
                                                            setIsOpen={setSchedule}
                                                            selectedService={selectedService}
                                                            handleClickOk={handleOk}
                                                            availableDays={availableDays}
                                                            nonWorkingDays={nonWorkingDays}
                                                            initialData={{
                                                                serviceType: data?.delivaryType === 'weekly' || data?.delivaryType === 'bi-weekly' ? 'weekly' : 'one-time',
                                                                frequency: data?.frequency === 'biweekly' || data?.delivaryType === 'bi-weekly' ? 'Bi-weekly' : 'Weekly',
                                                                selectedDays: Array.isArray(data?.date) ? data.date as ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] : [],
                                                            }}
                                                        />
                                                    }

                                                </div>
                                            </>
                                        )}
                                    </div>








                                    {}
                                    <ShowPriceModal
                                        isOpen={isHangDryModalOpen}
                                        setIsOpen={setIsHangDryModalOpen}
                                        handleDryLaundeyPrice={() => { }}
                                    />

                                    {}
                                    <DryCleaningPriceModal
                                        isOpen={isDryCleaningModalOpen}
                                        setIsOpen={setIsDryCleaningModalOpen}
                                        handleDryCleaningPrice={() => { }}
                                    />

                                    <LearnMoreModal 
                                        isOpen={isLearnMoreModalOpen}
                                        setIsOpen={setIsLearnMoreModalOpen}
                                    />

                                    <h2 className="text-xl leading-6 mt-10 font-semibold">Pickup  & Delivery Address</h2>
                                    <div className="mt-5 flex flex-col gap-3 rounded-lg border border-[#C0C3C4] px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-5">
                                        <div className="flex min-w-0 items-start gap-2">
                                            <MapPinMinus className="text-[#A4A8AA] w-5 h-5" />
                                            <p className="text-base text-[#4B5457] font-medium wrap-break-word leading-snug">{userAddress}</p>
                                        </div>
                                        <button
                                            onClick={() => handleAddressEdit()}
                                            className="flex items-center gap-1 text-[#A4A8AA] cursor-pointer self-start sm:self-auto">
                                            <span className=" font-medium">Edit</span>
                                            <SquarePen className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <AddressEditModal
                                        isOpen={isEditAddress}
                                        setIsOpen={setIsEditAddress}
                                        handleAddressEdit={handleAddressUpdate}
                                        initialAddress={{
                                            street: user?.address?.street,
                                            aptno: user?.address?.apt,
                                            zipcode: user?.address?.zip,
                                            cityName: user?.address?.city,
                                            stateName: user?.address?.state
                                        }}
                                    />

                                    {activePromo && (
                                        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 sm:flex-row sm:items-center">
                                            <div className="bg-green-100 p-2 rounded-full">
                                                <CreditCard className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">Promo Code Applied: {activePromo.code}</p>
                                                <p className="text-xs opacity-90">{activePromo.description || 'Discount will be applied at checkout'}</p>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleOnSubmit}
                                        disabled={isSubmitting || (!washFoldChecked && !hangDryChecked && !dryCleaningChecked)}
                                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-l-full rounded-r-full bg-[#00A7EE] py-3 text-base text-white transition-colors hover:bg-[#0099d3] sm:text-lg disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                Processing...
                                            </>
                                        ) : (
                                            'Confirm Pickup'
                                        )}
                                    </button>
                                </div>) : (
                                    
                                    <Upcommingpickup pickups={upcomingPickups} onRefresh={refreshDashboard} />
                                )
                            }
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboards;
