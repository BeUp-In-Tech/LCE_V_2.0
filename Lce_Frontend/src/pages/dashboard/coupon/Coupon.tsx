import { useState } from 'react';
import promotionBaner from '../../../assets/dashboard/promotion-banner.webp'
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from "react-hook-form";
import { promoCodeAPI } from '../../../services/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface PromoFormInputs {
    promoCode: string;
}

interface PromoResult {
    success: boolean;
    message: string;
    discount?: number;
    type?: string;
}

const Coupon: React.FC = () => {
    const { register, handleSubmit, formState: { errors }, reset } = useForm<PromoFormInputs>();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<PromoResult | null>(null);

    const onSubmit: SubmitHandler<PromoFormInputs> = async (data) => {
        setIsLoading(true);
        setResult(null);
        
        try {
            
            const validateResponse = await promoCodeAPI.validate(data.promoCode);
            
            if (validateResponse.data.valid) {
                
                const applyResponse = await promoCodeAPI.apply(data.promoCode);
                
                setResult({
                    success: true,
                    message: applyResponse.data.message || 'Promo code applied successfully!',
                    discount: validateResponse.data.discount,
                    type: validateResponse.data.type
                });
                reset();
            } else {
                setResult({
                    success: false,
                    message: validateResponse.data.message || 'Invalid promo code'
                });
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setResult({
                success: false,
                message: error.response?.data?.message || 'Failed to apply promo code. Please try again.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className='max-w-5xl mx-auto'>
                <img className='h-10 sm:h-auto w-full' src={promotionBaner} alt="promotionBaner" />
            </div>
            <div className="max-w-xl mx-auto p-4 mt-5 sm:mt-10">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="promoCode"
                            className="text-[#4B5457] font-medium text-base ml-1">
                            Promotion Code
                        </label>

                        <input
                            id="promoCode"
                            type="text"
                            placeholder="Type here..."
                            disabled={isLoading}
                            {...register("promoCode", {
                                required: "Please enter a promotion code",
                                minLength: { value: 3, message: "Code is too short" }
                            })}
                            className={`w-full p-3 rounded-lg border transition-all outline-none text-slate-500 placeholder:text-slate-300
                            ${errors.promoCode
                                    ? "border-red-400 focus:ring-1 focus:ring-red-400"
                                    : "border-gray-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                        {errors.promoCode && (
                            <span className="text-red-500 text-sm ml-1">
                                {errors.promoCode.message}
                            </span>
                        )}
                    </div>

                    {}
                    {result && (
                        <div className={`p-4 rounded-lg flex items-center gap-3 ${
                            result.success 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-red-50 border border-red-200'
                        }`}>
                            {result.success ? (
                                <CheckCircle className="text-green-500" size={24} />
                            ) : (
                                <XCircle className="text-red-500" size={24} />
                            )}
                            <div>
                                <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                                    {result.message}
                                </p>
                                {result.success && result.discount && (
                                    <p className="text-green-600 text-sm mt-1">
                                        Discount: {result.type === 'percentage' ? `${result.discount}%` : `$${result.discount}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {}
                    <div className="flex justify-center">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full sm:w-auto bg-[#00A7EE] hover:bg-sky-600 text-white font-semibold py-3 px-10 rounded-lg transition-all text-lg flex items-center justify-center gap-2 ${
                                isLoading ? 'opacity-70 cursor-not-allowed' : ''
                            }`}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Applying...
                                </>
                            ) : (
                                'Apply Code'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Coupon;