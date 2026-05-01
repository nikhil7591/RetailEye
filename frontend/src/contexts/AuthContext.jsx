import { createContext, useContext, useState, useEffect } from "react";
import { setAuthToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeStore, setActiveStore] = useState("store_001");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load auth state from local storage on mount
    const savedToken = localStorage.getItem("retaileye:token");
    const savedUser = localStorage.getItem("retaileye:user");
    const savedStore = localStorage.getItem("retaileye:store");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setAuthToken(savedToken);
    }
    
    if (savedStore) {
      setActiveStore(savedStore);
    }
    
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setAuthToken(authToken);
    localStorage.setItem("retaileye:user", JSON.stringify(userData));
    localStorage.setItem("retaileye:token", authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    localStorage.removeItem("retaileye:user");
    localStorage.removeItem("retaileye:token");
  };

  const changeStore = (storeId) => {
    setActiveStore(storeId);
    localStorage.setItem("retaileye:store", storeId);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, token, activeStore, login, logout, changeStore }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
