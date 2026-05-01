import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);
const AUTH_CLEARED_EVENT = "krishi_auth_cleared";
const AUTH_UPDATED_EVENT = "krishi_auth_updated";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("krishi_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("krishi_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    const clearAuthState = () => {
      setToken(null);
      setUser(null);
      setLoading(false);
    };

    const updateAuthState = (event) => {
      if (event.detail?.token) {
        setToken(event.detail.token);
      }
      if (event.detail?.user) {
        setUser(event.detail.user);
      }
    };

    window.addEventListener(AUTH_CLEARED_EVENT, clearAuthState);
    window.addEventListener(AUTH_UPDATED_EVENT, updateAuthState);

    return () => {
      window.removeEventListener(AUTH_CLEARED_EVENT, clearAuthState);
      window.removeEventListener(AUTH_UPDATED_EVENT, updateAuthState);
    };
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
        localStorage.setItem("krishi_user", JSON.stringify(data.user));
      } catch (error) {
        setToken(null);
        setUser(null);
        localStorage.removeItem("krishi_token");
        localStorage.removeItem("krishi_refresh_token");
        localStorage.removeItem("krishi_user");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("krishi_token", data.token);
    if (data.refreshToken) {
      localStorage.setItem("krishi_refresh_token", data.refreshToken);
    }
    localStorage.setItem("krishi_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("krishi_refresh_token");
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken });
      } catch (error) {
        // Local logout should continue even if the server session is already gone.
      }
    }

    localStorage.removeItem("krishi_token");
    localStorage.removeItem("krishi_refresh_token");
    localStorage.removeItem("krishi_user");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, loading, login, logout, isOwner: user?.role === "owner" }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
