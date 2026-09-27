import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const adminApi = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Attach Admin JWT Token if available
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AdminUser {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_admin: number;
}

export interface AdminLoginResponse {
  status: string;
  token: string;
  user: AdminUser;
}

export interface TableItem {
  name: string;
  count: number;
}

export interface ColumnMeta {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: any;
  is_primary: boolean;
  foreign_key?: {
    table: string;
    column: string;
    label_column: string;
  };
}

export interface TableDataResponse {
  table: string;
  primary_key: string;
  columns: ColumnMeta[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
  data: any[];
}

export interface SystemStats {
  total_users: number;
  total_pickups: number;
  pending_pickups: number;
  active_subscriptions: number;
  total_revenue: number;
}

export const adminService = {
  login: async (email: string, password: string): Promise<AdminLoginResponse> => {
    const res = await adminApi.post('/login', { email, password });
    if (res.data.token) {
      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  },

  getStats: async (): Promise<SystemStats> => {
    const res = await adminApi.get('/stats');
    return res.data;
  },

  getTables: async (): Promise<TableItem[]> => {
    const res = await adminApi.get('/tables');
    return res.data.tables || [];
  },

  getPriceLists: async (): Promise<{ value: string; label: string; rate?: number; sku?: string }[]> => {
    try {
      const res = await adminApi.get('/price-lists');
      if (Array.isArray(res.data)) {
        return res.data;
      }
      if (res.data && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  getTableData: async (tableName: string, page = 1, perPage = 25, search = ''): Promise<TableDataResponse> => {
    const res = await adminApi.get(`/tables/${tableName}`, {
      params: { page, per_page: perPage, search },
    });
    return res.data;
  },

  getUserDetails: async (userId: any) => {
    const res = await adminApi.get(`/users/${userId}/details`);
    return res.data;
  },

  createRecord: async (tableName: string, data: Record<string, any>) => {
    const res = await adminApi.post(`/tables/${tableName}`, data);
    return res.data;
  },

  updateRecord: async (tableName: string, id: any, data: Record<string, any>) => {
    const res = await adminApi.put(`/tables/${tableName}/${id}`, data);
    return res.data;
  },

  deleteRecord: async (tableName: string, id: any, force = false) => {
    const res = await adminApi.delete(`/tables/${tableName}/${id}`, {
      params: { force: force ? 1 : 0 },
    });
    return res.data;
  },

  updatePickupStatus: async (pickupId: any, status: string) => {
    const res = await adminApi.post(`/pickups/${pickupId}/status`, { status });
    return res.data;
  },

  executeSql: async (sql: string) => {
    const res = await adminApi.post('/sql/execute', { sql });
    return res.data;
  },
};

export interface SqlExecutionResponse {
  status: 'success' | 'error';
  type?: 'select' | 'execute';
  columns?: string[];
  rows?: any[];
  count?: number;
  affected_rows?: number;
  message?: string;
  duration_ms?: number;
  error?: string;
}

