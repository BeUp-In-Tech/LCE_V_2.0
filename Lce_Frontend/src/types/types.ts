export interface PriceItem {
    name: string;
    price: number;
    note?: string;
}

export interface Category {
    title: string;
    subtitle?: string;
    items: PriceItem[];
}

export const priceListData: Category[] = [
    {
        title: "Tops",
        items: [
            { name: "Blouse", price: 11.99 },
            { name: "Polo Shirt", price: 11.99 },
            { name: "Dress Shirt", price: 11.99, note: "(dry clean)" },
            { name: "Suit Jacket", price: 13.99, note: "(blazer)" },
            { name: "Sweater", price: 11.99 },
            { name: "Vest", price: 11.99 },
            { name: "Jacket", price: 16.99, note: "(outer wear)" },
            { name: "Scarf", price: 6.99 },
            { name: "Neck Tie", price: 6.99 },
            { name: "Blouse", price: 11.99 },
            { name: "Blouse", price: 11.99 },
            { name: "Polo Shirt", price: 11.99 },
            { name: "Dress Shirt", price: 11.99, note: "(dry clean)" },
            { name: "Suit Jacket", price: 13.99, note: "(blazer)" },
            { name: "Sweater", price: 11.99 },
            { name: "Vest", price: 11.99 },
            { name: "Jacket", price: 16.99, note: "(outer wear)" },
            { name: "Scarf", price: 6.99 },
            { name: "Neck Tie", price: 6.99 },
            { name: "Blouse", price: 11.99 },
            { name: "Blouse", price: 11.99 },
            { name: "Polo Shirt", price: 11.99 },
            { name: "Dress Shirt", price: 11.99, note: "(dry clean)" },
            { name: "Suit Jacket", price: 13.99, note: "(blazer)" },
            { name: "Sweater", price: 11.99 },
            { name: "Vest", price: 11.99 },
            { name: "Jacket", price: 16.99, note: "(outer wear)" },
            { name: "Scarf", price: 6.99 },
            { name: "Neck Tie", price: 6.99 },
            { name: "Blouse", price: 11.99 },
            { name: "Blouse", price: 11.99 },
            { name: "Polo Shirt", price: 11.99 },
            { name: "Dress Shirt", price: 11.99, note: "(dry clean)" },
            { name: "Suit Jacket", price: 13.99, note: "(blazer)" },
            { name: "Sweater", price: 11.99 },
            { name: "Vest", price: 11.99 },
            { name: "Jacket", price: 16.99, note: "(outer wear)" },
            { name: "Scarf", price: 6.99 },
            { name: "Neck Tie", price: 6.99 },
            { name: "Blouse", price: 11.99 }
        ],
    },
    {
        title: "Comforter",
        subtitle: "(regular/ down)",
        items: [
            { name: "Twin", price: 35.99 },
            { name: "Double", price: 37.99 },
            { name: "Queen", price: 39.99 },
            { name: "King", price: 41.99 },
        ],
    },
];