import appleIcon from '../../assets/svg/apple-icon.svg';
import googleIcon from '../../assets/svg/googl-icon.svg';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../Toast';

const SocialPage = () => {
    const { googleLogin } = useAuth();
    const navigate = useNavigate();
    const { showError } = useToast();

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                const { isNewUser } = await googleLogin(tokenResponse.access_token);
                if (isNewUser) {
                    navigate('/accoutntype');
                } else {
                    navigate('/dashboard/dashboardHome');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Google login failed. Please try again.';
                showError(message);
            }
        },
        onError: () => {
            showError('Google authentication was cancelled or failed. Please try again.');
        },
    });

    return (
        <div className="flex flex-col gap-3.5">
            <button
                onClick={() => handleGoogleLogin()}
                className="w-full bg-white border border-gray-200 text-[#2F393D] py-3 rounded-full text-[14px] font-medium flex justify-center items-center cursor-pointer hover:bg-gray-50 transition-colors"
            >
                <img
                    src={googleIcon}
                    alt="google-icon"
                    className="w-5 h-5 mr-2.5"
                />
                Log in with Google
            </button>
            <button
                disabled
                className="w-full bg-white border border-gray-200 text-[#2F393D] py-3 rounded-full text-[14px] font-medium flex justify-center items-center cursor-not-allowed opacity-60 transition-colors"
                title="Coming Soon"
            >
                <img
                    src={appleIcon}
                    alt="apple-icon"
                    className="w-5 h-5 mr-2.5"
                />
                Log in with Apple
                <span className="ml-2 text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Soon</span>
            </button>
        </div>
    );
};

export default SocialPage;