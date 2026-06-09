import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('accountpro_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const result = await window.electronAPI.login({ username, password });
    if (result.success) {
      setUser(result.user);
      sessionStorage.setItem('accountpro_user', JSON.stringify(result.user));
    }
    return result;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('accountpro_user');
  };

  const isAdmin = user?.role === 'admin';
  const isViewer = user?.role === 'viewer';
  const canEdit = user?.role === 'admin' || user?.role === 'accountant';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isViewer, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
