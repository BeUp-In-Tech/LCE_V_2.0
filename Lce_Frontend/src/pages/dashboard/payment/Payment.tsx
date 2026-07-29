import { useForm, Controller } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import cardIcon1 from "../../../assets/svg/payment/visacard.svg";
import cardIcon2 from "../../../assets/svg/payment/card-two.svg";
import cardIcon3 from "../../../assets/svg/payment/american-express.svg";
import cardIcon4 from "../../../assets/svg/payment/discover-card.svg";
import { useState, useEffect } from "react";
import { Trash2, Loader2, Plus, CreditCard, Star } from "lucide-react";

import { paymentMethodAPI } from "../../../services/api";
import { useAuth } from "../../../context/useAuth";
import { usePaymentMethods } from "../../../hooks/useQueries";
import { useDeletePaymentMethod } from "../../../hooks/useMutations";
import { CardSkeleton } from "../../../components/ui/Skeleton";
import { getCardInfo, getZipValidation } from "../../../utils/paymentUtils";

declare global {
  interface Window {
    Accept: any;
  }
}

type PaymentFormData = {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    country: string;
    zipCode: string;
};

type PaymentMethod = {
    id: string;
    type: string;
    card_last_four: string;
    card_expiry: string;
    is_default: boolean;
};

const PaymentForm: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const { data: pmData, isLoading, refetch } = usePaymentMethods();
    const deleteMutation = useDeletePaymentMethod();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showList, setShowList] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const paymentMethods: PaymentMethod[] = pmData?.payment_methods || [];

    
    useEffect(() => {
        if (pmData) {
            setShowList(pmData.has_payment_method ?? false);
        }
    }, [pmData]);

    useEffect(() => {
        const scriptUrl = import.meta.env.VITE_AUTHORIZENET_ENV === 'production' 
            ? 'https://js.authorize.net/v1/Accept.js'
            : 'https://jstest.authorize.net/v1/Accept.js';

        if (!document.querySelector(`script[src="${scriptUrl}"]`)) {
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    const {
        register,
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<PaymentFormData>({
        defaultValues: { country: "USA", cardNumber: "" },
    });

    const currentCardNumber = watch("cardNumber") || "";
    const currentCountry = watch("country") || "USA";

    const { name: cardName, format: cardFormat, cvvLength, cvvName } = getCardInfo(currentCardNumber);

    const onSubmit: SubmitHandler<PaymentFormData> = async (data) => {
        setIsSubmitting(true);
        setError(null);
        try {
            
            const [rawMonth, year] = data.expiryDate.split('/').map(s => s.trim());

            if (!rawMonth || !year) {
                throw new Error("Invalid expiry date format. Use MM/YY");
            }

            const month = rawMonth.padStart(2, '0');
            const fullYear = year.length === 2 ? `20${year}` : year;

            if (!window.Accept) {
                throw new Error("Payment library failed to load. Please refresh the page.");
            }

            const secureData = {
                authData: {
                    clientKey: import.meta.env.VITE_AUTHORIZENET_CLIENT_KEY || '',
                    apiLoginID: import.meta.env.VITE_AUTHORIZENET_LOGIN_ID || '',
                },
                cardData: {
                    cardNumber: data.cardNumber.replace(/\D/g, ''),
                    month: month,
                    year: fullYear,
                    cardCode: data.cvv,
                    zip: data.zipCode,
                }
            };

            window.Accept.dispatchData(secureData, async (response: any) => {
                if (response.messages.resultCode === "Error") {
                    let errorText = "";
                    for (let i = 0; i < response.messages.message.length; i++) {
                        errorText += response.messages.message[i].text + " ";
                    }
                    setError(errorText.trim() || "Payment verification failed.");
                    setIsSubmitting(false);
                    return;
                }

                try {
                    const payload = {
                        dataDescriptor: response.opaqueData.dataDescriptor,
                        dataValue: response.opaqueData.dataValue,
                        last_four: data.cardNumber.replace(/\D/g, '').slice(-4),
                        expiry_month: month,
                        expiry_year: fullYear,
                        billing_address: {
                            zip: data.zipCode,
                        }
                    };

                    await paymentMethodAPI.create(payload);

                    // Refresh list and show it
                    reset();
                    await refetch();
                    if (refreshUser) await refreshUser();
                    setShowList(true);
                } catch (err: any) {
                    console.error("Failed to add payment method:", err);
                    let errorMsg = "Failed to add payment method. Please check your details.";
                    if (err.response?.data?.errors) {
                        errorMsg = Object.values(err.response.data.errors).flat().join(" ");
                    } else if (err.response?.data?.message) {
                        errorMsg = err.response.data.message;
                    } else if (err.response?.data?.error) {
                        errorMsg = err.response.data.error;
                    } else if (err.message) {
                        errorMsg = err.message;
                    }
                    setError(errorMsg);
                } finally {
                    setIsSubmitting(false);
                }
            });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } }; message?: string };
            console.error("Failed to process payment details:", err);
            setError(error.response?.data?.error || error.message || "Failed to process payment details.");
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to remove this payment method?")) return;
        deleteMutation.mutate(id, {
            onSuccess: async () => {
                if (refreshUser) await refreshUser();
            },
            onError: () => {
                setError("Failed to delete payment method.");
            },
        });
    };

    const handleSetDefault = async (id: number) => {
        try {
            await paymentMethodAPI.setDefault(id);
            await refetch();
            if (refreshUser) await refreshUser();
        } catch {
            setError("Failed to set default payment method.");
        }
    };

    const handleSwitchToForm = () => {
        setShowList(false);
        setError(null);
    };

    const handleCancel = () => {
        if (paymentMethods.length > 0) {
            setShowList(true);
        }
        reset();
        setError(null);
    };

    if (isLoading && paymentMethods.length === 0 && !showList) {
        return (
            <div className="w-full flex justify-center sm:px-6 lg:px-10">
                <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-10">
                    <div className="w-full lg:w-1/3 space-y-3">
                        <CardSkeleton />
                    </div>
                    <div className="w-full lg:w-2/3 space-y-4">
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    const userName = user ? `${user.first_name} ${user.last_name}` : "User";

    return (
        <div className="w-full flex justify-center sm:px-6 lg:px-10">
            <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-10">

                {/* LEFT SIDE: Info & Icons */}
                <div className="w-full lg:w-1/3">
                    <h1 className="text-[28px] sm:text-[36px] font-semibold text-[#2F393D] mb-4">
                        Payment Methods
                    </h1>
                    <p className="text-[#4B5457] mb-6 leading-relaxed">
                        Manage your payment methods securely. We support all major credit cards.
                    </p>

                    <div className="flex gap-2 flex-wrap mb-6">
  {[cardIcon1, cardIcon2, cardIcon3, cardIcon4].map((icon, idx) => (
    <div
      key={idx}
      className="bg-gray-100 p-1 rounded-md w-16 h-10 flex items-center justify-center"
    >
      <img
        src={icon}
        alt="card"
        className="h-8 w-auto object-contain"
      />
    </div>
  ))}
</div>
                </div>

                {/* RIGHT SIDE: Content */}
                <div className="w-full lg:w-2/3 rounded-xl p-4 sm:p-6 bg-white border border-gray-100 shadow-sm">

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {!showList ? (
                        // ADD NEW CARD FORM
                        <>
                            <h2 className="text-xl font-semibold text-[#4B5457] mb-6">
                                Add New Card
                            </h2>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                {/* Card Number */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 focus-within:border-[#00A7EE] transition-colors relative">
                                    <label className="text-sm font-medium text-slate-500 mb-1 block">
                                        Card Number
                                    </label>
                                    <Controller
                                        control={control}
                                        name="cardNumber"
                                        rules={{
                                            required: "Card number is required",
                                            validate: (val) => val.replace(/\s/g, '').length >= 13 || "Card number too short"
                                        }}
                                        render={({ field: { onChange, name, value, ref } }) => (
                                            <div className="flex items-center justify-between">
                                                <PatternFormat
                                                    format={cardFormat}
                                                    getInputRef={ref}
                                                    id="cc-number"
                                                    autoComplete="cc-number"
                                                    name={name}
                                                    value={value}
                                                    onValueChange={(values) => onChange(values.formattedValue)}
                                                    placeholder={cardFormat.replace(/#/g, '0')}
                                                    className="w-full bg-transparent outline-none text-lg tracking-widest placeholder-slate-300"
                                                />
                                                {cardName && (
                                                    <span className="text-sm font-semibold text-[#00A7EE] ml-2 whitespace-nowrap">
                                                        {cardName}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    />
                                    {errors.cardNumber && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.cardNumber.message}
                                        </p>
                                    )}
                                </div>

                                {}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 focus-within:border-[#00A7EE] transition-colors">
                                        <label className="text-sm font-medium text-slate-500 mb-1 block">
                                            Expiration Date
                                        </label>
                                        <Controller
                                            control={control}
                                            name="expiryDate"
                                            rules={{
                                                required: "Expiration date is required",
                                                pattern: {
                                                    value: /^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/,
                                                    message: "Invalid format (MM/YY)"
                                                }
                                            }}
                                            render={({ field: { onChange, name, value, ref } }) => (
                                                <PatternFormat
                                                    format="##/##"
                                                    mask={['M', 'M', 'Y', 'Y']}
                                                    getInputRef={ref}
                                                    id="cc-exp"
                                                    autoComplete="cc-exp"
                                                    name={name}
                                                    value={value}
                                                    onValueChange={(values) => onChange(values.formattedValue)}
                                                    placeholder="MM/YY"
                                                    className="w-full bg-transparent outline-none placeholder-slate-300"
                                                />
                                            )}
                                        />
                                        {errors.expiryDate && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {errors.expiryDate.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 focus-within:border-[#00A7EE] transition-colors">
                                        <label className="text-sm font-medium text-slate-500 mb-1 block">
                                            Security Code ({cvvName})
                                        </label>
                                        <Controller
                                            control={control}
                                            name="cvv"
                                            rules={{
                                                required: "Security code is required",
                                                minLength: { value: cvvLength, message: `Must be ${cvvLength} digits` },
                                                maxLength: { value: cvvLength, message: `Must be ${cvvLength} digits` },
                                                pattern: { value: /^\d+$/, message: "Numbers only" }
                                            }}
                                            render={({ field: { onChange, value, name, ref } }) => (
                                                <input
                                                    type="password"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    id="cvv"
                                                    autoComplete="cc-csc"
                                                    name={name}
                                                    ref={ref}
                                                    value={value || ""}
                                                    maxLength={cvvLength}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, "");
                                                        onChange(val);
                                                    }}
                                                    placeholder={cvvLength === 4 ? "1234" : "123"}
                                                    className="w-full bg-transparent outline-none placeholder-slate-300"
                                                />
                                            )}
                                        />
                                        {errors.cvv && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {errors.cvv.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 focus-within:border-[#00A7EE] transition-colors">
                                        <label className="text-sm font-medium text-slate-500 mb-1 block">
                                            Country
                                        </label>
                                        <select
                                            {...register("country")}
                                            autoComplete="billing country"
                                            className="w-full bg-transparent outline-none cursor-pointer text-slate-700"
                                        >
                                            <option value="USA">United States</option>
                                            <option value="CAN">Canada</option>
                                            <option value="UK">United Kingdom</option>
                                        </select>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 focus-within:border-[#00A7EE] transition-colors">
                                        <label className="text-sm font-medium text-slate-500 mb-1 block">
                                            Zip Code
                                        </label>
                                        <Controller
                                            control={control}
                                            name="zipCode"
                                            rules={getZipValidation(currentCountry)}
                                            render={({ field: { onChange, name, value, ref } }) => (
                                                currentCountry === 'USA' ? (
                                                    <PatternFormat
                                                        format="#####"
                                                        getInputRef={ref}
                                                        autoComplete="billing postal-code"
                                                        name={name}
                                                        value={value}
                                                        onValueChange={(values) => onChange(values.value)}
                                                        placeholder="12345"
                                                        className="w-full bg-transparent outline-none placeholder-slate-300"
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        ref={ref}
                                                        autoComplete="billing postal-code"
                                                        name={name}
                                                        value={value || ""}
                                                        onChange={(e) => onChange(e.target.value.toUpperCase())}
                                                        placeholder={currentCountry === 'CAN' ? "A1A 1A1" : "SW1A 1AA"}
                                                        className="w-full bg-transparent outline-none placeholder-slate-300 uppercase"
                                                        maxLength={10}
                                                    />
                                                )
                                            )}
                                        />
                                        {errors.zipCode && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {errors.zipCode.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {}
                                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                                    {paymentMethods.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleCancel}
                                            className="w-full sm:w-auto px-8 py-3 rounded-lg border border-slate-300 text-slate-600 text-base font-semibold hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full sm:w-auto px-8 py-3 rounded-lg bg-[#00aeef] text-white text-base font-semibold hover:bg-[#009bd6] transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                Processing...
                                            </>
                                        ) : (
                                            "Save Card"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-[#4B5457]">
                                    Your Saved Methods
                                </h2>
                                <button
                                    onClick={handleSwitchToForm}
                                    className="flex items-center gap-1 text-[#00A7EE] hover:text-[#009bd6] font-medium"
                                >
                                    <Plus size={18} /> Add New
                                </button>
                            </div>

                            <div className="space-y-4">
                                {paymentMethods.map((method) => {
                                    
                                    
                                    
                                    
                                    
                                    

                                    return (
                                        <div key={method.id} className="bg-[#E6F6FD] border border-[#B3E5FC] p-4 rounded-xl relative group">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-sm font-bold text-[#2F393D] mb-1">
                                                        {userName}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        {method.is_default && (
                                                            <span className="bg-[#00A7EE] text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                Default
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-slate-500 uppercase">{method.type}</span>
                                                    </div>
                                                </div>
                                                {}
                                                <div className="p-2 bg-white rounded-md shadow-sm">
                                                    <CreditCard className="text-slate-400" size={24} />
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-lg text-slate-700 tracking-widest">
                                                        **** **** **** {method.card_last_four}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-sm text-slate-500">
                                                        Exp: <span className="font-medium text-slate-700">{method.card_expiry}</span>
                                                    </div>

                                                    {}
                                                    {!method.is_default && (
                                                        <button
                                                            onClick={() => handleSetDefault(Number(method.id))}
                                                            className="p-2 bg-white hover:bg-amber-50 text-slate-400 hover:text-amber-500 rounded-lg transition-colors border border-transparent hover:border-amber-100"
                                                            title="Set as default"
                                                        >
                                                            <Star size={18} />
                                                        </button>
                                                    )}

                                                    {}
                                                    <button
                                                        onClick={() => handleDelete(Number(method.id))}
                                                        disabled={deleteMutation.isPending}
                                                        className="p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                        title="Remove card"
                                                    >
                                                        {deleteMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentForm;
