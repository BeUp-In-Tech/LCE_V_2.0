interface SelectionCardProps {
    label: string;
    isSelected: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    description?: string;
}

export const SelectionCard = ({ label, isSelected, onClick, icon, description }: SelectionCardProps) => (
    <div
        onClick={onClick}
        className={`flex-1 p-4 border-2 rounded-xl cursor-pointer transition-all ${isSelected ? 'border-sky-400 bg-sky-50' : 'border-gray-100 bg-white'
            }`}
    >
        <div className="flex justify-between items-start mb-4">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-sky-500' : 'border-gray-300'
                }`}>
                {isSelected && <div className="w-2.5 h-2.5 bg-sky-500 rounded-full" />}
            </div>
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                {icon}
            </div>
        </div>
        <span className="text-lg font-medium text-[#2F393D] block">{label}</span>
        {description && <p className="text-base text-gray-500 mt-2 leading-tight">{description}</p>}
    </div>
);