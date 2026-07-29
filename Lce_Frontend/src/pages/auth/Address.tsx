import { Loader2, Truck, CheckCircle, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import AuthHeader from "../../components/navbar/AuthHeader";
import type { GoogleAddress } from "../../components/shared/AddressAutocomplete";
import AddressAutocomplete from "../../components/shared/AddressAutocomplete";
import { useAuth } from "../../context/useAuth";
import { preferencesAPI, userAPI, utilityAPI } from "../../services/api";

type FormData = {
    address: string;
    aditionalInfo: string;
    city: string;
    state: string;
    zipCode: string;
    instruction: string;
};



const Address = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [streetValue, setStreetValue] = useState('');

    // Zip code validation state
    const [zipStatus, setZipStatus] = useState<'idle' | 'checking' | 'serviceable' | 'not_serviceable'>('idle');
    const [zipMessage, setZipMessage] = useState<string>('');
    const [availableDays, setAvailableDays] = useState<string[]>([]);

    const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>();

    // Check zip code service area
    const checkZipCode = async (zip: string) => {
        if (!zip || zip.length < 5) {
            setZipStatus('idle');
            setZipMessage('');
            setAvailableDays([]);
            return;
        }

        setZipStatus('checking');
        try {
            const response = await utilityAPI.checkZone(zip);
            if (response.data.serviceable) {
                setZipStatus('serviceable');
                setZipMessage(response.data.message || 'We service your area!');
                setAvailableDays(response.data.available_days || []);
            } else {
                setZipStatus('not_serviceable');
                setZipMessage(response.data.message || 'Sorry, we do not service this area yet.');
                setAvailableDays([]);
            }
        } catch {
            setZipStatus('idle');
            setZipMessage('');
            setAvailableDays([]);
        }
    };

    // Keep streetValue in sync with form
    const watchedStreet = watch('address');
    useEffect(() => {
        if (watchedStreet !== undefined && watchedStreet !== streetValue) {
            setStreetValue(watchedStreet);
        }
    }, [watchedStreet]);

    
    useEffect(() => {
        if (user?.address) {
            const defaults = {
                address: user.address.street || '',
                aditionalInfo: user.address.apt || '',
                city: user.address.city || '',
                state: user.address.state || 'CA',
                zipCode: user.address.zip || '',
                instruction: ''
            };
            reset(defaults);
            setStreetValue(defaults.address);

            // Check zip if it exists
            if (defaults.zipCode) {
                checkZipCode(defaults.zipCode);
            }
        }
    }, [user, reset]);

    const onSubmit = async (data: FormData) => {
        // Prevent submit if zip is not serviceable
        if (zipStatus === 'not_serviceable') {
            setError("We do not service this area yet. Please provide an address within our service zone.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            
            await userAPI.updateAddress({
                street: data.address,
                apt: data.aditionalInfo,
                city: data.city,
                state: data.state,
                zip: data.zipCode,
            });

            
            if (data.instruction) {
                await preferencesAPI.update({
                    driver_instructions: data.instruction
                });
            }

            
            await refreshUser();

            navigate('/service'); 
            
        } catch (err: any) {
            console.error("Failed to save address:", err);
            setError(err.response?.data?.message || err.message || "Failed to save address");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white min-h-screen">
            <AuthHeader />

            <div className="max-w-157 mx-auto p-6 bg-white rounded-lg">
                {}
                <div className="flex items-center justify-between mb-10 mt-4 relative">
                    {}
                    <div className="absolute top-8.25 left-0 right-0 h-0.5 bg-[#EBECEC] z-0"></div>
                    <div className="absolute top-8.25 left-0 w-1/2 h-0.5 bg-[#00A7EE] z-0"></div>

                    {}
                    <button
                        type="button"
                        onClick={() => navigate('/accoutntype')}
                        className="flex flex-col items-start bg-white z-10 pr-2 cursor-pointer group"
                        title="Go back to Account Info"
                    >
                        <span className="text-xs font-medium text-[#4B5457] mb-2 group-hover:text-[#00A7EE] transition-colors">Step 1</span>
                        <div className="w-5 h-5 rounded-full bg-[#00A7EE] ring-4 ring-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </button>

                    {}
                    <div className="flex flex-col items-center bg-white z-10 px-2">
                        <span className="text-xs font-medium text-[#4B5457] mb-2">Step 2</span>
                        <div className="w-5 h-5 rounded-full bg-[#00A7EE] ring-4 ring-white shadow-sm flex items-center justify-center"></div>
                    </div>

                    {}
                    <div className="flex flex-col items-end bg-white z-10 pl-2">
                        <span className="text-xs font-medium text-[#858B8E] mb-2">Step 3</span>
                        <div className="h-5 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-[#EBECEC] ring-4 ring-white"></div>
                        </div>
                    </div>
                </div>

                <h1 className="text-2xl text-[#4B5457] mt-10">
                    Address Information
                </h1>

                {}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
                        {error}
                    </div>
                )}






                <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
                    {}
                    <div className="my-5">
                        <label className="block text-sm font-medium text-gray-700">
                            Street Address
                        </label>
                        <input type="hidden" {...register("address", { required: "Street address is required" })} />
                        <AddressAutocomplete
                            value={streetValue}
                            onChange={(val) => {
                                setStreetValue(val);
                                setValue('address', val, { shouldValidate: true });
                            }}
                            onSelect={(addr: GoogleAddress) => {
                                setValue('address', addr.street, { shouldValidate: true });
                                setValue('city', addr.city, { shouldValidate: true });
                                setValue('state', addr.state, { shouldValidate: true });
                                setValue('zipCode', addr.zip, { shouldValidate: true });
                                setStreetValue(addr.street);
                                checkZipCode(addr.zip);
                            }}
                            placeholder="Start typing your address..."
                            hasError={!!errors.address}
                        />
                        {errors.address && (
                            <p className="text-red-500 text-sm mt-1">
                                {errors.address.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-5 mb-5">
                        {}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Apt., Suite, Unit (Optional)
                            </label>
                            <input
                                {...register("aditionalInfo")}
                                className="w-full p-3 border border-gray-300 rounded-md mt-1 outline-0 focus:border-[#00A7EE]"
                                placeholder="Apt 4B"
                            />
                        </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

                        {}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                City
                            </label>
                            <input
                                {...register("city", { required: "City is required" })}
                                className="w-full p-3 border border-gray-300 rounded-md mt-1 outline-0 focus:border-[#00A7EE]"
                                placeholder="San Francisco"
                            />
                            {errors.city && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.city.message}
                                </p>
                            )}
                        </div>

                        {}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                State
                            </label>
                            <input
                                {...register("state", { required: "State is required" })}
                                className="w-full p-3 border border-gray-300 rounded-md mt-1 outline-0 focus:border-[#00A7EE]"
                                placeholder="CA"
                            />
                            {errors.state && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.state.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Zip Code
                            </label>
                            <input
                                {...register("zipCode", { 
                                    required: "Zip Code is required",
                                    onChange: (e) => {
                                        const val = e.target.value;
                                        if (val.length === 5) {
                                            checkZipCode(val);
                                        }
                                    }
                                })}
                                className={`w-full p-3 border rounded-md mt-1 outline-0 focus:border-[#00A7EE] ${
                                    zipStatus === 'serviceable' ? 'border-green-500 ring-1 ring-green-500' :
                                    zipStatus === 'not_serviceable' ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-300'
                                }`}
                                placeholder="94103"
                                onBlur={(e) => checkZipCode(e.target.value)}
                            />
                            {}
                            {zipStatus === 'checking' && (
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                    <Loader2 className="animate-spin" size={12} /> Checking service area...
                                </p>
                            )}
                            {zipStatus === 'serviceable' && (
                                <div className="text-xs mt-1 flex items-start gap-1">
                                    <CheckCircle className="text-green-600 mt-0.5 min-w-[12px]" size={12} />
                                    <div className="flex flex-col">
                                        <span className="text-green-600">{zipMessage}</span>
                                        {availableDays.length > 0 && (
                                            <span className="text-gray-500 mt-0.5">
                                                ({availableDays.join(', ')})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            {zipStatus === 'not_serviceable' && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertTriangle size={12} /> {zipMessage}
                                </p>
                            )}
                            {errors.zipCode && !zipMessage && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.zipCode.message}
                                </p>
                            )}
                        </div>
                    </div>


                    {}
                    <div className="border border-[#EBECEC] rounded-xl p-4 mt-8">
                        <h2 className="text-lg text-[#4B5457] mb-4">
                            Delivery Instructions
                        </h2>

                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Pickup & Delivery instructions
                            </label>
                            <textarea
                                {...register("instruction")}
                                className="w-full p-3 border border-gray-300 rounded-md mt-1 outline-none focus:border-[#00A7EE] min-h-25"
                                placeholder="Gate code, leave at back door, etc."
                            />
                        </div>
                    </div>

                    {}
                    <div className="relative flex justify-between border border-amber-400 rounded-xl px-4 py-5  flex-col sm:flex-row gap-6 sm:gap-12 mt-8 bg-amber-50/30">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 border border-amber-200 rounded-full">
                                <Truck className="text-amber-500" size={24} />
                            </div>
                            <div>
                                <p className="text-[#2F393D] text-sm">Pickups</p>
                                <p className="text-[#2F393D] font-semibold text-sm">8 AM - 5 PM</p>
                            </div>
                        </div>

                        {}
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 border border-amber-200 rounded-full">
                                <Truck className="text-amber-500" size={24} />
                            </div>
                            <div>
                                <p className="text-[#2F393D] text-sm">Delivery (Next Day)</p>
                                <p className="text-[#2F393D] font-semibold text-sm">8 AM - 5 PM</p>
                            </div>
                        </div>
                    </div>

                    {}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#00A7EE] text-white py-4 rounded-lg text-lg font-semibold mt-8 transition-colors hover:bg-[#0099d3] disabled:bg-gray-300 flex justify-center items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Saving...
                            </>
                        ) : (
                            'Continue to Services'
                        )}
                    </button>
                    <p className="text-center text-sm text-gray-500 mt-4">By clicking Complete Registration, you agree to our Terms of Service.</p>
                </form>
            </div>
        </div>
    );
};

export default Address;
