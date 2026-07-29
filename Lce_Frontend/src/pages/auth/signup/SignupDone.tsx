import AuthHeader from "../../../components/navbar/AuthHeader";
import signUpDone from "../../../assets/authpage/succesful-image.png"
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";

const SignupDone = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const handleClick = () => {
        navigate("/dashboard/dashboardHome")
    }

    const handlePaymentMethod = () => {
        navigate("/dashboard/payment");
    }
    return (
        <div>
            <AuthHeader />
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-365px)] p-4">
                <div className="max-w-185 mx-auto">
                    <img className="w-full" src={signUpDone} alt="Sign up completed successfully" />
                </div>
                <div className="text-center max-w-185 mx-auto">
                    <h1 className="text-[#00A7EE] text-3xl sm:text-[40px] font-semibold leading-[140%]">Congratulations! Your Schedule For a Pickup Has Been Submitted</h1>
                    <p className="text-base leading-[140%] text-[#2F393D] mt-5">A responsible person will be there to pickup for your cloths.</p>
                </div>
                <div className="mt-15 flex flex-col sm:flex-row gap-3 sm:gap-6">
                    <button onClick={handleClick} className="bg-[#FFFFFF] transition-colors hover:bg-gray-100 text-[#2F393D] px-10 py-3 rounded-lg border text-base sm:text-xl font-medium">Home</button>
                    {!user?.payment?.card_last_four && (
                        <button onClick={handlePaymentMethod} className="bg-[#00A7EE] transition-colors hover:bg-[#0099d3] text-[#FFFFFF] px-10 py-3 rounded-lg text-base sm:text-xl font-medium">Add Payment Method</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SignupDone;