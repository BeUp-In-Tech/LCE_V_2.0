import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { utilityAPI } from "../../../services/api";
import AddressAutocomplete from "../../shared/AddressAutocomplete";
import type { GoogleAddress } from "../../shared/AddressAutocomplete";

export type AddressInfo = {
    street: string;
    aptno: string;
    zipcode: string;
    cityName: string;
    stateName?: string;
};

type ModalProps = {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handleAddressEdit: (address: AddressInfo) => void;
    initialAddress?: Partial<AddressInfo>;
};

const AddressEditModal: React.FC<ModalProps> = ({ isOpen, setIsOpen, handleAddressEdit, initialAddress }) => {
    const [street, setStreet] = useState('');
    const [aptNo, setAptNo] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [cityName, setCityName] = useState('');
    const [stateName, setStateName] = useState('');

    useEffect(() => {
        if (isOpen && initialAddress) {
            setStreet(initialAddress.street || '');
            setAptNo(initialAddress.aptno || '');
            setZipCode(initialAddress.zipcode || '');
            setCityName(initialAddress.cityName || '');
            setStateName(initialAddress.stateName || '');
        }
    }, [isOpen, initialAddress]);

    // Zip code validation state
    const [zipStatus, setZipStatus] = useState<'idle' | 'checking' | 'serviceable' | 'not_serviceable'>('idle');
    const [zipMessage, setZipMessage] = useState<string>('');
    const [availableDays, setAvailableDays] = useState<string[]>([]);

    // Check zip code service area
    const checkZipCode = async (zip: string) => {
        if (!zip || zip.length < 5) {
            setZipStatus('idle');
            setZipMessage('');
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

    const handleAddressModal = () => {
        // Prevent submit if zip is not serviceable
        if (zipStatus === 'not_serviceable') {
            return;
        }

        const addressInfo = {
            street: street,
            aptno: aptNo,
            zipcode: zipCode,
            cityName: cityName,
            stateName: stateName,
        }
        handleAddressEdit(addressInfo);
        setIsOpen(false);
    }

    
    const isOkDisabled = zipStatus === 'not_serviceable' || zipStatus === 'checking';

    return (
        <div>
            {
                isOpen && (
                    <div className="flex flex-col items-center justify-center bg-gray-100">
                        {isOpen && (
                            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
                                <div
                                    className="absolute inset-0 bg-black/30 transition-opacity"
                                    onClick={() => setIsOpen(false)}
                                />
                                <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl transform transition-all duration-300 ease-out scale-100 opacity-100 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in max-h-[90vh] overflow-y-auto">
                                    <div className="p-6 sm:p-8 space-y-6">
                                        <h2 className="text-[22px] sm:text-[28px] font-semibold text-[#2F393D] mb-6">Address Information</h2>

                                        <div className="space-y-4">
                                            <div>
                                                <label htmlFor="address" className="block text-sm font-medium text-gray-500 mb-1">
                                                    Pickup Address:
                                                </label>

                                                <AddressAutocomplete
                                                    value={street}
                                                    onChange={setStreet}
                                                    onSelect={(addr: GoogleAddress) => {
                                                        setStreet(addr.street);
                                                        setCityName(addr.city);
                                                        setStateName(addr.state);
                                                        setZipCode(addr.zip);
                                                        checkZipCode(addr.zip);
                                                    }}
                                                    placeholder="Street Address"
                                                    className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder-gray-300 bg-white"
                                                />
                                            </div>

                                            {}
                                            <div>
                                                <label htmlFor="apt" className="block text-sm font-medium text-gray-500 mb-1">
                                                    Apt., Suite, Unit:
                                                </label>
                                                <input
                                                    id="apt"
                                                    name="apt"
                                                    value={aptNo}
                                                    onChange={(e) => setAptNo(e.target.value)}
                                                    type="text"
                                                    placeholder="Apt no..."
                                                    className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder-gray-300 bg-white"
                                                />
                                            </div>

                                            {}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label htmlFor="city" className="block text-sm font-medium text-gray-500 mb-1">
                                                        City
                                                    </label>
                                                    <input
                                                        id="city"
                                                        name="city"
                                                        value={cityName}
                                                        onChange={(e) => setCityName(e.target.value)}
                                                        type="text"
                                                        placeholder="City Name"
                                                        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder-gray-300 bg-white"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor="state" className="block text-sm font-medium text-gray-500 mb-1">
                                                        State
                                                    </label>
                                                    <input
                                                        id="state"
                                                        name="state"
                                                        value={stateName}
                                                        onChange={(e) => setStateName(e.target.value)}
                                                        type="text"
                                                        placeholder="State"
                                                        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder-gray-300 bg-white"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor="zipcode" className="block text-sm font-medium text-gray-500 mb-1">
                                                        Zip Code
                                                    </label>
                                                    <input
                                                        id="zipcode"
                                                        name="zipcode"
                                                        value={zipCode}
                                                        onChange={(e) => setZipCode(e.target.value)}
                                                        onBlur={(e) => checkZipCode(e.target.value)}
                                                        type="text"
                                                        placeholder="Zip code"
                                                        className={`w-full mt-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder-gray-300 bg-white ${
                                                            zipStatus === 'serviceable' ? 'border-green-500 ring-1 ring-green-500' :
                                                            zipStatus === 'not_serviceable' ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200 focus:border-transparent'
                                                        }`}
                                                        required
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
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {}
                                    <div className="flex justify-end items-center px-6 pb-6 pt-2 space-x-6">
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="text-[15px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddressModal}
                                            disabled={isOkDisabled}
                                            className={`text-[15px] font-medium transition-colors ${isOkDisabled
                                                ? 'text-gray-300 cursor-not-allowed'
                                                : 'text-white bg-sky-500 hover:bg-sky-600 px-6 py-2 rounded-lg'
                                                }`}
                                        >
                                            {zipStatus === 'checking' ? 'Checking...' : 'OK'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </div>
    );
};

export default AddressEditModal;