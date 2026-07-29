import { Box, CalendarDays, Car, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from "react-router-dom";
import learnMore from "../../assets/svg/learn-more.svg";
import AuthHeader from "../../components/navbar/AuthHeader";
import ServiceCard from "../../components/services/ServiceCard";
import WashFold from "../../components/services/WashFold";
import AddressEditModal from "../../components/shared/modal/AddressEditModal";
import DryCleaningPriceModal from "../../components/shared/modal/price/DryCleaningPriceModal";
import ShowPriceModal from "../../components/shared/modal/price/ShowPriceModal";
import SchedualModal from "../../components/shared/modal/SchedualModal";
import { useAuth } from "../../context/useAuth";
import { pickupAPI, recurringScheduleAPI, userAPI } from '../../services/api';
import { addBusinessDays, addAvailableDays, getDefaultBookingData, getPTDate, formatDateShort } from '../../utils/dateHelpers';
import { usePickupZone } from '../../hooks/useQueries';

const Services: React.FC = () => {

    const { user, refreshUser } = useAuth();

    
    const userZip = user?.address?.zip;
    const { data: zoneData } = usePickupZone(userZip);
    const availableDays: string[] | undefined = zoneData?.available_days;
    const nonWorkingDays: string[] | undefined = zoneData?.non_working_days;

    
    const [washFoldChecked, setWashFoldChecked] = useState<boolean>(false);
    const [hangDryChecked, setHangDryChecked] = useState<boolean>(false);
    const [dryCleaningChecked, setDryCleaningChecked] = useState<boolean>(false);
    
    const [isHangDryModalOpen, setIsHangDryModalOpen] = useState<boolean>(false);
    const [isDryCleaningModalOpen, setIsDryCleaningModalOpen] = useState<boolean>(false);

    
    const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);

    
    interface BookingData {
        service: string;
        delivaryType: string;
        date: string | string[];
        fullDate?: string;
        frequency?: string;
    }





    const [bookingData, setBookingData] = useState<BookingData>(getDefaultBookingData(availableDays, nonWorkingDays));

    
    const userChangedSchedule = useRef(false);

    
    useEffect(() => {
        if (availableDays && availableDays.length > 0 && !userChangedSchedule.current) {
            setBookingData(getDefaultBookingData(availableDays, nonWorkingDays));
        }
    }, [availableDays, nonWorkingDays]);

    
    useEffect(() => {
        const loadSchedule = async () => {
            try {
                const res = await pickupAPI.getRecurringSchedule();
                const data = res.data;
                if (data?.has_recurring && data.schedule_type !== 'one_time') {
                    const days = data.days || [];
                    setBookingData({
                        service: 'Wash & Fold Laundry',
                        delivaryType: data.schedule_type === 'bi_weekly' ? 'weekly' : data.schedule_type,
                        date: days,
                        fullDate: data.next_pickup_date || undefined,
                        frequency: data.schedule_type === 'bi_weekly' ? 'biweekly' : 'weekly',
                    });
                    
                    setWashFoldChecked(true);
                }
            } catch (err) {
                console.error('Failed to load recurring schedule:', err);
            }
        };
        loadSchedule();
    }, []);


    const navigate = useNavigate();

    
    
    const handleScheduleChange = async (newData: any) => {
        console.log("Schedule updated:", newData);
        userChangedSchedule.current = true;
        setBookingData(newData);
        setScheduleModalOpen(false);

        
        try {
            let scheduleType = newData.delivaryType;
            if (scheduleType === 'weekly' && newData.frequency === 'biweekly') {
                scheduleType = 'bi-weekly';
            }

            await recurringScheduleAPI.update({
                schedule_type: scheduleType,
                days: Array.isArray(newData.date) ? newData.date : [],
                start_date: newData.fullDate,
            });
        } catch (error) {
            console.error('Failed to save schedule to backend:', error);
        }
    };

    
    const getDateInfo = () => {
        const today = getPTDate();
        const formatPickupDisplay = (d: Date) => {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
        };

        
        if (bookingData?.delivaryType === 'weekly' && Array.isArray(bookingData?.date) && bookingData.date.length > 0) {
            const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };

            
            const upcomingDates: Date[] = [];
            for (const dayName of bookingData.date) {
                const target = dayMap[dayName];
                if (target === undefined) continue;
                const todayIndex = today.getDay();
                let diff = (target - todayIndex + 7) % 7;
                if (diff === 0) diff = 7;
                const candidate = new Date(today);
                candidate.setDate(today.getDate() + diff);
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
                headerDays: bookingData.date.join(' , ')
            };
        }

        
        let current = today;
        if (bookingData?.fullDate) {
            const [y, m, d] = bookingData.fullDate.split('-').map(Number);
            current = new Date(y, m - 1, d);
        }

        const delivery = addAvailableDays(current, 1, availableDays, nonWorkingDays);

        return {
            pickup: formatPickupDisplay(current),
            delivery: formatPickupDisplay(delivery),
            pickupDate: formatDateShort(current)
        };
    };

    const dateInfo = getDateInfo();

    const [isEditAddress, setIsEditAddress] = useState<boolean>(false);

    
    
    

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
            setIsEditAddress(false);
        } catch (err) {
            console.error("Failed to update address", err);
        }
    };

    
    
    

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOnSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        
        
        let pickupType: 'wf' | 'dc' | 'hd' | 'both' | 'wf_hd' | 'hd_dc' | 'all' = 'wf';

        if (washFoldChecked && hangDryChecked && dryCleaningChecked) {
            pickupType = 'all';
        } else if (washFoldChecked && dryCleaningChecked) {
            pickupType = 'both';
        } else if (washFoldChecked && hangDryChecked) {
            pickupType = 'wf_hd';
        } else if (hangDryChecked && dryCleaningChecked) {
            pickupType = 'hd_dc';
        } else if (dryCleaningChecked) {
            pickupType = 'dc';
        } else if (hangDryChecked) {
            pickupType = 'hd';
        } else {
            pickupType = 'wf';
        }

        
        let serviceType: 'one_time' | 'weekly' | 'bi_weekly' = 'one_time';
        let preferredDay = '';

        if (bookingData.delivaryType === 'weekly') {
            
            if ((bookingData as { frequency?: string }).frequency === 'biweekly') {
                serviceType = 'bi_weekly';
            } else {
                serviceType = 'weekly';
            }
            if (Array.isArray(bookingData.date)) {
                preferredDay = bookingData.date.join(',');
            }
        }

        
        pickupAPI.create({
            pickup_date: bookingData.fullDate || getDefaultBookingData(availableDays, nonWorkingDays).fullDate,
            pickup_type: pickupType,
            service_type: serviceType,
            preferred_day: preferredDay,
            driver_instructions: '',
            payment_amount: 0,
            payment_description: 'Registration pickup',
        }).catch(error => {
            console.error("Failed to save service selection:", error);
        });

        
        navigate("/signupdone");
    }

    


    return (
        <div className="">
            <AuthHeader />
            <div className="max-w-157 mx-auto p-6 bg-white rounded-lg">
                <div className="flex items-center justify-between mb-10 mt-4 relative w-full">
                    {}
                    <div className="absolute top-8.25 left-0 right-0 h-0.5 bg-[#EBECEC] z-0"></div>
                    <div className="absolute top-8.25 left-0 right-0 h-0.5 bg-[#00A7EE] z-0"></div>

                    {}
                    <button
                        type="button"
                        onClick={() => navigate('/accoutntype')}
                        className="flex flex-col items-start bg-white z-10 pr-2 cursor-pointer group"
                        title="Go back to Account Info"
                    >
                        <span className="text-xs font-medium text-[#4B5457] mb-2 group-hover:text-[#00A7EE] transition-colors">Step 1</span>
                        <div className="w-5 h-5 rounded-full bg-[#00A7EE] ring-4 ring-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </button>

                    {}
                    <button
                        type="button"
                        onClick={() => navigate('/address')}
                        className="flex flex-col items-center bg-white z-10 px-2 cursor-pointer group"
                        title="Go back to Address"
                    >
                        <span className="text-xs font-medium text-[#4B5457] mb-2 group-hover:text-[#00A7EE] transition-colors">Step 2</span>
                        <div className="w-5 h-5 rounded-full bg-[#00A7EE] ring-4 ring-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </button>

                    {}
                    <div className="flex flex-col items-end bg-white z-10 pl-2">
                        <span className="text-xs font-medium text-[#4B5457] mb-2">Step 3</span>
                        <div className="w-5 h-5 rounded-full bg-[#00A7EE] ring-4 ring-white shadow-sm flex items-center justify-center"></div>
                    </div>
                </div>
                <h2 className="text-lg text-[#4B5457] mb-3">Services</h2>
                {}
                <WashFold checked={washFoldChecked} onCheckedChange={setWashFoldChecked} />

                <div className="">
                    <div className={`my-4 ${hangDryChecked ? ' rounded-2xl border border-[#EBECEC] p-4': ""}`}>
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

                        {/* Pay By Section - shows when Hang Dry is selected */}
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
                                            className="rounded-lg border border-[#C0C3C4] px-4 py-2 text-sm font-medium text-[#4B5457] transition-colors hover:bg-gray-50 cursor-pointer"
                                        >
                                            See Pricing
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {}

                    {}
                    <div className={`my-4 ${dryCleaningChecked ? 'rounded-2xl border border-[#EBECEC] p-4' : ''}`}>
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
                                            className="rounded-lg border border-[#C0C3C4] px-4 py-2 text-sm font-medium text-[#4B5457] transition-colors hover:bg-gray-50 cursor-pointer"
                                        >
                                            See Pricing
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
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
                {}
                <div className="flex flex-col sm:flex-row justify-start sm:justify-between sm:items-center mt-10">
                    <h1 className="text-xl text-[#4B5457]">Your Scheduled Pickup</h1>
                    <button onClick={() => alert('Recurring pickups save you time! Set your preferred days and we\'ll pick up your laundry every week.')} className="flex gap-1 items-center cursor-pointer hover:opacity-80 transition-opacity">
                        <span className="text-sm text-[#FFAB00] underline">Learn More</span>
                        <div className="max-w-4.5 underline">
                            <img className="w-full" src={learnMore} alt="learn more svg" />
                        </div>
                    </button>
                </div>

                <div className="border border-[#C0C3C4] rounded-xl p-2  mt-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="w-full md:w-auto">
                            <div className="flex flex-wrap items-center gap-1">
                                <CalendarDays className="text-[#858B8E] w-5 h-5" />
                                <h1 className="font-semibold text-lg sm:text-xl text-[#2F393D]">
                                    {'headerDate' in dateInfo ? dateInfo.headerDate : dateInfo.pickupDate}
                                </h1>
                            </div>
                            <div className="mt-2">
                                <p className="text-sm text-[#858B8E]">Pickup: <span className="text-[#2F393D] font-semibold">
                                    {dateInfo.pickup}
                                </span></p>
                                <p className="text-sm text-[#676E71]">Time: 8am - 5pm</p>
                            </div>

                        </div>

                        <div className="flex items-center justify-center gap-1 my-4 md:my-0">
                            <div className="h-0.5 w-10 sm:w-24 bg-[#858B8E]"></div>
                            <span><Car className="text-[#858B8E] w-5 h-5" /></span>
                            <div className="h-0.5 w-10 sm:w-24 bg-[#858B8E]"></div>
                        </div>

                        <div className="w-full md:ml-1 md:w-auto">
                            <div className="flex items-center gap-1">
                                <Box className="text-[#858B8E] w-5 h-5" />
                                <h1 className="font-semibold text-lg sm:text-xl text-[#2F393D]">Next Day</h1>
                            </div>
                            <div className="mt-2 md:mt-2">
                                <p className="text-sm text-[#858B8E]">Delivery: <span className="text-[#2F393D] font-semibold">{dateInfo.delivery}</span></p>
                                <p className="text-sm text-[#676E71]">Next business day</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="border-b border-[#C0C3C4] my-4"></div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
                            <div className="bg-[#eff2f3] rounded-lg flex items-center gap-3 p-3">
                                {bookingData?.delivaryType === 'weekly' ? (
                                    <>
                                        <svg className="w-5 h-5 text-[#858B8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <h1 className="text-[#2F393D] text-lg font-semibold">
                                            {(bookingData as { frequency?: string })?.frequency === 'biweekly' ? 'Bi-weekly' : 'Weekly'}
                                        </h1>
                                    </>
                                ) : (
                                    <>
                                        <Car className="text-[#858B8E] text-lg " />
                                        <h1 className=" text-[#2F393D] text-lg font-semibold">One time pickup</h1>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={() => setScheduleModalOpen(true)}
                                className="border border-t-2 border-[#00A7EE] rounded-lg flex items-center gap-3 p-3 cursor-pointer hover:bg-sky-50 transition-colors"
                            >
                                <p className="text-[#00A7EE] text-sm font-medium">Change Schedule</p>
                            </button>
                        </div>
                    </div>
                </div>

                {}
                {scheduleModalOpen && (
                    <SchedualModal
                        isOpne={scheduleModalOpen}
                        setIsOpen={setScheduleModalOpen}
                        selectedService="wash_fold"
                        handleClickOk={handleScheduleChange}
                        availableDays={availableDays}
                        nonWorkingDays={nonWorkingDays}
                        initialData={{
                            serviceType: bookingData.delivaryType === 'one-time' ? 'one-time' : 'weekly',
                            frequency: bookingData.frequency === 'biweekly' ? 'Bi-weekly' : 'Weekly',
                            selectedDays: Array.isArray(bookingData.date) ? bookingData.date as ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] : [],
                        }}
                    />
                )}

            
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

                {}
                <button
                    onClick={handleOnSubmit}
                    disabled={isSubmitting || (!washFoldChecked && !hangDryChecked && !dryCleaningChecked)}
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-l-full rounded-r-full bg-[#00A7EE] py-3 text-base text-white transition-colors hover:bg-[#0099d3] sm:text-lg disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Processing...
                        </>
                    ) : (
                        'Complete Registration'
                    )}
                </button>
            </div>
        </div>
    );
};

export default Services;