import { useForm } from 'react-hook-form';
import AuthHeader from '../../components/navbar/AuthHeader';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useState } from 'react';
import { Loader2, CheckCircle, AlertTriangle, Mail } from 'lucide-react';

type LoginFormInputs = {
    email: string;
};

const ForgottPassword: React.FC = () => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<LoginFormInputs>();
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async (data: LoginFormInputs) => {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await authAPI.forgotPassword(data.email);
            setSuccess(true);
            reset();
            
        } catch (err: any) {
            console.error('Forgot password error:', err);
            setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white min-h-screen">
            <AuthHeader />
            <div className="min-h-[calc(100vh-165px)] flex items-center justify-center p-4">
                <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 sm:p-10">
                    <h1 className="text-[26px] text-center text-[#7047EB] mb-3 font-medium">
                        Forgot Password?
                    </h1>

                    {success ? (
                        <div className="text-center py-6">
                            <div className="flex justify-center mb-4">
                                <CheckCircle className="w-16 h-16 text-green-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-[#2F393D] mb-2">Check your email</h2>
                            <p className="text-[#4B5457] mb-6 text-sm leading-relaxed">
                                We've sent a password reset link to your email address.
                                Please check your inbox and follow the instructions.
                            </p>
                            <Link to='/signin' className="text-[#3CA5E1] font-semibold hover:text-[#3496cc] transition-colors text-sm">
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <p className="text-center text-[#4B5457] text-[15px] mb-8 leading-relaxed max-w-[320px] mx-auto">
                                Enter your email address and we'll send you a link to reset your password
                            </p>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200 flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div>
                                    <div className="bg-[#F0F2F5] rounded-[14px] px-4 py-2.5 relative">
                                        <label htmlFor="email" className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 mb-0.5">
                                            <Mail size={12} /> Email
                                        </label>
                                        <input
                                            {...register('email', {
                                                required: 'Email is required',
                                                pattern: {
                                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                    message: 'Invalid email address'
                                                }
                                            })}
                                            type="email"
                                            id="email"
                                            placeholder="Enter your email"
                                            className="w-full bg-transparent border-none p-0 text-sm outline-none text-[#2F393D] placeholder-gray-400"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-[#3CA5E1] hover:bg-[#3496cc] text-white font-semibold py-3.5 rounded-full text-[15px] transition-colors mt-2 disabled:bg-gray-300 flex justify-center items-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>
                            </form>
                            <div className="text-center mt-10">
                                <p className="text-[#4B5457] text-sm mb-2">
                                    Remember your password?
                                </p>
                                <Link to='/signin' className="text-[#3CA5E1] font-semibold text-sm hover:text-[#3496cc] transition-colors">
                                    Back to Login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgottPassword;