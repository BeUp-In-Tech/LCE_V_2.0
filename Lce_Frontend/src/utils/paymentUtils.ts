

export interface CardInfo {
    name: string;
    format: string;
    cvvLength: number;
    cvvName: string;
}

export const getCardInfo = (number: string): CardInfo => {
    const val = number.replace(/\D/g, '');
    if (/^3[47]/.test(val)) return { name: 'American Express', format: '#### ###### #####', cvvLength: 4, cvvName: 'CID' };
    if (/^4/.test(val)) return { name: 'Visa', format: '#### #### #### ####', cvvLength: 3, cvvName: 'CVV' };
    if (/^5[1-5]/.test(val) || /^22[2-9]/.test(val) || /^2[3-7]/.test(val)) return { name: 'Mastercard', format: '#### #### #### ####', cvvLength: 3, cvvName: 'CVC' };
    if (/^6/.test(val)) return { name: 'Discover', format: '#### #### #### ####', cvvLength: 3, cvvName: 'CID' };
    if (/^3(?:0[0-5]|[68])/.test(val)) return { name: 'Diners Club', format: '#### ###### ####', cvvLength: 3, cvvName: 'CVV' };
    return { name: '', format: '#### #### #### ####', cvvLength: 3, cvvName: 'CVV' };
};

export const getZipValidation = (country: string) => {
    if (country === 'USA') return { required: "Zip code is required", pattern: { value: /^\d{5}$/, message: "Must be 5 digits" } };
    if (country === 'CAN') return { required: "Postal code is required", pattern: { value: /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/, message: "Invalid Canadian postal code" } };
    if (country === 'UK') return { required: "Postal code is required", pattern: { value: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, message: "Invalid UK postal code" } };
    return { required: "Zip/Postal code is required" };
};
