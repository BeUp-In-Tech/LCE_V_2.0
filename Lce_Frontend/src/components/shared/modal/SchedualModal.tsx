import { useState, useMemo } from 'react';
import { Calendar, Truck, RotateCcw, X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { isAvailablePickupDay, addAvailableDays, parseDateSafe, getPTDate, formatDateDayMonth, formatWeekday, SHORT_TO_FULL_DAY } from '../../../utils/dateHelpers';

type ServiceType = 'one-time' | 'weekly';
interface DateOption {
    id: string;
    month: string;
    day: string;
    label: string;
}

export type BookingData = {
    service: string;
    delivaryType: "weekly" | "one-time" | "bi-weekly";
    date: string | string[];
    startDate?: Date | null;
    frequency?: string;
    fullDate?: string;
    start_date?: string;
};

interface ModalProps {
    isOpne: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    selectedService: string,
    handleClickOk: (data: BookingData) => void;
    availableDays?: string[];     
    nonWorkingDays?: string[];    
    initialData?: {
        serviceType?: 'one-time' | 'weekly';
        frequency?: 'Weekly' | 'Bi-weekly';
        selectedDays?: Day[];
    };
}

type Frequency = 'Weekly' | 'Bi-weekly';
type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
const ALL_DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];



const SchedualModal: React.FC<ModalProps> = ({ isOpne, setIsOpen, selectedService, handleClickOk, availableDays, nonWorkingDays, initialData }) => {

    
    const days: Day[] = useMemo(() => {
        if (!availableDays || availableDays.length === 0) return ALL_DAYS;
        return ALL_DAYS.filter(d => {
            const fullName = SHORT_TO_FULL_DAY[d];
            return availableDays.includes(fullName);
        });
    }, [availableDays]);

    
    const isDateAvailable = (date: Date): boolean => {
        return isAvailablePickupDay(date, availableDays, nonWorkingDays);
    };


    const [service, setService] = useState<ServiceType>(initialData?.serviceType || 'one-time');
    const [frequency, setFrequency] = useState<Frequency>(initialData?.frequency || 'Weekly');
    const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
        
        if (initialData?.selectedDays && initialData.selectedDays.length > 0) {
            const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };
            const today = getPTDate();
            const target = dayMap[initialData.selectedDays[0]];
            if (target !== undefined) {
                let diff = (target - today.getDay() + 7) % 7;
                if (diff === 0) diff = 7;
                const result = new Date(today);
                result.setDate(today.getDate() + diff);
                
                let safe = 8;
                while (!isAvailablePickupDay(result, availableDays, nonWorkingDays) && safe > 0) {
                    result.setDate(result.getDate() + 7);
                    safe--;
                }
                return result;
            }
        }
        
        const d = getPTDate();
        const currentHour = d.getHours();
        if (currentHour < 8 && isAvailablePickupDay(d, availableDays, nonWorkingDays)) {
            return new Date(d);
        }
        return addAvailableDays(d, 1, availableDays, nonWorkingDays);
    });
    const [selectedDays, setSelectedDays] = useState<Day[]>(initialData?.selectedDays || []);
    const [showDate, setShowDate] = useState<boolean>(false);

    const getNextDateFromDay = (day: Day) => {
        const today = getPTDate();

        const dayMap: Record<Day, number> = {
            Mon: 1,
            Tue: 2,
            Wed: 3,
            Thu: 4,
            Fri: 5,
        };

        const target = dayMap[day];
        const todayIndex = today.getDay();

        let diff = (target - todayIndex + 7) % 7;

        
        if (diff === 0) diff = 7;

        const result = new Date(today);
        result.setDate(today.getDate() + diff);

        
        let safetyCounter = 0;
        while (!isAvailablePickupDay(result, availableDays, nonWorkingDays) && safetyCounter < 10) {
            result.setDate(result.getDate() + 7);
            safetyCounter++;
        }

        return result;
    };


    const toggleDays = (day: Day) => {


      

        setSelectedDays(prev => {
            let newDays: Day[];

            if (frequency?.toLowerCase() === 'weekly' || frequency?.toLowerCase() === 'bi-weekly') {
                newDays = [day];
            } else {
                const isAlreadySelected = prev.includes(day);

                if (isAlreadySelected) {
                    newDays = prev.filter(d => d !== day);
                } else {
                    newDays = [...prev, day];
                }
            }

            
            if (newDays.length > 0) {
                const nextDate = getNextDateFromDay(newDays[0]); 
                setSelectedDate(nextDate);
            }

            return newDays;
        });
    };

    
    
    const generateDateOptions = () => {
        const options: DateOption[] = [];
        const today = getPTDate();
        const currentHour = today.getHours();
        const isTodayAvailable = isAvailablePickupDay(today, availableDays || [], nonWorkingDays || []);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        
        if (currentHour < 8 && isTodayAvailable) {
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            options.push({
                id: `${year}-${month}-${day}`,
                month: (() => { const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return months[today.getMonth()]; })(),
                day,
                label: 'Today'
            });
        }

        
        let cursor = new Date(today);
        let safetyLimit = 30;
        while (options.length < 3 && safetyLimit > 0) {
            cursor.setDate(cursor.getDate() + 1);
            safetyLimit--;

            if (!isAvailablePickupDay(cursor, availableDays, nonWorkingDays)) continue;

            const year = cursor.getFullYear();
            const month = String(cursor.getMonth() + 1).padStart(2, '0');
            const day = String(cursor.getDate()).padStart(2, '0');
            const id = `${year}-${month}-${day}`;

            let label = formatWeekday(cursor);
            if (cursor.toDateString() === tomorrow.toDateString()) {
                label = 'Tomorrow';
            }

            options.push({
                id,
                month: (() => { const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return months[cursor.getMonth()]; })(),
                day,
                label
            });

            
            cursor = new Date(cursor);
        }
        return options;
    };




    const dateOptions: DateOption[] = generateDateOptions();

    if (!isOpne) return null;

    const handleDateChange = (date: Date | null) => {
        setSelectedDate(date);
    };

    const handleDateOptionClick = (dateStr: string) => {
        setSelectedDate(parseDateSafe(dateStr));
    };
    const handleFrequencyChange = (type: Frequency) => {
        setFrequency(type);
        setSelectedDays([]);
    };

    const isSelectionValid = () => {
        if (service === 'one-time') return !!selectedDate;
        if (service === 'weekly') {
            if (frequency === 'Bi-weekly' || frequency === 'Weekly') return selectedDays.length > 0;
        }
        return false;
    };

    const handleOk = () => {
        if (!isSelectionValid()) return;

        if (service === 'one-time' && selectedDate) {
            const formattedDate = formatDateDayMonth(selectedDate);

            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const apiDate = `${year}-${month}-${day}`;

            const data = {
                service: selectedService,
                delivaryType: service,
                date: formattedDate,
                fullDate: apiDate,
            }
            handleClickOk(data);
            setIsOpen(false);
        }
        
        if (service === 'weekly' && selectedDays.length > 0) {
            
            const upcomingDates = selectedDays.map(d => getNextDateFromDay(d));
            upcomingDates.sort((a, b) => a.getTime() - b.getTime());
            const nextPickupDate = upcomingDates[0];
            const year = nextPickupDate.getFullYear();
            const month = String(nextPickupDate.getMonth() + 1).padStart(2, '0');
            const day = String(nextPickupDate.getDate()).padStart(2, '0');

            const data = {
                service: selectedService,
                delivaryType: service,
                date: selectedDays,
                startDate: nextPickupDate,
                fullDate: `${year}-${month}-${day}`, 
                frequency: frequency === 'Bi-weekly' ? 'biweekly' : 'weekly',
            }
            handleClickOk(data);
            setIsOpen(false);
        }
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 overflow-y-auto">
            <div className="w-full h-full sm:h-auto sm:p-4 animate-in zoom-in-95 fade-in duration-200 flex items-end sm:items-center justify-center">
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white w-full h-auto max-h-[95vh] sm:h-auto sm:max-h-[95vh] sm:rounded-2xl shadow-xl sm:max-w-123.5 mx-auto overflow-hidden border border-gray-100 flex flex-col items-start rounded-t-2xl pb-0"
                >
                    {}
                    <div className="border-b border-gray-50 relative w-full px-6 pt-6 pb-4">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />

                        </button>

                        <div className="flex items-center gap-3 mb-1">
                            <Calendar className="text-gray-500" size={18} />
                            <h2 className="text-xl font-bold text-gray-800">
                                {service === 'weekly'
                                    ? selectedDays.map(d => formatDateDayMonth(getNextDateFromDay(d))).join(' & ')
                                    : selectedDate
                                        ? formatDateDayMonth(selectedDate)
                                        : 'Select Date'}
                            </h2>
                        </div>
                        <p className="text-gray-500 text-sm ml-7">
                            {service === 'weekly'
                                ? selectedDays.join(' , ')
                                : selectedDate
                                    ? formatWeekday(selectedDate)
                                    : ''}
                            <span className="text-gray-400"> (Next business day)</span>
                        </p>





                        <div className="mt-4 flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            {service === 'weekly' ? (
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            ) : (
                                <Truck className="text-gray-500" size={18} />
                            )}
                            <span className="font-semibold text-gray-700">
                                {service === 'weekly' ? (frequency === 'biweekly' ? 'Bi-weekly pickup' : 'Weekly pickup') : 'One time pickup'}
                            </span>
                        </div>
                    </div>

                    {}
                    <div className="w-full px-6 py-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-3">
                        <label className="block text-[#4B5457] text-[15px] mb-2 font-medium">
                            Service Type
                        </label>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                onClick={() => setService('one-time')}
                                className={`relative p-4 rounded-xl border transition-all h-20 flex flex-col justify-between ${service === 'one-time'
                                    ? 'border-[#3FBDF1] bg-[#EAF7FD]'
                                    : 'border-gray-200 bg-white hover:border-[#3FBDF1]'
                                    }`}
                            >
                                <div className="flex justify-between w-full items-start">
                                    <div
                                        className={`w-4.5 h-4.5 rounded-full border-[1.5px] flex items-center justify-center ${service === 'one-time' ? 'border-[#3FBDF1]' : 'border-gray-400'
                                            }`}
                                    >
                                        {service === 'one-time' && <div className="w-2.5 h-2.5 bg-[#3FBDF1] rounded-full" />}
                                    </div>
                                    <div className={`p-1.5 rounded-md ${service === 'one-time' ? 'bg-white' : 'bg-[#F9FAFB]'}`}>
                                        <Truck className={`text-gray-600`} size={18} />
                                    </div>
                                </div>
                                <span className="font-bold text-[#2F393D] text-[14px] text-left mt-2">One Time Service</span>
                            </button>
                            <button
                                onClick={() => setService('weekly')}
                                className={`relative p-4 rounded-xl border transition-all h-20 flex flex-col justify-between ${service === 'weekly'
                                    ? 'border-[#3FBDF1] bg-[#EAF7FD]'
                                    : 'border-gray-200 bg-white hover:border-[#3FBDF1]'
                                    }`}
                            >
                                <div className="flex justify-between w-full items-start">
                                    <div
                                        className={`w-4.5 h-4.5 rounded-full border-[1.5px] flex items-center justify-center ${service === 'weekly' ? 'border-[#3FBDF1]' : 'border-gray-400'
                                            }`}
                                    >
                                        {service === 'weekly' && <div className="w-2.5 h-2.5 bg-[#3FBDF1] rounded-full" />}
                                    </div>
                                    <div className={`p-1.5 rounded-md ${service === 'weekly' ? 'bg-white' : 'bg-[#F9FAFB]'}`}>
                                        <RotateCcw className="text-gray-600" size={18} />
                                    </div>
                                </div>
                                <span className="font-bold text-[#2F393D] text-[14px] text-left mt-2">Weekly (Bi-Weekly)</span>
                            </button>
                        </div>

                        {}
                        {service === 'one-time' && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 overflow-y-auto max-h-[40vh] sm:max-h-none pb-20 sm:pb-0">
                                {dateOptions.map((date) => (
                                    <button
                                        key={date.id}
                                        onClick={() => handleDateOptionClick(date.id)}
                                        className={`flex flex-col items-center justify-center p-3 h-22.5 rounded-[10px] border transition-all ${selectedDate?.toDateString() === parseDateSafe(date.id).toDateString() && !showDate
                                            ? 'border-[#3FBDF1] bg-white '
                                            : 'border-gray-200 bg-white hover:border-[#3FBDF1]'
                                            }`}
                                    >
                                        <div className="flex gap-1 text-[12px] font-medium text-[#4B5457]">
                                            <span>{date.month}</span>
                                        </div>
                                        <span
                                            className={`text-[20px] font-extrabold leading-none my-1.5 text-[#2F393D]`}
                                        >
                                            {date.day}
                                        </span>
                                        <span className="text-[12px] font-medium text-[#858B8E]">{date.label}</span>
                                    </button>
                                ))}
                                <button
                                    onClick={() => setShowDate(!showDate)}
                                    className={`flex flex-col items-center justify-center p-3 h-22.5 rounded-[10px] border transition-all ${showDate ? 'border-[#3FBDF1] bg-[#EAF7FD]' : 'border-gray-200 bg-white hover:border-[#3FBDF1]'}`}
                                >
                                    <span className="text-[12px] text-[#858B8E] font-medium">Other</span>
                                    <Calendar className={`${showDate ? 'text-[#3FBDF1]' : 'text-[#3FBDF1]'} my-1.5`} size={20} />
                                    <span className={`text-[12px] font-medium ${showDate ? 'text-[#3FBDF1]' : 'text-[#3FBDF1]'}`}>Custom Date</span>
                                    {showDate && (
                                        <div className="text-[10px] text-[#3FBDF1] mt-0.5 leading-none">^</div>
                                    )}
                                </button>

                                {showDate && (
                                    <div className="relative  col-span-2 sm:col-span-4 mt-2">

                                <hr className="border-gray-100 mb-4" />
                                        <DatePicker
                                            selected={selectedDate instanceof Date ? selectedDate : null}
                                            onChange={handleDateChange}
                                            inline
                                            minDate={(() => {
                                                const d = getPTDate();
                                                return (d.getHours() < 8 && isDateAvailable(d)) ? d : addAvailableDays(d, 1, availableDays, nonWorkingDays);
                                            })()}
                                            filterDate={isDateAvailable}
                                            calendarClassName="custom-datepicker font-size-0 w-full border-none"
                                            formatWeekDay={(nameOfDay) => nameOfDay.substring(0, 3)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {}
                        {service === 'weekly' && (
                            <div className="flex items-center">
                                <div className="bg-white border border-gray-100 rounded-xl  space-y-1 p-2 w-full">
                                    <div className="flex gap-1 p-4 bg-gray-50/50 rounded-xl">
                                        {(['Weekly', 'Bi-weekly'] as Frequency[]).map((type) => (
                                            <label key={type} className="flex items-center space-x-3 cursor-pointer group">
                                                <div className="relative flex items-center justify-center ml-2">
                                                    <input
                                                        type="checkbox"
                                                        className="peer h-4 w-4 p-2 appearance-none rounded-full border-2 border-gray-300 checked:border-sky-500 checked:bg-sky-500 transition-all cursor-pointer"
                                                        checked={frequency === type}
                                                        onChange={() => handleFrequencyChange(type)}
                                                    />
                                                    <svg
                                                        className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                        strokeWidth="4"
                                                    >
                                                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                                <span className={`text-sm font-semibold transition-colors ${frequency === type ? 'text-slate-800' : 'text-gray-400'}`}>
                                                    {type}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex justify-center flex-wrap gap-2 p-6 bg-gray-50/50 rounded-xl relative min-h-[100px]">
                                        {days.map((day) => {
                                            const isSelected = selectedDays.includes(day);                                            
                                            return (
                                                <div
                                                    key={day}
                                                    style={{ width: '60px' }}
                                                    className="flex flex-col items-center space-y-4 mx-1"
                                                >
                                                    <span className={`text-sm font-medium transition-colors whitespace-nowrap ${isSelected ? 'text-blue-500' : 'text-gray-500'}`}>
                                                        {day}
                                                    </span>

                                                    <button
                                                        onClick={() => toggleDays(day)}
                                                        className={`relative group focus:outline-none transition-transform active:scale-95 flex-shrink-0 cursor-pointer`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-sky-500' : 'border-gray-300 group-hover:border-gray-400'}`}
                                                        >
                                                            {isSelected && (
                                                                <div className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-in zoom-in duration-200" />
                                                            )}
                                                        </div>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-400">
                                            {frequency === 'Weekly' || frequency === 'Bi-weekly'
                                                ? 'Select your preferred day'
                                                : `Selected ${selectedDays.length} days`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                    <div className="flex p-2.5 justify-end items-center gap-2.5 self-stretch border-t border-gray-100 bg-white">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-2 rounded-lg text-gray-500 font-medium hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleOk}
                            disabled={!isSelectionValid()}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${isSelectionValid() ? 'bg-[#3FBDF1] text-white hover:bg-[#0092D1]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchedualModal;







