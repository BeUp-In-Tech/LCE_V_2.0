import { useState } from 'react';
import { Loader2, Gift as GiftIcon, CheckCircle, XCircle, X, Search, CreditCard } from 'lucide-react';
import giftImage from '../../../assets/dashboard/gift-card2.webp';
import { giftCardAPI } from '../../../services/api';
import { useNavigate } from 'react-router-dom';


const Modal = ({ isOpen, onClose, title, children }: { 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    children: React.ReactNode;
}) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-[#2F393D]">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

type TabType = 'redeem' | 'balance';

const Gift = () => {
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('redeem');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    
    
    const [purchaseForm, setPurchaseForm] = useState({
        recipientEmail: '',
        recipientName: '',
        amount: '50',
        message: ''
    });
    
    // Redeem & balance form state
    const [redeemCode, setRedeemCode] = useState('');
    const [balanceCode, setBalanceCode] = useState('');
    const [balanceResult, setBalanceResult] = useState<{ success: boolean; message: string; amount?: number } | null>(null);
    const navigate = useNavigate();

    const handlePurchase = async () => {
        setIsLoading(true);
        setResult(null);
        
        try {
            await giftCardAPI.purchase({
                recipient_email: purchaseForm.recipientEmail,
                recipient_name: purchaseForm.recipientName,
                amount: parseFloat(purchaseForm.amount),
                message: purchaseForm.message
            });
            
            setResult({ success: true, message: 'Gift card sent successfully!' });
            setPurchaseForm({ recipientEmail: '', recipientName: '', amount: '50', message: '' });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setResult({ 
                success: false, 
                message: error.response?.data?.message || 'Failed to purchase gift card.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRedeem = async () => {
        setIsLoading(true);
        setResult(null);
        
        try {
            const response = await giftCardAPI.redeem({ code: redeemCode });
            setResult({ 
                success: true, 
                message: response.data.message || `Gift card redeemed! $${response.data.amount} added to your account.`
            });
            setRedeemCode('');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setResult({ 
                success: false, 
                message: error.response?.data?.message || 'Invalid or expired gift card code.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckBalance = async () => {
        setIsLoading(true);
        setBalanceResult(null);
        
        try {
            const response = await giftCardAPI.checkBalance(balanceCode);
            setBalanceResult({ 
                success: true, 
                message: `Gift card balance: $${response.data.balance?.toFixed(2) || '0.00'}`,
                amount: response.data.balance
            });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setBalanceResult({ 
                success: false, 
                message: error.response?.data?.message || 'Could not find this gift card.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {/* Hero Section */}
            <div className='flex flex-wrap justify-center items-center gap-6 sm:gap-16'>
                <div className="max-w-123.75">
                    <h1 className="text-[32px] sm:text-5xl text-[#2F393D] font-semibold leading-[130%]">
                        The perfect gift that delivers joy.
                    </h1>
                    <p className="text-lg text-[#2F393D] leading-[140%] mt-2 sm:mt-0">
                        Giving a Laundry Care Express card is like gifting pure freedom to your loved ones. 
                        Let them choose exactly what they want, when they want it.
                    </p>
                </div>
                <div className='max-w-112.5'>
                    <img className='w-full' src={giftImage} alt="giftImage" />
                </div>
            </div>
            
            {/* CTA Buttons */}
            <div className='flex flex-wrap items-center justify-center gap-3 mt-10 sm:mt-14'>
                <button 
                    onClick={() => navigate('/gift-cards')}
                    className='text-[#FFFFFF] text-base sm:text-xl font-medium bg-[#00A7EE] py-3 px-4 rounded-lg w-full sm:w-auto hover:bg-sky-600 transition-colors'
                >
                    <span className="flex items-center justify-center gap-2">
                        <GiftIcon size={20} />
                        Gift a Laundry Care Express Card
                    </span>
                </button>
            </div>

            {/* Tabs Section */}
            <div className="mt-10 max-w-xl mx-auto">
                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        onClick={() => { setActiveTab('redeem'); setResult(null); }}
                        className={`flex-1 py-3 text-center text-base font-medium transition-colors border-b-2 ${
                            activeTab === 'redeem'
                                ? 'border-[#00A7EE] text-[#00A7EE]'
                                : 'border-transparent text-[#4B5457] hover:text-[#2F393D]'
                        }`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <CreditCard size={18} />
                            Redeem Gift Card
                        </span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('balance'); setBalanceResult(null); }}
                        className={`flex-1 py-3 text-center text-base font-medium transition-colors border-b-2 ${
                            activeTab === 'balance'
                                ? 'border-[#00A7EE] text-[#00A7EE]'
                                : 'border-transparent text-[#4B5457] hover:text-[#2F393D]'
                        }`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Search size={18} />
                            Check Balance
                        </span>
                    </button>
                </div>

                {/* Redeem Tab */}
                {activeTab === 'redeem' && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-[#2F393D] mb-4">Enter your gift card code</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={redeemCode}
                                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase text-center text-lg tracking-widest"
                                placeholder="XXXX-XXXX-XXXX"
                            />
                            
                            {result && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                                    result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                    {result.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                    {result.message}
                                </div>
                            )}
                            
                            <button
                                onClick={handleRedeem}
                                disabled={isLoading || !redeemCode}
                                className="w-full bg-[#00A7EE] text-white py-3 rounded-lg font-medium hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <><Loader2 className="animate-spin" size={20} /> Redeeming...</> : 'Redeem Gift Card'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Check Balance Tab */}
                {activeTab === 'balance' && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-[#2F393D] mb-4">Check your gift card balance</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={balanceCode}
                                onChange={(e) => setBalanceCode(e.target.value.toUpperCase())}
                                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase text-center text-lg tracking-widest"
                                placeholder="XXXX-XXXX-XXXX"
                            />
                            
                            {balanceResult && (
                                <div className={`p-4 rounded-lg flex items-center gap-3 ${
                                    balanceResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                    {balanceResult.success ? <CheckCircle size={24} /> : <XCircle size={20} />}
                                    <div>
                                        <p className="font-medium">{balanceResult.message}</p>
                                        {balanceResult.success && balanceResult.amount !== undefined && (
                                            <p className="text-3xl font-bold text-green-800 mt-1">
                                                ${balanceResult.amount.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <button
                                onClick={handleCheckBalance}
                                disabled={isLoading || !balanceCode}
                                className="w-full bg-[#00A7EE] text-white py-3 rounded-lg font-medium hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <><Loader2 className="animate-spin" size={20} /> Checking...</> : (
                                    <><Search size={18} /> Check Balance</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {}
            <Modal 
                isOpen={isPurchaseModalOpen} 
                onClose={() => setIsPurchaseModalOpen(false)}
                title="Gift a Laundry Care Express Card"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Recipient's Name</label>
                        <input
                            type="text"
                            value={purchaseForm.recipientName}
                            onChange={(e) => setPurchaseForm({...purchaseForm, recipientName: e.target.value})}
                            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Recipient's Email</label>
                        <input
                            type="email"
                            value={purchaseForm.recipientEmail}
                            onChange={(e) => setPurchaseForm({...purchaseForm, recipientEmail: e.target.value})}
                            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                            placeholder="email@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Amount</label>
                        <select
                            value={purchaseForm.amount}
                            onChange={(e) => setPurchaseForm({...purchaseForm, amount: e.target.value})}
                            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="25">$25</option>
                            <option value="50">$50</option>
                            <option value="75">$75</option>
                            <option value="100">$100</option>
                            <option value="150">$150</option>
                            <option value="200">$200</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Personal Message (Optional)</label>
                        <textarea
                            value={purchaseForm.message}
                            onChange={(e) => setPurchaseForm({...purchaseForm, message: e.target.value})}
                            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                            rows={3}
                            placeholder="Enjoy your laundry service!"
                        />
                    </div>
                    
                    <button
                        onClick={handlePurchase}
                        disabled={isLoading || !purchaseForm.recipientEmail || !purchaseForm.recipientName}
                        className="w-full bg-[#00A7EE] text-white py-3 rounded-lg font-medium hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <><Loader2 className="animate-spin" size={20} /> Processing...</> : (
                            <><GiftIcon size={20} /> Purchase ${purchaseForm.amount} Gift Card</>
                        )}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Gift;