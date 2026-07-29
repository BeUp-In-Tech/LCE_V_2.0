import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';


const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';


const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});


api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);


export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: RegisterData) =>
    api.post('/auth/register', data),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get('/auth/me'),

  refresh: () =>
    api.post('/auth/refresh'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; password: string; password_confirmation: string }) =>
    api.post('/auth/reset-password', data),

  google: (token: string) =>
    api.post('/auth/google', { access_token: token }),
};


export const userAPI = {
  getProfile: () =>
    api.get('/users/profile'),

  updateProfile: (data: UpdateProfileData) =>
    api.patch('/users/profile', data),

  updateAddress: (data: AddressData) =>
    api.patch('/users/address', data),

  updatePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    api.patch('/users/password', data),
};


export const preferencesAPI = {
  get: () =>
    api.get('/preferences'),

  update: (data: PreferencesData) =>
    api.patch('/preferences', data),
};


export const communicationAPI = {
  get: () =>
    api.get('/communication-settings'),

  update: (data: CommunicationSettings) =>
    api.patch('/communication-settings', data),
};


export const pickupAPI = {
  list: (params?: { status?: string; from_date?: string; to_date?: string; page?: number }) =>
    api.get('/pickups', { params }),

  get: (id: number) =>
    api.get(`/pickups/${id}`),

  create: (data: CreatePickupData) =>
    api.post('/pickups', data),

  update: (id: number, data: UpdatePickupData) =>
    api.patch(`/pickups/${id}`, data),

  cancel: (id: number) =>
    api.delete(`/pickups/${id}`),

  getServices: () =>
    api.get('/services'),

  getRecurringSchedule: () =>
    api.get<RecurringScheduleResponse>('/recurring-schedule'),
};


export const recurringScheduleAPI = {
  update: (data: { schedule_type: string; days?: string[]; start_date?: string }) =>
    api.post('/recurring-schedule', data),
};


export const subscriptionAPI = {
  getPlans: () =>
    api.get('/subscription-plans'),

  list: () =>
    api.get('/subscriptions'),

  get: (id: number) =>
    api.get(`/subscriptions/${id}`),

  create: (data: { plan_id: number; start_date?: string; billing_cycle?: string }) =>
    api.post('/subscriptions', data),

  update: (id: number, data: { plan_id: number; billing_cycle?: string }) =>
    api.patch(`/subscriptions/${id}`, data),

  cancel: (id: number, reason?: string) =>
    api.patch(`/subscriptions/${id}/cancel`, { reason }),

  revertCancel: (id: number) =>
    api.patch(`/subscriptions/${id}/revert-cancel`),

  cancelPendingChange: () =>
    api.delete('/subscriptions/pending'),
};


export const invoiceAPI = {
  list: (params?: { status?: string; from_date?: string; to_date?: string; page?: number; per_page?: number }) =>
    api.get('/invoices', { params }),

  get: (id: number) =>
    api.get(`/invoices/${id}`),

  export: (params?: { from_date?: string; to_date?: string }) =>
    api.get('/invoices/export', { params, responseType: 'blob' }),
};


export const transactionAPI = {
  list: (params?: { page?: number; per_page?: number }) =>
    api.get('/transactions', { params }),
};


export const paymentMethodAPI = {
  list: () =>
    api.get('/payment-methods'),

  create: (data: PaymentMethodData) =>
    api.post('/payment-methods', data),

  delete: (id: number) =>
    api.delete(`/payment-methods/${id}`),

  setDefault: (id: number) =>
    api.patch(`/payment-methods/${id}/default`),
};


export const paymentAPI = {
  charge: (data: { amount: number; invoice_id?: number }) =>
    api.post('/payments/charge', data),
};


export const promoCodeAPI = {
  list: () =>
    api.get('/promo-codes'),

  validate: (code: string) =>
    api.post('/promo-codes/validate', { code }),

  apply: (code: string) =>
    api.post('/promo-codes/apply', { code }),
};


export const creditAPI = {
  list: () =>
    api.get('/credits'),
};


export const giftCardAPI = {
  purchase: (data: GiftCardPurchaseData) =>
    api.post('/gift-cards/purchase', data),

  redeem: (data: { code: string }) =>
    api.post('/gift-cards/redeem', data),

  checkBalance: (code: string) =>
    api.post('/gift-cards/check-balance', { code }),
};


export const vacationHoldAPI = {
  list: () =>
    api.get('/vacation-holds'),

  create: (data: { start_date: string; end_date: string }) =>
    api.post('/vacation-holds', data),

  delete: (id: number) =>
    api.delete(`/vacation-holds/${id}`),
};



export const groupAPI = {
  me: () =>
    api.get('/groups/me'),

  create: (data: CreateGroupData) =>
    api.post('/groups', data),

  join: (code: string) =>
    api.post('/groups/join', { code }),

  getMembers: (id: number) =>
    api.get(`/groups/${id}/members`),

  update: (id: number, data: UpdateGroupData) =>
    api.patch(`/groups/${id}`, data),
};




