import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('famfin_user') || 'null'));
  const [tenants, setTenants] = useState(() => JSON.parse(localStorage.getItem('famfin_tenants') || '[]'));
  const [activeTenantId, setActiveTenantId] = useState(() => localStorage.getItem('famfin_tenant_id'));

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('famfin_token', data.token);
    localStorage.setItem('famfin_user', JSON.stringify(data.user));
    localStorage.setItem('famfin_tenants', JSON.stringify(data.tenants));
    const firstTenant = data.tenants[0];
    if (firstTenant) localStorage.setItem('famfin_tenant_id', firstTenant.id);
    setUser(data.user);
    setTenants(data.tenants);
    setActiveTenantId(firstTenant?.id);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('famfin_token', data.token);
    localStorage.setItem('famfin_user', JSON.stringify(data.user));
    localStorage.setItem('famfin_tenants', JSON.stringify([{ ...data.tenant, role: 'OWNER' }]));
    localStorage.setItem('famfin_tenant_id', data.tenant.id);
    setUser(data.user);
    setTenants([{ ...data.tenant, role: 'OWNER' }]);
    setActiveTenantId(data.tenant.id);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
    setTenants([]);
    setActiveTenantId(null);
  }, []);

  const switchTenant = useCallback((tenantId) => {
    localStorage.setItem('famfin_tenant_id', tenantId);
    setActiveTenantId(tenantId);
  }, []);

  return (
    <AuthContext.Provider value={{ user, tenants, activeTenantId, login, register, logout, switchTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
