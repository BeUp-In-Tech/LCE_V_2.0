import { Power } from "lucide-react";

type LogoutModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const LogoutModal = ({ isOpen, onClose, onConfirm }: LogoutModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                        <Power className="w-10 h-10 text-[#FF4949]" />
                    </div>
                </div>
                
                <h2 className="text-3xl font-bold text-[#2F393D] mb-4">Log Out?</h2>
                
                <p className="text-[#4B5457] text-lg mb-8 leading-relaxed">
                    Are you sure you want to log out of your account?
                </p>

                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={onConfirm}
                        className="flex-1 bg-[#FF4949] hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Log Out
                    </button>
                    <button 
                        onClick={onClose}
                        className="flex-1 bg-[#EBECEC] hover:bg-gray-300 text-[#4B5457] font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                </div>
                
                <p className="mt-6 text-sm text-[#858B8E]">
                    You can log back in any time
                </p>
            </div>
        </div>
    );
}

export default LogoutModal;