export const utilityAPI = {
  getPrices: () =>
    api.get('/prices'),

  
  getPriceItems: (type: 'HD' | 'DC' = 'HD') =>
    api.get(`/prices/items?type=${type}`),

  getProcessingSites: () =>
    api.get('/processing-sites'),

  getPickupZones: () =>
    api.get('/pickup-zones'),

  checkZone: (zip: string) =>
    api.post('/pickup-zones/check', { zip }),

  healthCheck: () =>
    api.get('/health'),

  getServerTime: () =>
    api.get('/server-time'),
};


export interface RegisterData {
  email: string;
  password: string;
  password_confirmation: string;
  first_name: string;
  last_name: string;
  phone?: string;
  zip?: string;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  phone_2?: string;
  cell_phone?: string;
  opt_in?: boolean;
}

export interface AddressData {
  street?: string;
  apt?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  nearest_cross_street?: string;
}

export interface PreferencesData {
  detergent?: string;
  softener?: string;
  bleach?: string;
  hanging?: string;
  starch?: string;
  shirts?: string;
  driver_instructions?: string;
  laundry_instructions?: string;
  wash_fold_instructions?: string;
}

export interface CommunicationSettings {
  pickup_confirm_email?: string | boolean;
  pickup_reminder_email?: string | boolean;
  picked_up_email?: string | boolean;
  outfordelivery_email?: string | boolean;
  delivered_email?: string | boolean;
  pickup_confirm_sms?: string | boolean;
  picked_up_sms?: string | boolean;
  outfordelivery_sms?: string | boolean;
  delivered_sms?: string | boolean;
  payment_sms?: string | boolean;
}

export interface CreatePickupData {
  pickup_date: string;
  pickup_type: 'wf' | 'dc' | 'both' | 'hd' | 'wf_hd' | 'hd_dc' | 'all';
  service_type?: 'one_time' | 'weekly' | 'bi_weekly';
  preferred_day?: string;
  driver_instructions?: string;
  payment_amount?: number;
  payment_description?: string;
  subscription_plan_id?: number;
}

export interface RecurringScheduleResponse {
  has_recurring: boolean;
  schedule_type: 'one_time' | 'weekly' | 'bi_weekly';
  days: string[];
  days_formatted: string;
  next_pickup_date: string | null;
  next_delivery_date: string | null;
  start_date?: string;
}

export interface UpdatePickupData {
  pickup_date?: string;
  status?: string;
  driver_instructions?: string;
}

export interface PaymentMethodData {
  dataDescriptor: string;
  dataValue: string;
  last_four: string;
  expiry_month: string;
  expiry_year: string;
  billing_address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}



export interface GiftCardPurchaseData {
  amount: number;
  recipient_email: string;
  recipient_name: string;
  message?: string;
  sender_name?: string; 
  delivery_method?: 'email' | 'print'; 
}

export interface CreateGroupData {
  name: string;
  type: 'Independent' | 'InHouse';
}

export interface UpdateGroupData {
  name?: string;
}

export interface User {
  id: number;
  user_id?: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  phone_2?: string;
  cell_phone?: string;
  opt_in: boolean;
  address: {
    street?: string;
    apt?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    nearest_cross_street?: string;
  };
  payment: {
    has_payment_method: boolean;
    card_last_four?: string;
    card_expiry?: string;
  };
  billing_address: {
    street?: string;
    apt?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  geo: {
    lat?: number;
    lng?: number;
    address?: string;
  };
  price_list_id?: number;
  customer_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Pickup {
  id: number;
  pickup_date: string;
  pickup_type: string;
  status: string; 
  frequency?: string;
  service_type?: 'one_time' | 'weekly' | 'bi_weekly';
  preferred_day?: string;
  driver_instructions?: string;
  pickup_time?: string | null;
  delivery_time?: string | null;
  hold_time?: string | null;
  unhold_time?: string | null;
  cancelled_time?: string | null;
  wf_items?: number | null;
  wf_bags_items?: number | null;
  wf_hanger_items?: number | null;
  wf_weight?: number | null;
  dc_items?: number | null;
  dc_bags_items?: number | null;
  dc_hanger_items?: number | null;
  invoice_id?: number | null;
  on_vacation?: boolean;
  skipped_pickup?: boolean;
  created_at?: string;
}

export interface Invoice {
  id: number;
  number: number;
  status: string;
  subtotal: {
    wf: number;
    dc: number;
    total: number;
  };
  pickup_charge: number;
  total: number;
  promo: {
    code?: string;
    amount: number;
  };
  created_at: string;
  updated_at?: string;
}

export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  bags_per_month: number;
  price_per_bag: number;
  billing_cycle: 'monthly' | 'annual';
  annual_discount: number;
  active: boolean;
}

export interface UserSubscription {
  id: number;
  plan: SubscriptionPlan;
    status: string;
  billing_cycle: string;
  start_date: string;
  end_date: string;
  next_renewal_date: string;
  next_cron_date?: string | null;
  bags: {
    available: number;
    used: number;
    total: number;
    balance?: number;
    period?: number;
  };
  payment?: {
    last_amount: number;
    discount: number;
    balance: number;
    transaction_id?: string | null;
  };
  credit_lbs?: number;
}

export default api;
