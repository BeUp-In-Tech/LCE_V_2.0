import { Calendar, Clock, Truck, DollarSign } from "lucide-react";
import { usePrices } from "../../../hooks/useQueries";
import { useDashboardSubscription } from "../../../hooks/useDashboardSubscription";

const SchedulePickup = () => {
    const { data: priceData } = usePrices();
    const { activeSubscription } = useDashboardSubscription();
    
    const pdFee = priceData?.pd_fee ?? 9.99;
    const serviceFee = priceData?.service_fee ?? 5.00;

    return (
        <div className="rounded-xl bg-white p-6 border-2 border-[#C0C3C4] hover:border-[#00A7EE]">
            <h2 className="mb-2 text-2xl font-medium text-[#4B5457]">Pickup Details</h2>
                <div className='border border-b border-[#C0C3C4] mb-4'></div>
                <ul className="space-y-4">
                    <li className="flex items-start space-x-3 text-base text-gray-600">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6F6FD] text-[#0098D9]">
                            <Calendar size={18} />
                        </div>
                        <span>Reschedule or cancel anytime</span>
                    </li>
                    <li className="flex items-start space-x-3 text-base text-gray-600">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6F6FD] text-[#0098D9]">
                            <Truck size={18} />
                        </div>
                        <span>
                            <strong className={activeSubscription ? "line-through opacity-70 mr-1" : "mr-1"}>${pdFee.toFixed(2)}</strong>
                            pickup & delivery
                        </span>
                    </li>
                    <li className="flex items-start space-x-3 text-base text-gray-600">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6F6FD] text-[#0098D9]">
                            <DollarSign size={18} />
                        </div>
                        <span>
                            <strong className={activeSubscription ? "line-through opacity-70 mr-1" : "mr-1"}>${serviceFee.toFixed(2)}</strong>
                            service fee
                        </span>
                    </li>
                    <li className="flex items-start space-x-3 text-base text-gray-600">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6F6FD] text-[#0098D9]">
                            <Clock size={18} />
                        </div>
                        <span>Pickups & Deliveries 8am - 5pm</span>
                    </li>
                </ul>
        </div>
    );
};

export default SchedulePickup;