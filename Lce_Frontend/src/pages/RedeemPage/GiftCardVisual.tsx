
import cardImage from '../../assets/Greeting Text (2).png'
import logo from '../../assets/LCE logo - v2 transparent 2.png'


export const GiftCardVisual = ({ amount, type, recipientName }: { amount: string, type: string, recipientName?: string }) => (
    <div className={`relative w-full max-w-sm aspect-[1.6/1] bg-gradient-to-br from-[#5336c5] to-[#6b4ada] rounded-2xl shadow-2xl p-6 text-white flex flex-col justify-between overflow-hidden transform transition-hover  ${type == "Hero" ? 'rotate-20' : ''}  hover:scale-105`}>
        <div className="flex justify-between items-start">
            <img className={` ${type == 'Hero' ? '-rotate-6' : '-rotate-12'} `} src={logo} alt="Laundry Care Express Gift Card Logo" />

            <img className={` ${type == 'Hero' ? '-rotate-6' : '-rotate-10'} `} src={cardImage} alt="Gift Card Visual" />
        </div>
        <div className='flex justify-between'>
            <div className="flex flex-col gap-y-4">
                <p className="text-sm sm:text-lg font-medium  opacity-90">Happy holidays!</p>
                <p className="text-lg font-bold">{recipientName || 'Recipient Name'}</p>
            </div>
            <div className="self-end text-4xl font-bold">${amount}</div>
        </div>
        {}
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
    </div>
);