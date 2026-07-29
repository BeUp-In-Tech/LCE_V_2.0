import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import { Loader2, X } from "lucide-react";
import cardIcon1 from "../../../assets/svg/payment/visacard.svg";
import cardIcon2 from "../../../assets/svg/payment/card-two.svg";
import cardIcon3 from "../../../assets/svg/payment/american-express.svg";
import cardIcon4 from "../../../assets/svg/payment/discover-card.svg";
import { paymentMethodAPI } from "../../../services/api";
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

interface AddPaymentModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: () => void;
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ isOpen, setIsOpen, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  
  useEffect(() => {
      if (isOpen) {
          document.body.style.overflow = 'hidden';
      } else {
          document.body.style.overflow = 'unset';
          reset();
          setError(null);
      }
      return () => {
          document.body.style.overflow = 'unset';
      };
  }, [isOpen, reset]);

  if (!isOpen) return null;

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
                reset();
                onSuccess(); // Triggers refresh in parent and closes modal
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
        const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
        setError(errorObj.response?.data?.error || errorObj.message || "Failed to process payment details.");
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
        <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 fade-in duration-200">
            <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={20} />
            </button>

            <h2 className="text-xl font-semibold text-[#2F393D] mb-2">
                Add Payment Method
            </h2>
            
            <p className="text-sm text-[#4B5457] mb-4">
                Manage your payment methods securely. We support all major credit cards.
            </p>

            <div className="flex gap-2 flex-wrap mb-6">
                {[cardIcon1, cardIcon2, cardIcon3, cardIcon4].map((icon, idx) => (
                    <div
                        key={idx}
                        className="bg-gray-100 p-1 rounded-md w-12 h-8 flex items-center justify-center"
                    >
                        <img
                            src={icon}
                            alt="card"
                            className="h-6 w-auto object-contain"
                        />
                    </div>
                ))}
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                                    id="cc-number-modal"
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

                <div className="grid grid-cols-2 gap-4">
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
                                    id="cc-exp-modal"
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
                                    id="cvv-modal"
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="flex justify-end gap-3 pt-4 mt-2">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-xl bg-[#00aeef] hover:bg-[#0096ce] text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-w-[120px]"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            "Save Card"
                        )}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default AddPaymentModal;
