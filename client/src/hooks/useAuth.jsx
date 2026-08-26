import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    // WHY: the token is httpOnly, so JS cannot read it to know if we're logged
    // in. Ask the server once on mount instead.
    let alive = true;

    // Free-tier API sleeps after 15 min idle. Surface that rather than
    // letting the user stare at a spinner for a minute.
    const slowTimer = setTimeout(() => alive && setSlow(true), 3000);

    authApi
      .me()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null))
      .finally(() => {
        if (!alive) return;
        clearTimeout(slowTimer);
        setSlow(false);
        setLoading(false);
      });

    return () => {
      alive = false;
      clearTimeout(slowTimer);
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (creds) => setUser(await authApi.login(creds)), []);
  const register = useCallback(async (data) => setUser(await authApi.register(data)), []);
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);
  const patchUser = useCallback((partial) => setUser((u) => ({ ...u, ...partial })), []);

  return (
    <AuthContext.Provider value={{ user, loading, slow, login, register, logout, patchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
