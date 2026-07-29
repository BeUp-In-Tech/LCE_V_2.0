import { useForm } from 'react-hook-form';
import AuthHeader from '../../components/navbar/AuthHeader';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';

type ResetPasswordFormInputs = {
    password: string;
    password_confirmation: string;
};

const ResetPassword: React.FC = () => {
    const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordFormInputs>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const token = searchParams.get('token');

    
    useEffect(() => {
        if (!token) {
            setError('Invalid or missing reset token. Please request a new password reset link.');
        }
    }, [token]);

    const password = watch('password');

    const onSubmit = async (data: ResetPasswordFormInputs) => {
        if (!token) {
            setError('Invalid or missing reset token.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await authAPI.resetPassword({
                token,
                password: data.password,
                password_confirmation: data.password_confirmation
            });
            setSuccess(true);
            
            setTimeout(() => {
                navigate('/signin');
            }, 3000);
            
        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(err.response?.data?.error || err.response?.data?.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <AuthHeader />
            <div className="min-h-[calc(100vh-165px)] flex items-center justify-center p-2">
                <div className="w-full max-w-lg rounded-2xl border border-[#EBECEC] p-4 md:p-8">
                    <h1 className="text-[32px] text-center text-[#7C5CFF] mb-3 font-medium">
                        Reset Your Password
                    </h1>

                    {success ? (
                        <div className="text-center py-6">
                            <div className="flex justify-center mb-4">
                                <CheckCircle className="w-16 h-16 text-green-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">Password Reset Successful!</h2>
                            <p className="text-gray-500 mb-6">
                                Your password has been changed successfully.
                                You will be redirected to sign in...
                            </p>
                            <Link to='/signin' className="text-[#00ADF1] font-semibold hover:underline">
                                Sign In Now
                            </Link>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200 flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    {error}
                                </div>
                            )}

                            {!token ? (
                                <div className="text-center py-4">
                                    <Link to='/forgotPassword' className="text-[#00ADF1] font-semibold hover:underline">
                                        Request New Reset Link
                                    </Link>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl">
                                    <div className="relative">
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                {...register('password', {
                                                    required: 'Password is required',
                                                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                                                })}
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Enter new password"
                                                className="w-full p-3 border border-gray-300 rounded-md mt-2 outline-0 focus:border-[#00ADF1] pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-1 text-gray-500"
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                        {errors.password && (
                                            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                {...register('password_confirmation', {
                                                    required: 'Please confirm your password',
                                                    validate: value => value === password || 'Passwords do not match'
                                                })}
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                placeholder="Confirm new password"
                                                className="w-full p-3 border border-gray-300 rounded-md mt-2 outline-0 focus:border-[#00ADF1] pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-1 text-gray-500"
                                            >
                                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                        {errors.password_confirmation && (
                                            <p className="text-red-500 text-sm mt-1">{errors.password_confirmation.message}</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-[#00ADF1] hover:bg-[#0096d1] text-white font-semibold py-3 rounded-full text-lg transition-colors mt-2 disabled:bg-gray-300 flex justify-center items-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                Resetting...
                                            </>
                                        ) : (
                                            'Reset Password'
                                        )}
                                    </button>
                                </form>
                            )}

                            <p className="text-center mt-5 sm:mt-6 text-gray-500">
                                Remember your password?{' '}
                                <Link to='/signin' className="text-[#00ADF1] font-semibold hover:underline">Sign In</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
