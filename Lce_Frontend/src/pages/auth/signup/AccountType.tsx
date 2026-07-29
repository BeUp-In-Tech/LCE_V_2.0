import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import AuthHeader from "../../../components/navbar/AuthHeader";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { userAPI } from "../../../services/api";

type FormData = {
    firstName: string;
    lastName: string;
    cellphone: string;
    landline?: string;
    email: string;
    password: string;
    businessName?: string;
    businessType?: BusinessType;
};

type BusinessType =
    | "Hotel"
    | "Office"
    | "Restaurant"
    | "Gym"
    | "Hospital"
    | "Other";

const AccountType: React.FC = () => {
    const [accountType, setAccountType] = useState<"personal" | "business">("personal");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();
    const location = useLocation();
    const prefillEmail = location.state?.email || "";
    const prefillPassword = location.state?.password || "";

    const { register: registerUser, user, isAuthenticated, refreshUser } = useAuth();
    const isReturningUser = isAuthenticated && !!user;

    const { register, control, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
        defaultValues: {
            email: prefillEmail,
            password: prefillPassword,
        }
    });

    // Pre-fill form when a returning user navigates back from Step 2/3
    useEffect(() => {
        if (isReturningUser && user) {
            reset({
                firstName: user.first_name || '',
                lastName: user.last_name || '',
                cellphone: user.phone || '',
                landline: user.phone_2 || '',
                email: user.email || '',
                password: '', // Not needed for returning users
            });
            // Restore account type from localStorage if available
            const savedType = localStorage.getItem('accountType');
            if (savedType === 'business' || savedType === 'personal') {
                setAccountType(savedType);
            }
        }
    }, [isReturningUser, user, reset]);

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        setError(null);

        try {
            if (isReturningUser) {
                // Update existing profile instead of creating a new account
                await userAPI.updateProfile({
                    first_name: data.firstName,
                    last_name: data.lastName,
                    cell_phone: data.cellphone,
                });
                await refreshUser();
            } else {
                // Register the user with the backend
                await registerUser({
                    email: data.email,
                    password: data.password,
                    password_confirmation: data.password,
                    first_name: data.firstName,
                    last_name: data.lastName,
                    cell_phone: data.cellphone,
                });
            }

            // Store account type in localStorage for potential use
            localStorage.setItem('accountType', accountType);
            if (accountType === 'business' && data.businessName) {
                localStorage.setItem('businessName', data.businessName);
                localStorage.setItem('businessType', data.businessType || '');
            }

            // Navigate to service selection page
            navigate("/address");
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <AuthHeader />
            <section>
                <div className="max-w-3xl mx-auto  sm:p-6 p-2 bg-white rounded-xl">
                    <h2 className="text-[32px] font-semibold text-[#00A7EE] mb-7">Let's get started!</h2>
                    <div className="flex items-center justify-between mb-10 mt-4 relative">
                        {}
                        <div className="absolute top-[33px] left-0 right-0 h-0.5 bg-[#EBECEC] z-0"></div>
                        {}

                        {}
                        <div className="flex flex-col items-start bg-white z-10 pr-2">
                            <span className="text-xs font-medium text-[#4B5457] mb-2">Step 1</span>
                            <div className="w-5 h-5 rounded-full bg-[#00A7EE] ring-4 ring-white shadow-sm flex items-center justify-center"></div>
                        </div>

                        {}
                        <div className="flex flex-col items-center bg-white z-10 px-2">
                            <span className="text-xs font-medium text-[#858B8E] mb-2">Step 2</span>
                            <div className="h-5 flex items-center justify-center">
                                <div className="w-4 h-4 rounded-full bg-[#EBECEC] ring-4 ring-white"></div>
                            </div>
                        </div>

                        {}
                        <div className="flex flex-col items-end bg-white z-10 pl-2">
                            <span className="text-xs font-medium text-[#858B8E] mb-2">Step 3</span>
                            <div className="h-5 flex items-center justify-center">
                                <div className="w-4 h-4 rounded-full bg-[#EBECEC] ring-4 ring-white"></div>
                            </div>
                        </div>
                    </div>

                    {}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {}
                    <div className="mb-10">
                        <p className="text-xl text-[#4B5457] font-medium mb-6">Create Your Account</p>

                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <label className={`mr-8 cursor-pointer border p-6 rounded-lg w-full ${accountType === 'personal' ? 'bg-[#E6F6FD] text-[#00A7EE]' : 'text-gray-500 border-[#EBECEC]'}`}>
                                <input
                                    type="radio"
                                    checked={accountType === "personal"}
                                    onChange={() => setAccountType("personal")}
                                    className="mr-2"
                                />
                                Personal Account
                            </label>

                            <label className={`cursor-pointer border p-6 rounded-lg w-full ${accountType === 'business' ? 'bg-[#E6F6FD] text-[#00A7EE]' : 'text-gray-500 border-[#EBECEC]'
                                }`}>
                                <input
                                    type="radio"
                                    checked={accountType === "business"}
                                    onChange={() => setAccountType("business")}
                                    className="mr-2"
                                />
                                Business Account
                            </label>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="border border-[#eef5f5] rounded-2xl p-2 sm:p-5">
                        {}
                        {accountType === "personal" && (
                            <div>
                                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-500">
                                            First Name
                                        </label>
                                        <input
                                            {...register("firstName", { required: true })}
                                            placeholder="Your first name here"
                                            className="w-full border-none  border  rounded-md mt-1 outline-0 text-sm font-medium text-gray-700 bg-transparent"
                                            disabled={isLoading}
                                        />
                                        {errors.firstName && (
                                            <p className="text-red-500 text-sm mt-1">First name is required</p>
                                        )}
                                    </div>
                                    <div className="bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-500">
                                            Last Name
                                        </label>
                                        <input
                                            {...register("lastName", { required: true })}
                                            placeholder="Your last name here"
                                            className="w-full  border-none border-gray-300 rounded-md mt-1 outline-0 text-sm font-medium text-gray-700 bg-transparent"
                                            disabled={isLoading}
                                        />
                                        {errors.lastName && (
                                            <p className="text-red-500 text-sm mt-1">Last name is required</p>
                                        )}
                                    </div>
                                </div>
                                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                <label className="block text-sm font-medium text-gray-500">Cellphone <span className="text-red-400">*</span></label>
                                <Controller
                                    control={control}
                                    name="cellphone"
                                    rules={{ required: 'Cellphone is required' }}
                                    render={({ field: { onChange, name, value, ref } }) => (
                                        <PatternFormat
                                            format="(###) ###-####"
                                            mask="_"
                                            getInputRef={ref}
                                            name={name}
                                            value={value}
                                            onValueChange={(values) => onChange(values.formattedValue)}
                                            placeholder="Cellphone"
                                            className="w-full border-none border-gray-300 rounded-md mt-1 outline-0 text-sm font-medium text-gray-700 bg-transparent"
                                            disabled={isLoading}
                                        />
                                    )}
                                />
                                {errors.cellphone && (
                                    <p className="text-red-500 text-sm mt-1">{errors.cellphone.message || 'Cellphone is required'}</p>
                                )}
                            </div>
                            <div className="bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                <label className="block text-sm font-medium text-gray-500">Landline (Secondary)</label>
                                <Controller
                                    control={control}
                                    name="landline"
                                    render={({ field: { onChange, name, value, ref } }) => (
                                        <PatternFormat
                                            format="(###) ###-####"
                                            mask="_"
                                            getInputRef={ref}
                                            name={name}
                                            value={value}
                                            onValueChange={(values) => onChange(values.formattedValue)}
                                            placeholder="Secondary Phone"
                                            className="w-full border-none border-gray-300 rounded-md mt-1 outline-0 text-sm font-medium text-gray-700 bg-transparent"
                                        />
                                    )}
                                />
                            </div>
                        </div>
                                <div className="mb-4 bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-500">
                                        Email
                                    </label>
                                    <input
                                        {...register("email", {
                                            required: true,
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: 'Invalid email address'
                                            }
                                        })}
                                        type="email"
                                        placeholder="Type email here"
                                        className={`w-full border-none border-gray-300 rounded-md mt-1 outline-0 text-sm font-medium text-gray-700 bg-transparent ${isReturningUser ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        disabled={isLoading}
                                        readOnly={isReturningUser}
                                    />
                                    {isReturningUser && (
                                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                                    )}
                                    {errors.email && (
                                        <p className="text-red-500 text-sm mt-1">Email is required</p>
                                    )}
                                </div>
                                {!isReturningUser && (
                                <div className="relative  transition-all bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-500">
                                            Password
                                        </label>
                                    </div>
                                    <div className="relative flex items-center">
                                        <input
                                            {...register('password', {
                                                required: !isReturningUser ? 'Password is required' : false,
                                                minLength: {
                                                    value: 6,
                                                    message: 'Password must be at least 6 characters'
                                                }
                                            })}
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Set an Password"
                                            className="w-full  border-none border-gray-300 rounded-md mt-2 outline-0 text-sm font-medium text-gray-700 bg-transparent"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className=" mt-2 absolute top-50% right-2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-red-500 text-sm mt-1">{errors.password.message || 'Password is required'}</p>
                                    )}
                                </div>
                                )}
                            </div>
                        )}

                        {}
                        {accountType === "business" && (
                            <div>
                                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-500">
                                            First Name
                                        </label>
                                        <input
                                            {...register("firstName", { required: true })}
                                            placeholder="Your first name here"
                                            className="w-full border-none border rounded-md mt-1 outline-0 text-sm font-medium text-gray-700 bg-transparent"
                                            disabled={isLoading}
                                        />
                                        {errors.firstName && (
                                            <p className="text-red-500 text-sm mt-1">First name is required</p>
                                        )}
                                    </div>
                                    <div className="bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-500">
                                            Last Name
                                        </label>
                                        <input
                                            {...register("lastName", { required: true })}
                                            placeholder="Your last name here"
                                            className="w-full border-none border-gray-300 rounded-md mt-1 outline-0 text-sm font-medium text-gray-700 bg-transparent"
                                            disabled={isLoading}
                                        />
                                        {errors.lastName && (
                                            <p className="text-red-500 text-sm mt-1">Last name is required</p>
                                        )}
                                    </div>
                                </div>
                                {}
                                <div className="mb-4 bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-500">
                                        Business Name
                                    </label>
                                    <input
                                        {...register("businessName", { required: true })}
                                        placeholder="Provide your business name"
                                        className="w-full border-none border-gray-300 rounded-md mt-1 outline-0 text-sm font-medium text-gray-700 bg-transparent"
                                        disabled={isLoading}
                                    />
                                    {errors.businessName && (
                                        <p className="text-red-500 text-sm mt-1">Business Name is required</p>
                                    )}
                                </div>

                                <div className="mb-4 bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-500">
                                        Business Phone Number
                                    </label>
                                    <Controller
                                        control={control}
                                        name="phoneNumber"
                                        rules={{ required: true }}
                                        render={({ field: { onChange, name, value, ref } }) => (
                                            <PatternFormat
                                                format="(###) ###-####"
                                                mask="_"
                                                getInputRef={ref}
                                                name={name}
                                                value={value}
                                                onValueChange={(values) => onChange(values.formattedValue)}
                                                placeholder="(555) 555-5555"
                                                className="w-full border-none border-gray-300 rounded-md mt-1 outline-0 text-sm font-medium text-gray-700 bg-transparent"
                                                disabled={isLoading}
                                            />
                                        )}
                                    />
                                    {errors.phoneNumber && (
                                        <p className="text-red-500 text-sm mt-1">Phone Number is required</p>
                                    )}
                                </div>

                                <div className="mb-4 bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-500">
                                        Business Email
                                    </label>
                                    <input
                                        {...register("email", { required: true })}
                                        type="email"
                                        placeholder="Type email here"
                                        className="w-full border-none border-gray-300 rounded-md mt-1 outline-0 text-sm font-medium text-gray-700 bg-transparent"
                                        disabled={isLoading}
                                    />
                                    {errors.email && (
                                        <p className="text-red-500 text-sm mt-1">Email is required</p>
                                    )}
                                </div>

                                <div className="mb-4 bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                    <label className="block text-sm font-medium text-gray-500 mb-1" htmlFor="businessType">
                                        Business Type
                                    </label>
                                    <select
                                        {...register("businessType", { required: true })}
                                        className="w-full border-none border-gray-300 rounded-md mt-1 outline-0 text-sm font-medium text-gray-700 bg-transparent"
                                        disabled={isLoading}>
                                        <option value="">Select business type</option>
                                        <option value="Hotel">Hotel</option>
                                        <option value="Office">Office</option>
                                        <option value="Restaurant">Restaurant</option>
                                        <option value="Gym">Gym</option>
                                        <option value="Hospital">Hospital</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {!isReturningUser && (
                                <div className="relative transition-all bg-[#f0f0f0] px-3 py-4 rounded-xl">
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-500">
                                            Password
                                        </label>
                                    </div>
                                    <div className="relative flex items-center">
                                        <input
                                            {...register('password', {
                                                required: !isReturningUser ? 'Password is required' : false,
                                                minLength: {
                                                    value: 6,
                                                    message: 'Password must be at least 6 characters'
                                                }
                                            })}
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Set an Password"
                                            className="w-full border-none border-gray-300 rounded-md mt-2 outline-0 text-sm font-medium text-gray-700 bg-transparent"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="mt-2 absolute top-50% right-2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-red-500 text-sm mt-1">{errors.password.message || 'Password is required'}</p>
                                    )}
                                </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#00A7EE] hover:bg-[#0099d3] disabled:bg-gray-400 text-white p-3 rounded-lg mt-6 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    {isReturningUser ? 'Updating...' : 'Creating Account...'}
                                </>
                            ) : (
                                isReturningUser ? 'Save & Continue' : 'Next'
                            )}
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
};

export default AccountType;
