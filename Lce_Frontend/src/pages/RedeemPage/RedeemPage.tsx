import { useState } from 'react';
import logo from '../../assets/LCE logo - v2 transparent 2.png'
import {
    Mail,
    Printer,
    ShieldCheck,
    Zap,
    Clock,
    Facebook,
    Instagram,
    Twitter,
} from 'lucide-react';
import { giftCardAPI } from '../../services/api';
import { RedeemNavber } from './RedeemNavber';
import { GiftCardVisual } from './GiftCardVisual';
import { GlassModal } from '../../components/ui/GlassModal';


type DeliveryMethod = 'email' | 'print';




export default function RedeemPage() {
    const [amount, setAmount] = useState('50');
    const [delivery, setDelivery] = useState<DeliveryMethod>('email');

    
    const [recipientFirstName, setRecipientFirstName] = useState('');
    const [recipientLastName, setRecipientLastName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [customAmountTemp, setCustomAmountTemp] = useState('');

    // Redeem & Balance State
    const [redemptionCode, setRedemptionCode] = useState('');
    const [balanceCode, setBalanceCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Modal State
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info' | 'gift';
    }>({ isOpen: false, title: '', message: '', type: 'info' });

    const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' | 'gift' = 'info') => {
        setModalState({ isOpen: true, title, message, type });
    };

    const closeModal = () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
    };

    const handleCustomClick = () => {
        setIsCustomModalOpen(true);
    };

    const confirmCustomAmount = () => {
        if (customAmountTemp && !isNaN(Number(customAmountTemp))) {
            setAmount(customAmountTemp);
            setIsCustomModalOpen(false);
        } else {
            showModal('Invalid Amount', 'Please enter a valid amount', 'error');
        }
    };

    
    const [printModalData, setPrintModalData] = useState<{ code: string; amount: number; recipientName: string } | null>(null);

    const handlePurchase = async () => {
        if (!recipientFirstName || !recipientLastName || !amount) {
            showModal('Missing Information', 'Please fill in recipient name and select an amount.', 'error');
            return;
        }

        
        if (delivery === 'email' && !recipientEmail) {
            showModal('Email Required', 'Please enter recipient email for email delivery.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const response = await giftCardAPI.purchase({
                recipient_email: delivery === 'email' ? recipientEmail : '',
                recipient_name: `${recipientFirstName} ${recipientLastName}`,
                amount: parseFloat(amount),
                message: "A Laundry Care Express Gift for you!",
                delivery_method: delivery  // 'email' or 'print'
            });

            if (delivery === 'print') {
                
                setPrintModalData({
                    code: response.data.gift_card?.code || 'XXXX-XXXX-XXXX',
                    amount: parseFloat(amount),
                    recipientName: `${recipientFirstName} ${recipientLastName}`
                });
            } else {
                showModal('Gift Card Sent! 🎁', response.data.message || 'Gift card purchased and emailed successfully!', 'gift');
            }

            
            setRecipientFirstName('');
            setRecipientLastName('');
            setRecipientEmail('');
            setAmount('50');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            showModal('Purchase Failed', err.response?.data?.message || 'Failed to purchase gift card. Ensure you are logged in.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };



    const handleRedeem = async () => {
        if (!redemptionCode) return;
        setIsLoading(true);
        try {
            const response = await giftCardAPI.redeem({ code: redemptionCode });
            showModal('Gift Card Redeemed! ✨', response.data.message || `$${response.data.amount_added} added to your account!`, 'success');
            setRedemptionCode('');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            showModal('Redemption Failed', err.response?.data?.message || 'Failed to redeem gift card.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckBalance = async () => {
        if (!balanceCode) return;
        setIsLoading(true);
        try {
            const response = await giftCardAPI.checkBalance(balanceCode);
            showModal('Gift Card Balance 💳', `Balance: $${response.data.balance}\n\nExpires: ${response.data.expires_at}`, 'gift');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            showModal('Balance Check Failed', err.response?.data?.message || 'Failed to check balance.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen worksans bg-white   text-slate-800">
            {}
            <GlassModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                title={modalState.title}
                message={modalState.message}
                type={modalState.type}
            />
            {}
            <div className="bg-[#E6F7FF] text-[#00AEEF] text-center py-2 text-xs font-bold">
                $20 automatically added to accounts of first time users
            </div>

            <RedeemNavber></RedeemNavber>

            <main>
                {}
                <section className="max-w-7xl mx-auto px-4 py-12 md:py-20 grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h1 className="text-4xl md:text-5xl font-semibold text-slate-900 leading-tight">
                            The perfect gift that <br /> delivers joy.
                        </h1>
                        <p className="text-slate-500 text-lg max-w-md leading-6">
                            Giving a Laundry Care Express card is like gifting pure freedom to your loved ones.
                            Let them choose exactly what they want, when they want it.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <button
                                onClick={() => document.getElementById('gift-section')?.scrollIntoView({ behavior: 'smooth' })}
                                className="bg-[#00AEEF] text-white px-8 py-3 rounded-md font-bold hover:bg-[#0096ce] transition-all"
                            >
                                Gift a Laundry Care Express Card
                            </button>
                            <button
                                onClick={() => document.getElementById('redeem-section')?.scrollIntoView({ behavior: 'smooth' })}
                                className="border-2 border-[#00AEEF] text-[#00AEEF] px-8 py-3 rounded-md font-bold hover:bg-blue-50 transition-all"
                            >
                                Redeem a gift card
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-center md:justify-end">
                        <GiftCardVisual type="Hero" amount="50" />
                    </div>
                </section>

                {}
                <section id="gift-section" className="max-w-7xl mx-auto px-4 py-20 grid lg:grid-cols-3 gap-16">
                    <div className="space-y-8 col-span-2">
                        <div className='flex flex-col gap-y-3'>
                            <h2 className="text-xl sm:text-3xl font-semibold mb-4">Gift a Laundry Care Express Card</h2>
                            <div className="grid grid-cols-4 gap-2">
                                {['50', '100', '200', 'Custom'].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => val === 'Custom' ? handleCustomClick() : setAmount(val)}
                                        className={`py-3 border rounded-md sm:text-[20px] font-bold transition-all ${amount === val || (val === 'Custom' && amount !== '50' && amount !== '100' && amount !== '200')
                                            ? 'bg-[#E6F7FF] border-[#00AEEF] text-[#00AEEF]'
                                            : 'border-gray-100 text-[#676E71]'
                                            }`}
                                    >
                                        {val === 'Custom' && amount !== '50' && amount !== '100' && amount !== '200' ? `$${amount}` : (val === 'Custom' ? val : `$${val}`)}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium mt-2 sm:text-[16px]">
                                Laundry Care Express credits can be used for any service, fee delivery, boat and more.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xl sm:text-3xl font-semibold mb-4">Delivery Method</h3>
                            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                <button
                                    onClick={() => setDelivery('email')}
                                    className={`flex items-center flex-col justify-center gap-2 sm:py-6 border rounded-xl transition-all ${delivery === 'email' ? 'bg-[#E6F7FF] border-[#00AEEF] text-[#00AEEF]' : 'border-gray-100 text-gray-400'}`}
                                >
                                    <Mail size={20} /> <span className="font-bold text-sm sm:text-[20px]">Email</span>
                                </button>
                                <button
                                    onClick={() => setDelivery('print')}
                                    className={`flex items-center flex-col justify-center gap-2 py-3 sm:py-6 border rounded-xl transition-all ${delivery === 'print' ? 'bg-[#E6F7FF] border-[#00AEEF] text-[#00AEEF]' : 'border-gray-100 text-gray-400'}`}
                                >
                                    <Printer size={20} />  <span className="font-bold text-sm sm:text-[20px]">Print at home</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl sm:text-3xl font-semibold">Recipient</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <input
                                    placeholder="First Name"
                                    value={recipientFirstName}
                                    onChange={(e) => setRecipientFirstName(e.target.value)}
                                    className="p-4 border border-gray-300 rounded-md bg-gray-50 outline-none focus:bg-white transition-all"
                                />
                                <input
                                    placeholder="Last Name"
                                    value={recipientLastName}
                                    onChange={(e) => setRecipientLastName(e.target.value)}
                                    className="p-4 border border-gray-300 rounded-md bg-gray-50 outline-none focus:bg-white transition-all"
                                />
                            </div>
                            <input
                                placeholder="Email"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                className="w-full p-4 border border-gray-300 rounded-md bg-gray-50 outline-none focus:bg-white transition-all"
                            />
                        </div>

                        <button
                            onClick={handlePurchase}
                            disabled={isLoading}
                            className="w-full bg-[#00AEEF] text-white py-4 rounded-md font-bold text-lg shadow-lg hover:brightness-110 disabled:opacity-70"
                        >
                            {isLoading ? 'Processing Payment...' : 'Proceed to Payment'}
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">
                            * This will charge your saved payment method and add the gift card to the system.
                        </p>
                    </div>

                    <div className="space-y-12 col-span-2 sm:col-span-1">
                        <div className="space-y-4">
                            <h2 className="text-2xl  sm:text-3xl font-bold">Digital Gift card</h2>
                            <GiftCardVisual type="not" amount={amount} recipientName={recipientFirstName || recipientLastName ? `${recipientFirstName} ${recipientLastName}`.trim() : undefined} />
                        </div>

                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="bg-blue-100 p-2 rounded-md h-fit text-[#00AEEF]"><ShieldCheck size={20} /></div>
                                <div>
                                    <h4 className="font-semibold sm:text-[20px]">Secure & Safe</h4>
                                    <p className="text-xs sm:text-[16px] text-gray-500">Every transaction is encrypted. Your funds are protected.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-green-100 p-2 rounded-md h-fit text-green-500"><Zap size={20} /></div>
                                <div>
                                    <h4 className="font-semibold sm:text-[20px]">Instant Credit</h4>
                                    <p className="text-xs sm:text-[16px] text-gray-500">Funds are added instantly and can be used immediately.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-emerald-100 p-2 rounded-md h-fit text-emerald-500"><Clock size={20} /></div>
                                <div>
                                    <h4 className="font-semibold sm:text-[20px]">No Expiration</h4>
                                    <p className="text-xs sm:text-[16px] text-gray-500">Your card credits never expires. Use it when you're ready.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {}
                <section id="redeem-section" className="bg-[#cccccc] py-16">
                    <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12">
                        {}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-semibold">Redeem a Laundry Care Express Gift Card</h2>
                            <input
                                type="text"
                                placeholder="Redemption Code"
                                value={redemptionCode}
                                onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                                className="w-full p-4 rounded-md border-transparent focus:ring-2 bg-white focus:ring-[#00AEEF] focus:border-transparent outline-none shadow-sm uppercase"
                            />
                            <button
                                onClick={handleRedeem}
                                disabled={isLoading || !redemptionCode}
                                className="w-full bg-[#00AEEF] text-white py-4 rounded-md font-bold shadow-md hover:brightness-105 disabled:opacity-70">
                                {isLoading ? 'Processing...' : 'Redeem a gift card'}
                            </button>
                        </div>
                        {}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-semibold">Check Balance</h2>
                            <input
                                type="text"
                                placeholder="Card Number"
                                value={balanceCode}
                                onChange={(e) => setBalanceCode(e.target.value.toUpperCase())}
                                className="w-full bg-white p-4 rounded-md border-transparent focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent outline-none shadow-sm uppercase"
                            />
                            <button
                                onClick={handleCheckBalance}
                                disabled={isLoading || !balanceCode}
                                className="w-full bg-[#00AEEF] text-white py-4 rounded-md font-bold shadow-md hover:brightness-105 disabled:opacity-70">
                                {isLoading ? 'Checking...' : 'Check Balance Only'}
                            </button>
                            <p className="text-[10px] sm:text-[14px] text-gray-500 leading-8 ">
                                *Checking your balance will not redeem the card, merely reveal on the card and potentially an account.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            {}
            <footer className="bg-[#2D1B54] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-12 text-sm">
                    <div className="s">

                        <img src={logo} className='-rotate-11' alt="Laundry Care Express Logo" />

                    </div>

                    <div className="space-y-3">
                        <h5 className="font-bold text-lg mb-2">Services</h5>
                        <a href="#" className="block opacity-70 hover:opacity-100">Wash & Fold Laundry</a>
                        <a href="#" className="block opacity-70 hover:opacity-100">Dry Cleaning</a>
                        <a href="#" className="block opacity-70 hover:opacity-100">Drop Shot Laundry</a>
                        <a href="#" className="block opacity-70 hover:opacity-100">Residential Services</a>
                        <a href="#" className="block opacity-70 hover:opacity-100">Commercial Services</a>
                    </div>

                    <div className="space-y-3">
                        <h5 className="font-bold text-lg mb-2">About Us</h5>
                        <a href="#" className="block opacity-70 hover:opacity-100">Why You'll Love It</a>
                        <a href="#" className="block opacity-70 hover:opacity-100">What People Are Saying</a>
                        <a href="#" className="block opacity-70 hover:opacity-100">FAQ</a>
                        <a href="#" className="block opacity-70 hover:opacity-100">Contact Us</a>
                    </div>

                    <div className="space-y-6">
                        <h5 className="font-bold text-lg">Follow Us</h5>
                        <div className="flex gap-4">
                            <Facebook className="opacity-70 hover:opacity-100 cursor-pointer" size={20} />
                            <Instagram className="opacity-70 hover:opacity-100 cursor-pointer" size={20} />
                            <Twitter className="opacity-70 hover:opacity-100 cursor-pointer" size={20} />
                        </div>
                    </div>
                </div>
            </footer>
            {}
            {isCustomModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl mx-4">
                        <h3 className="text-xl font-bold mb-4 text-center">Enter Custom Amount</h3>
                        <div className="relative mb-6">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                            <input
                                type="number"
                                autoFocus
                                value={customAmountTemp}
                                onChange={(e) => setCustomAmountTemp(e.target.value)}
                                className="w-full pl-8 p-3 border-2 border-gray-200 rounded-lg focus:border-[#00AEEF] outline-none text-xl font-bold text-center"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setIsCustomModalOpen(false)}
                                className="py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmCustomAmount}
                                className="py-2 bg-[#00AEEF] text-white rounded-lg hover:bg-[#0096ce] font-bold"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {}
            {printModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl print:shadow-none print:rounded-none print:p-4">
                        <div className="text-center space-y-6">
                            <img src={logo} alt="Laundry Care Express" className="h-12 mx-auto" />
                            <h2 className="text-2xl font-bold text-slate-800">Gift Card</h2>
                            <p className="text-gray-500">For: {printModalData.recipientName}</p>

                            <div className="bg-gradient-to-r from-[#00AEEF] to-[#0077B5] text-white py-6 px-4 rounded-xl">
                                <p className="text-sm opacity-80">Gift Card Code</p>
                                <p className="text-3xl font-bold tracking-widest mt-2">{printModalData.code}</p>
                            </div>

                            <p className="text-4xl font-bold text-[#00AEEF]">${printModalData.amount.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">Redeem at laundrycareexpress.com</p>

                            <div className="flex gap-4 print:hidden">
                                <button
                                    onClick={() => setPrintModalData(null)}
                                    className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="flex-1 py-3 bg-[#00AEEF] text-white rounded-lg font-bold hover:bg-[#0096ce] flex items-center justify-center gap-2"
                                >
                                    <Printer size={18} /> Print
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}