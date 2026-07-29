
import { useRef, useCallback, useState, useEffect } from 'react';

declare global {
    interface Window {
        google: any;
    }
}

export interface GoogleAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    display: string;
}

interface Props {
    value: string;
    onChange: (value: string) => void;
    onSelect: (address: GoogleAddress) => void;
    placeholder?: string;
    className?: string;
    hasError?: boolean;
}

export default function AddressAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder = '123 Main St',
    className = '',
    hasError = false,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    // Using the Places API (New) via AutocompleteSessionToken
    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
    
    // State to determine if Google Maps Places has loaded
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // We poll to ensure the window.google.maps.places (and specifically the new AutocompleteSuggestion) is fully mounted.
        const checkLibrary = () => {
            if (window.google?.maps?.places?.AutocompleteSuggestion) {
                setIsLoaded(true);
            } else {
                setTimeout(checkLibrary, 200);
            }
        };
        checkLibrary();
    }, []);

    const fetchSuggestions = useCallback(async (input: string) => {
        if (!input || !isLoaded) {
            setSuggestions([]);
            return;
        }

        try {
            if (!sessionTokenRef.current) {
                // Initialize session token
                sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
            }

            const request = {
                input,
                sessionToken: sessionTokenRef.current,
                includedRegionCodes: ['US'],
            };

            const response = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
            setSuggestions(response.suggestions || []);
            setShowSuggestions(true);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
            setSuggestions([]);
        }
    }, [isLoaded]);

    const handleSelectOption = useCallback(async (suggestion: google.maps.places.AutocompleteSuggestion) => {
        if (!suggestion.placePrediction) return;
        
        try {
            
            const place = suggestion.placePrediction.toPlace();
            
            await place.fetchFields({
                fields: ['addressComponents', 'formattedAddress'],
            });

            
            sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();

            let streetNumber = '';
            let route = '';
            let city = '';
            let state = '';
            let zip = '';

            const components = place.addressComponents || [];
            for (const component of components) {
                const types = component.types;
                if (types.includes('street_number')) {
                    streetNumber = component.longText || '';
                } else if (types.includes('route')) {
                    route = component.longText || '';
                } else if (types.includes('locality')) {
                    city = component.longText || '';
                } else if (types.includes('sublocality_level_1') && !city) {
                    city = component.longText || '';
                } else if (types.includes('administrative_area_level_1')) {
                    state = component.shortText || '';
                } else if (types.includes('postal_code')) {
                    zip = component.longText || '';
                }
            }

            const street = [streetNumber, route].filter(Boolean).join(' ');
            const display = place.formattedAddress || street;

            const fullAddress: GoogleAddress = { street, city, state, zip, display };

            setShowSuggestions(false);
            onSelect(fullAddress);
            onChange(street);
        } catch (error) {
            console.error("Error fetching place details:", error);
        }
    }, [onSelect, onChange]);

    return (
        <div className="relative w-full">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    fetchSuggestions(e.target.value);
                }}
                onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => {
                    // Slight delay to allow clicks to register
                    setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder={placeholder}
                autoComplete="off"
                className={`w-full p-3 border rounded-md mt-1 outline-0 focus:border-[#00A7EE] ${hasError ? 'border-red-500' : 'border-gray-300'
                    } ${className}`}
            />
            
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((s, i) => (
                        <div
                            key={i}
                            className="px-4 py-3 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 font-medium whitespace-break-spaces text-left"
                            onMouseDown={(e) => {
                                
                                e.preventDefault();
                                handleSelectOption(s);
                            }}
                        >
                            <span className="text-black block">{s.placePrediction?.mainText?.text}</span>
                            <span className="text-gray-500 block text-xs mt-0.5">{s.placePrediction?.secondaryText?.text}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
