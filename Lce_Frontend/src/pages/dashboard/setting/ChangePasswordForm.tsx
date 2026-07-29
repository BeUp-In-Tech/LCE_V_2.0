import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { userAPI } from "../../../services/api";
import { useState } from "react";

interface PasswordFormValues {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

const ChangePasswordForm = () => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch } = useForm<PasswordFormValues>();
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onSubmit: SubmitHandler<PasswordFormValues> = async (data) => {
        setSuccess(null);
        setError(null);
        
        try {
            await userAPI.updatePassword({
                current_password: data.currentPassword,
                password: data.newPassword,
                password_confirmation: data.confirmPassword
            });
            setSuccess("Password updated successfully.");
            reset();
        } catch (err: any) {
             console.error("Failed to update password:", err);
             
             setError(err.response?.data?.error || err.response?.data?.message || "Failed to update password");
        }
    };

    const newPassword = watch("newPassword");

    return (
        <div className="flex flex-col items-end w-full max-w-2xl mx-auto">
            {success && (
                <div className="w-full mb-4 p-4 bg-green-50 text-green-600 rounded-lg border border-green-200">
                    {success}
                </div>
            )}
            {error && (
                <div className="w-full mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            <div className="w-full bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-[22px] sm:text-3xl font-semibold text-[#2F393D] mb-6">Change Password</h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-600">
                            Current Password
                        </label>
                        <input
                            type="password"
                            {...register('currentPassword', { required: "Current password is required" })}
                            placeholder="••••••••"
                            className={`w-full px-4 py-3 rounded-lg border bg-gray-50/30 focus:outline-none focus:ring-2 transition-all 
                ${errors.currentPassword ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-sky-100 focus:border-sky-400'}`}
                        />
                        {errors.currentPassword && (
                            <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-600">
                            New Password
                        </label>
                        <input
                            type="password"
                            {...register('newPassword', { 
                                required: "New password is required",
                                minLength: { value: 6, message: "Must be at least 6 characters" }
                            })}
                            placeholder="••••••••"
                            className={`w-full px-4 py-3 rounded-lg border bg-gray-50/30 focus:outline-none focus:ring-2 transition-all 
                ${errors.newPassword ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-sky-100 focus:border-sky-400'}`}
                        />
                        {errors.newPassword && (
                            <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-600">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            {...register('confirmPassword', { 
                                required: "Please confirm new password",
                                validate: value => value === newPassword || "Passwords do not match"
                            })}
                            placeholder="••••••••"
                            className={`w-full px-4 py-3 rounded-lg border bg-gray-50/30 focus:outline-none focus:ring-2 transition-all 
                ${errors.confirmPassword ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-sky-100 focus:border-sky-400'}`}
                        />
                        {errors.confirmPassword && (
                            <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
                        )}
                    </div>
                </form>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                onClick={handleSubmit(onSubmit)}
                className="mt-6 px-8 py-3 bg-[#00aeef] hover:bg-[#0096ce] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 w-full sm:w-auto"
            >
                {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
        </div>
    );
};

export default ChangePasswordForm;