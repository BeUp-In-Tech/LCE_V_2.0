import { MapPin, Headphones, XCircle, CreditCard, Edit, Car, CalendarDays, Box, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { parseDateSafe, addBusinessDays, addAvailableDays, formatDateShort, formatWeekday } from '../../utils/dateHelpers';
import CanclelationModal from '../shared/modal/CanclelationModal';
import AddressEditModal from '../shared/modal/AddressEditModal';
import SchedualModal from '../shared/modal/SchedualModal';
import { pickupAPI, userAPI, vacationHoldAPI, recurringScheduleAPI } from '../../services/api';
import { useAuth } from '../../context/useAuth';
import { type Pickup, type UpdatePickupData } from '../../services/api';
import { type BookingData } from '../shared/modal/SchedualModal';
import VacationHoldModal from '../shared/modal/VacationHoldModal';
import { useVacationHolds, useRecurringSchedule, usePickupZone } from '../../hooks/useQueries';
import { useCancelPickup } from '../../hooks/useMutations';


interface UpcommingPickupProps {
    pickups?: Pickup[];
    onRefresh?: () => void;
}

const Upcommingpickup: React.FC<UpcommingPickupProps> = ({ pickups, onRefresh }) => {
    const [selectedPickupId, setSelectedPickupId] = useState<number | null>(null);

    const pickup = (pickups && pickups.length > 0)
        ? (selectedPickupId ? pickups.find(p => p.id === selectedPickupId) || pickups[0] : pickups[0])
        : undefined;
    const { user, refreshUser } = useAuth();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isEditAddress, setIsEditAddress] = useState<boolean>(false);
    const [schedule, setSchedule] = useState(false);
    const [selectedService] = useState<string>('');
    const [selectedScheduleType, setSelectedScheduleType] = useState<'one-time' | 'weekly' | null>(null);

    
    const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
    const { data: vacationData, refetch: refetchVacation } = useVacationHolds();
    const { data: recurringData, refetch: refetchRecurring } = useRecurringSchedule();
    const cancelPickupMutation = useCancelPickup();

    const userZip = user?.address?.zip;
    const { data: zoneData } = usePickupZone(userZip);
    const availableDays: string[] | undefined = zoneData?.available_days;
    const nonWorkingDays: string[] | undefined = zoneData?.non_working_days;

    interface VacationHold {
        id: number;
        is_active: boolean;
        status: string;
    }

    const holds: VacationHold[] = vacationData?.vacation_holds || [];
    const activeHold = holds.find((h: VacationHold) => h.status === 'active')?.id ?? null;



    const handleCancelVacation = async () => {
        if (!activeHold) return;
        if (!window.confirm("Are you sure you want to cancel your vacation hold?")) return;

        try {
            await vacationHoldAPI.delete(activeHold);
            refetchVacation();
            if (onRefresh) onRefresh();
            alert("Vacation hold cancelled.");
        } catch (error) {
            console.error("Failed to cancel vacation hold", error);
        }
    };

    interface AddressFormData {
        street: string;
        cityName: string;
        zipcode: string;
        aptno: string;
        stateName?: string;
    }

    const handleAddressEdit = async (updatedAddress: AddressFormData) => {
        try {
            await userAPI.updateAddress({
                street: updatedAddress.street,
                city: updatedAddress.cityName,
                zip: updatedAddress.zipcode,
                apt: updatedAddress.aptno,
                state: updatedAddress.stateName
            });
            await refreshUser();
            if (onRefresh) onRefresh();
            setIsEditAddress(false);
        } catch (err) {
            console.error("Failed to update address", err);
        }
    };

    const handleOk = async (data: BookingData) => {
        const id = pickup?.id;
        if (!id) return;

        try {
            const payload: UpdatePickupData = {};
            if (data.fullDate) {
                payload.pickup_date = data.fullDate;
            }

            
            if (data.delivaryType) {
                setSelectedScheduleType(data.delivaryType as 'one-time' | 'weekly');
            }

            if (payload.pickup_date) {
                await pickupAPI.update(id, payload);

                
                if (data.delivaryType === 'weekly' && Array.isArray(data.date) && data.date.length > 0) {
                    
                    const scheduleType = data.frequency === 'biweekly' ? 'bi-weekly' : 'weekly';
                    
                    const dayMap: Record<string, string> = {
                        Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
                        Thu: 'Thursday', Fri: 'Friday'
                    };
                    const fullDays = (data.date as string[]).map((d: string) => dayMap[d] || d);

                    await recurringScheduleAPI.update({
                        schedule_type: scheduleType,
                        days: fullDays,
                        start_date: data.fullDate,
                    });
                    refetchRecurring();
                }

                setSchedule(false);
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            console.error("Failed to reschedule", error);
        }
    }

    const handleCancelPickup = async () => {
        const id = pickup?.id;
        if (!id) {
            alert("No pickup selected to cancel.");
            return;
        }

        cancelPickupMutation.mutate(id, {
            onSuccess: () => {
                setIsOpen(false);
                alert("Pickup cancelled successfully!");
                if (onRefresh) onRefresh();
            },
            onError: (error: unknown) => {
                const err = error as { response?: { data?: { error?: string; message?: string } } };
                const errorMsg = err.response?.data?.error || err.response?.data?.message || "Failed to cancel pickup. Please try again.";
                alert(errorMsg);
            },
        });
    };

    
    const pickupDateObj = pickup?.pickup_date ? parseDateSafe(pickup.pickup_date) : null;
    const deliveryDateObj = pickupDateObj ? addAvailableDays(pickupDateObj, 1, availableDays, nonWorkingDays) : null;

    const pickupDate = pickupDateObj ? formatDateShort(pickupDateObj) : 'Pending';
    const pickupDay = pickupDateObj ? formatWeekday(pickupDateObj) : 'Pending';
    const deliveryDate = deliveryDateObj ? formatDateShort(deliveryDateObj) : 'Pending';
    const deliveryDay = deliveryDateObj ? formatWeekday(deliveryDateObj) : 'Pending';

    const userAddress = (user?.address?.street || user?.address?.city || user?.address?.zip)
        ? [user.address.street, user.address.city, user.address.zip].filter(Boolean).join(', ')
        : "No address set";


    return (
        <div className="w-full rounded-lg">
            {}
            {(!user?.payment?.has_payment_method && !pickup) && (
                <div className="relative overflow-hidden bg-[#794BE1] rounded-2xl p-6 mb-8 flex items-center justify-between shadow-lg shadow-indigo-100">
                    <div className="flex-1">
                        <div className="flex gap-2 text-white mb-2">
                            <CreditCard className='mt-1' size={20} />
                            <h2 className="font-bold text-lg">Add New Payment Method</h2>
                        </div>
                        <p className="text-indigo-100 text-sm mb-4 leading-snug">
                            You'll need to add a payment method before your delivery.
                        </p>
                        <Link to='/dashboard/payment' className="bg-[#00A7EE] hover:bg-cyan-500 transition-colors text-white font-medium py-4 mt-2 px-6 rounded-md text-sm">
                            Add Payment Method
                        </Link>
                    </div>
                </div>
            )}

            {(pickup || (pickups && pickups.length > 0)) && (
                <div className="relative flex flex-col gap-y-3 mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#00A7EE] to-[#3CC7C7] p-3 shadow-lg shadow-cyan-100 sm:p-4">
                    <p className="text-white/80 text-sm">
                        {pickup?.pickup_type === 'dc' ? 'Dry Cleaning/Launder & Press' :
                            pickup?.pickup_type === 'hd' ? 'Hang Dry Laundry' :
                                pickup?.pickup_type === 'both' || pickup?.pickup_type === 'wf_dc' ? 'Wash & Fold + Dry Cleaning' :
                                    pickup?.pickup_type === 'wf_hd' ? 'Wash & Fold + Hang Dry' :
                                        pickup?.pickup_type === 'hd_dc' ? 'Hang Dry + Dry Cleaning' :
                                            pickup?.pickup_type === 'all' || pickup?.pickup_type === 'wf_hd_dc' ? 'Wash & Fold + Hang Dry + Dry Cleaning' :
                                                'Wash & Fold Laundry'}
                    </p>
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 overflow-hidden relative min-h-7">
                            <AnimatePresence mode="wait">
                                <motion.h2
                                    key={pickup?.id || 'none'}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-base font-bold leading-tight text-white sm:text-lg"
                                >
                                    Your pickup scheduled for {pickupDate}
                                </motion.h2>
                            </AnimatePresence>
                        </div>

                        {pickups && pickups.length > 1 && (
                            <div className="flex items-center gap-2 text-white sm:ml-4">
                                <button
                                    onClick={() => {
                                        const currentIndex = pickups.findIndex(p => p.id === pickup?.id);
                                        const prevIndex = (currentIndex - 1 + pickups.length) % pickups.length;
                                        setSelectedPickupId(pickups[prevIndex].id);
                                    }}
                                    className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={() => {
                                        const currentIndex = pickups.findIndex(p => p.id === pickup?.id);
                                        const nextIndex = (currentIndex + 1) % pickups.length;
                                        setSelectedPickupId(pickups[nextIndex].id);
                                    }}
                                    className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="mt-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <button 
                            onClick={() => {
                                const section = document.querySelector('section');
                                if (section) section.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="text-white/90 text-sm hover:text-white inline-block underline underline-offset-4 cursor-pointer"
                        >
                            See Details
                        </button>
                        {pickups && pickups.length > 1 && (
                            <span className="text-white/90 text-xs px-2 py-0.5 bg-white/10 rounded-full">
                                {pickups.findIndex(p => p.id === pickup?.id) + 1} of {pickups.length}
                            </span>
                        )}
                    </div>
                </div>
            )}
            
            <h1 className="text-[26px] sm:text-4xl font-semibold text-[#2F393D] mb-5 mt-2">Your Upcoming Pickup</h1>
            <section className="mb-8">
                <h3 className="text-slate-500 font-medium mb-4">Pickup Date & Service</h3>

                <div className="border border-[#C0C3C4] rounded-xl p-2  mt-5">
                    <div className="flex justify-between items-center">
                        <div className="">
                            <div className="flex items-center gap-1">
                                <CalendarDays className="text-[#858B8E] w-5 h-5" />
                                <h1 className="font-semibold text-lg sm:text-xl text-[#2F393D]">{pickupDate}</h1>
                            </div>
                            <div className="mt-2">
                                <p className="text-sm text-[#858B8E]">Pickup: <span className="text-[#2F393D] font-semibold">{pickupDay}</span></p>
                                <p className="text-sm text-[#676E71]">8am - 5pm</p>
                            </div>

                        </div>

                        <div className="flex gap-1 items-center">
                            <div className="w-3 sm:w-24 h-0.5 bg-[#858B8E]"></div>
                            <span><Car className="text-[#858B8E] w-5 h-5" /></span>
                            <div className="w-3 sm:w-24 h-0.5 bg-[#858B8E]"></div>
                        </div>

                        <div className="ml-1">
                            <div className="flex items-center gap-1 mt-2">
                                <Box className="text-[#858B8E] w-5 h-5" />
                                <h1 className="font-semibold text-lg sm:text-xl text-[#2F393D]">{deliveryDate}</h1>
                            </div>
                            <div className="mt-2">
                                <p className="text-sm text-[#858B8E]">Delivery: <span className="text-[#2F393D] font-semibold">{deliveryDay}</span></p>
                                <p className="text-sm text-[#676E71]">Next business day</p>
                            </div>

                        </div>
                    </div>
                    <div>
                        <div className="border-b border-[#C0C3C4] my-4"></div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
                            <div className="bg-[#eff2f3] rounded-lg flex items-center gap-3 p-3 w-auto">
                                {}
                                {(selectedScheduleType === 'weekly' || selectedScheduleType === 'bi-weekly') || 
                                 (selectedScheduleType === null && (pickup?.service_type === 'weekly' || pickup?.service_type === 'bi_weekly')) ? (
                                    <>
                                        <svg className="w-5 h-5 text-[#858B8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <h1 className='text-[#2F393D] text-lg font-semibold'>
                                            {(selectedScheduleType === 'bi-weekly' || pickup?.service_type === 'bi_weekly') ? 'Bi-weekly' : 'Weekly'}
                                        </h1>
                                    </>
                                ) : (
                                    <>
                                        <Car className="text-[#858B8E] text-lg " />
                                        <h1 className='text-[#2F393D] text-lg font-semibold'>
                                            One time pickup
                                        </h1>
                                    </>
                                )}
                            </div>
                            <div>
                                <button onClick={() => setSchedule(true)} className="border cursor-pointer border-t-2 border-[#6d49c0] rounded-lg flex items-center gap-3 p-3 w-full sm:w-auto">
                                    <p className="text-[#6F48C7] text-sm font-medium"> Reschedule</p>
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
                                    serviceType: (pickup?.service_type === 'weekly' || pickup?.service_type === 'bi_weekly') ? 'weekly'
                                        : recurringData?.has_recurring ? 'weekly' : 'one-time',
                                    frequency: (pickup?.service_type === 'bi_weekly' || recurringData?.schedule_type === 'bi_weekly') ? 'Bi-weekly' : 'Weekly',
                                    selectedDays: recurringData?.days
                                        ? (recurringData.days as string[]).map((d: string) => d.substring(0, 3) as 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri').filter((d: string) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d))
                                        : [],
                                }}
                            />
                        }

                    </div>
                </div>
            </section>

            <div className="mb-8 border border-red-100 bg-red-50/20 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <XCircle className="text-red-400" size={20} />
                    <span className="text-slate-700 font-medium ">Cancel this pickup</span>
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-red-100 hover:bg-red-200 text-red-500 px-5 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                    Cancel
                </button>
            </div>

            <CanclelationModal
                isOpne={isOpen}
                setIsOpen={setIsOpen}
                onConfirm={handleCancelPickup}
            />

            <div className="mb-8 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                <p className="text-[#4B5457] font-medium text-base">Schedule a Vacation Hold</p>
                <div
                    className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${activeHold ? 'bg-[#F97316]' : 'bg-gray-300'}`}
                    onClick={() => {
                        if (activeHold) {
                            handleCancelVacation();
                        } else {
                            setIsVacationModalOpen(true);
                        }
                    }}
                >
                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${activeHold ? 'translate-x-7' : ''}`}></div>
                </div>
            </div>

            <VacationHoldModal
                isOpen={isVacationModalOpen}
                setIsOpen={setIsVacationModalOpen}
                onSuccess={() => {
                    refetchVacation();
                    if (onRefresh) onRefresh();
                }}
            />

            <section className="mb-8">
                <h3 className="text-[#4B5457]   font-medium mb-4">Pickup & Delivery Address</h3>
                <div className="border border-slate-100 rounded-2xl p-4 flex items-center justify-between ">
                    <div className="flex items-center gap-3">
                        <MapPin className="text-slate-300" size={20} />
                        <p className="text-[#2F393D] text-base font-medium">{userAddress}</p>
                    </div>
                    <button onClick={() => setIsEditAddress(true)} className="flex items-center gap-1 text-slate-400 hover:text-slate-600">
                        <span className="text-sm font-semibold   ">Edit</span>
                        <Edit className='text-black ml-1' size={14} />
                    </button>
                </div>
                <AddressEditModal
                    isOpen={isEditAddress}
                    setIsOpen={setIsEditAddress}
                    handleAddressEdit={handleAddressEdit}
                    initialAddress={{
                        street: user?.address?.street,
                        aptno: user?.address?.apt,
                        zipcode: user?.address?.zip,
                        cityName: user?.address?.city,
                        stateName: user?.address?.state
                    }}
                />
            </section>

            <section className="sm:hidden">
                <h3 className="text-slate-500 font-medium mb-4">Contact Us</h3>
                <div className="border border-slate-100 rounded-2xl p-6 ">
                    <div className="flex gap-3 mb-2">
                        <Headphones className="text-slate-300 shrink-0" size={20} />
                        <p className="text-slate-500 text-sm leading-relaxed">
                            We're here to help! Please text or email us if you have questions.
                        </p>
                    </div>
                    <div className='flex justify-end items-center'>
                        <div className="flex gap-3">
                            <a href="sms:18005550199" className=" border border-[#6F48C7] text-[#6F48C7] py-2 px-4  rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors">
                                SMS US
                            </a>
                            <a href="mailto:info@laundrycareexpress.com" className=" border border-[#6F48C7] text-[#6F48C7]  py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors">
                                Email US
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Upcommingpickup;