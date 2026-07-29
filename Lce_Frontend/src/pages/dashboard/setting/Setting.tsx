import { useForm, Controller } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import ChangePasswordForm from "./ChangePasswordForm";
import { useAuth } from "../../../context/useAuth";
import { userAPI, utilityAPI } from "../../../services/api";
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import AddressAutocomplete from "../../../components/shared/AddressAutocomplete";
import type { GoogleAddress } from "../../../components/shared/AddressAutocomplete";

interface ProfileFormData {
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    cellphone: string;
    pickupAddress: string;
    aptSuiteUnit: string;
    city: string; 
    state: string;
    zipCode: string;
    cellphone: string;
    landline: string;
}

const Setting: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    
    const [zipStatus, setZipStatus] = useState<'idle' | 'checking' | 'serviceable' | 'not_serviceable'>('idle');
    const [zipMessage, setZipMessage] = useState<string>('');
    const [availableDays, setAvailableDays] = useState<string[]>([]);

    const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProfileFormData>();
    const pickupAddressValue = watch('pickupAddress');

    
    const checkZipCode = async (zip: string) => {
        if (!zip || zip.length < 5) {
            setZipStatus('idle');
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
        }
    };

    useEffect(() => {
        if (user) {
            reset({
                firstName: user.first_name,
                lastName: user.last_name,
                fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                email: user.email,
                cellphone: user.cell_phone || '',
                landline: user.phone_2 || '',
                pickupAddress: user.address?.street || '',
                aptSuiteUnit: user.address?.apt || '',
                city: user.address?.city || '',
                state: user.address?.state || '',
                zipCode: user.address?.zip || '',
            });
            // Check zip immediately if present
            if (user.address?.zip) {
                checkZipCode(user.address.zip);
            }
        }
    }, [user, reset]);

    const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            // Split Full Name if needed, or stick to first/last inputs if added
            // The form has "Full Name" input. Backend expects first and last.
            // I'll parse it simply designated by first space.
            const nameParts = data.fullName.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '';

            // Update Profile
            await userAPI.updateProfile({
                first_name: firstName,
                last_name: lastName,
                email: data.email,
                phone_2: data.landline,
                cell_phone: data.cellphone,
            });

            // Update Address
            // Check if address changed? For now just update.
            await userAPI.updateAddress({
                street: data.pickupAddress,
                apt: data.aptSuiteUnit,
                city: data.city,
                state: data.state,
                zip: data.zipCode
            });

            await refreshUser();
            setSuccessMessage("Profile updated successfully!");
            setTimeout(() => setSuccessMessage(null), 3000); // Clear message
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            console.error("Failed to update profile", err);
            setError(error.response?.data?.message || error.message || "Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyle = "w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder-gray-300";
    const labelStyle = "block text-sm font-medium text-gray-500 mb-1";

    return (
        <div className="min-h-screen flex flex-col items-center">
            {successMessage && (
                <div className="w-full max-w-2xl mb-4 p-4 bg-green-50 text-green-600 rounded-lg border border-green-200 text-center">
                    {successMessage}
                </div>
            )}
            {error && (
                <div className="w-full max-w-2xl mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-2xl space-y-6 mb-7">

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h2 className="text-[22px] sm:text-3xl font-semibold text-[#2F393D] mb-6">Account Information</h2>

                    <div className="space-y-4">
                        <div>
                            <label className={labelStyle}>Full Name</label>
                            <input
                                {...register("fullName", { required: "Name is required" })}
                                placeholder="Type full name"
                                className={inputStyle}
                            />
                        </div>

                        <div>
                            <label className={labelStyle}>Email</label>
                            <input
                                {...register("email", { required: "Email is required" })}
                                type="email"
                                placeholder="Type email"
                                className={inputStyle}
                                disabled // Email usually read-only or requires verify
                            />
                            <p className="text-xs text-gray-400 mt-1">Contact support to change email</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelStyle}>Cellphone <span className="text-red-400">*</span></label>
                                <Controller
                                    control={control}
                                    name="cellphone"
                                    rules={{ required: "Cellphone is required" }}
                                    render={({ field: { onChange, name, value, ref } }) => (
                                        <PatternFormat
                                            format="(###) ###-####"
                                            mask="_"
                                            getInputRef={ref}
                                            name={name}
                                            value={value}
                                            onValueChange={(values) => onChange(values.formattedValue)}
                                            placeholder="Cellphone"
                                            className={inputStyle}
                                        />
                                    )}
                                />
                                {errors.cellphone && <p className="text-red-500 text-xs mt-1">{errors.cellphone.message}</p>}
                            </div>
                            <div>
                                <label className={labelStyle}>Landline (Secondary)</label>
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
                                            className={inputStyle}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h2 className="text-[22px] sm:text-3xl font-semibold text-[#2F393D] mb-6">Address Information</h2>

                    <div className="space-y-4">
                        <div>
                            <label className={labelStyle}>Pickup Address:</label>

                            <input type="hidden" {...register("pickupAddress", { required: "Street address is required" })} />
                            <AddressAutocomplete
                                value={pickupAddressValue || ''}
                                onChange={(val) => setValue('pickupAddress', val, { shouldValidate: true })}
                                onSelect={(addr: GoogleAddress) => {
                                    setValue('pickupAddress', addr.street, { shouldValidate: true });
                                    setValue('city', addr.city, { shouldValidate: true });
                                    setValue('state', addr.state, { shouldValidate: true });
                                    setValue('zipCode', addr.zip, { shouldValidate: true });
                                    checkZipCode(addr.zip);
                                }}
                                placeholder="Street Address"
                                className={inputStyle}
                                hasError={!!errors.pickupAddress}
                            />
                            {errors.pickupAddress && <p className="text-red-500 text-xs mt-1">{errors.pickupAddress.message}</p>}
                        </div>

                        <div>
                            <label className={labelStyle}>Apt., Suite, Unit:</label>
                            <input {...register("aptSuiteUnit")} placeholder="Apt #" className={inputStyle} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelStyle}>City</label>
                                <input {...register("city")} placeholder="City" className={inputStyle} />
                            </div>
                            <div>
                                <label className={labelStyle}>State</label>
                                <input {...register("state")} placeholder="State" className={inputStyle} />
                            </div>
                            <div>
                                <label className={labelStyle}>Zip Code</label>
                                <Controller
                                    control={control}
                                    name="zipCode"
                                    render={({ field: { onChange, onBlur, name, value, ref } }) => (
                                        <PatternFormat
                                            format="#####"
                                            getInputRef={ref}
                                            name={name}
                                            value={value}
                                            onValueChange={(values) => onChange(values.value)}
                                            onBlur={(e) => {
                                                onBlur();
                                                checkZipCode(e.target.value.replace(/\D/g, ''));
                                            }}
                                            placeholder="Zip"
                                            className={`${inputStyle} ${zipStatus === 'serviceable' ? 'border-green-500 ring-1 ring-green-500' :
                                                zipStatus === 'not_serviceable' ? 'border-red-400 ring-1 ring-red-400' : ''
                                                }`}
                                        />
                                    )}
                                />
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
                            </div>
                        </div>

                        
                    </div>
                </div>

                {}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-[#00AEEF] hover:bg-sky-500 text-white font-semibold py-3 px-10 rounded-lg transition-colors w-full sm:w-auto flex justify-center items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Updating...
                            </>
                        ) : (
                            'Update Profile'
                        )}
                    </button>
                </div>
            </form>
            <ChangePasswordForm />
        </div>
    );
};

export default Setting;