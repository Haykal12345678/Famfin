import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'famfin-backend-staging.vercel.app',
});

import { startLoading, stopLoading } from '../utils/loading';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('famfin_token');
  const tenantId = localStorage.getItem('famfin_tenant_id');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId;

  if (config.method?.toLowerCase() === 'get') {
    startLoading();
  }

  return config;
});

api.interceptors.response.use(
  (res) => {
    if (res.config?.method?.toLowerCase() === 'get') {
      stopLoading();
    }
    return res;
  },
  (err) => {
    if (err.config?.method?.toLowerCase() === 'get') {
      stopLoading();
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('famfin_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
