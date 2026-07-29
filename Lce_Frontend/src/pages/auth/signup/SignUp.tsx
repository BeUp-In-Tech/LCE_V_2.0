import appleIcon from '../../../assets/svg/apple-icon.svg';
import googleIcon from '../../../assets/svg/googl-icon.svg';
import { Link } from 'react-router-dom';
import AuthHeader from '../../../components/navbar/AuthHeader';

import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../components/Toast';

const SignUp = () => {
    const { googleLogin } = useAuth();
    const navigate = useNavigate();
    const { showError } = useToast();

    const handleGoogleLogIn = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                const { isNewUser } = await googleLogin(tokenResponse.access_token);
                if (isNewUser) {
                    navigate('/accoutntype');
                } else {
                    navigate('/dashboard/dashboardHome');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Google sign up failed. Please try again.';
                showError(message);
            }
        },
        onError: () => {
            showError('Google authentication was cancelled or failed. Please try again.');
        },
    });

    return (
        <div className='bg-white'>
            <AuthHeader />
            <section className='flex flex-col justify-center items-center min-h-[calc(100vh-165px)] p-2'>
                <div className="max-w-147.5 mx-auto p-5 sm:p-18 bg-white border border-[#EBECEC] rounded-3xl">
                    <h2 className="text-[26px] sm:text-[32px] mb-4">
                        <span className='text-[#6F48C7]'>Sign up for a </span>
                        <span className="text-[#6F48C7] font-semibold">hassle free Cleaning & washing</span>
                        <span className="text-[#6F48C7]"> partner</span>
                    </h2>
                    <div className="flex flex-col gap-4">
                        <Link to='/accoutntype'>
                            <button className="w-full bg-[#00A7EE] transition-colors hover:bg-[#0099d3] text-white py-3 px-2 rounded-full text-base sm:text-[20px] font-medium cursor-pointer">
                                Sign Up With Email
                            </button>
                        </Link>
                        <button onClick={() => handleGoogleLogIn()} className="w-full border text-[#2F393D] py-3 px-2 rounded-full text-base sm:text-lg font-medium flex justify-center items-center cursor-pointer hover:bg-gray-50 transition-colors">
                            <img
                                src={googleIcon}
                                alt="google-icon"
                                className="w-6 h-6 mr-2"
                            />
                            Sign up with Google
                        </button>
                        <button
                            disabled
                            className="w-full border text-[#2F393D] py-3 px-2 rounded-full text-base sm:text-lg font-medium flex justify-center items-center cursor-not-allowed opacity-60 transition-colors"
                            title="Coming Soon"
                        >
                            <img
                                src={appleIcon}
                                alt="apple-icon"
                                className="w-6 h-5 mr-2"
                            />
                            Sign up with Apple
                            <span className="ml-2 text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Soon</span>
                        </button>
                    </div>
                    <p className="text-center mt-10 text-gray-500 cursor-pointer">
                        <span className='text-gray-500'>Already have an account? </span>
                        <Link to='/signin' className="text-[#00ADF1] font-semibold hover:underline">Sign In</Link>
                    </p>
                </div>
            </section>
        </div>
    );
};

export default SignUp;