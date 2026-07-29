import coomingSnImage from "../../../assets/dashboard/comming-soon.webp"

const GroupLaundry = () => {
    return (
        <div className="min-h-[calc(100vh-165px)] flex flex-col items-center justify-center">
            <div className="max-w-125 mx-auto">
                <img className="w-full" src={coomingSnImage} alt="coomingSnImage" />
            </div>
            <h1 className="text-[#2F393D] text-2xl text-center mt-6 font-medium">Coming Soon...</h1>
        </div>
    );
};

export default GroupLaundry;