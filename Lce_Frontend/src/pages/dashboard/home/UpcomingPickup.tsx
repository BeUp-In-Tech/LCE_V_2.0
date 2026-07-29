
const UpcomingPickup = () => {
    return (
        <div className="grid grid-cols-1 gap-0 lg:gap-8 lg:grid-cols-3 ">
            <div className="lg:col-span-1 max-w-167 mx-auto w-full px-2 sm:px-6">
                <h1 className="text-2xl font-semibold text-[#6F48C7]">Upcoming Pickup</h1>
            </div>
            <div className="sm:max-w-167 lg:max-w-157 w-full mx-auto lg:mx-0 lg:col-span-2 p-0 sm:p-6 rounded-lg mt-5 sm:mt-0">
                <div className="bg-[#6F48C7] p-4 rounded-lg space-y-1">
                    <p className="text-[#D2C6EE] text-sm">Wash & Fold Laundry</p>
                    <p className="text-base text-white font-medium">Your pickup scheduled for Aug 17</p>
                    <p className="text-[#D2C6EE] text-sm cursor-pointer">See Details</p>
                </div>
            </div>
        </div>
    );
};

export default UpcomingPickup;