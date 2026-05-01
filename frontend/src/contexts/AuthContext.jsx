import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [activeStore, setActiveStore] = useState(() => {
    return localStorage.getItem("retaileye:store") || "store_001";
  });

  const changeStore = (storeId) => {
    setActiveStore(storeId);
    localStorage.setItem("retaileye:store", storeId);
  };

  // Default user — no login required
  const user = { id: "default", email: "user@retaileye.local", name: "User" };

  return (
    <AuthContext.Provider value={{ user, token: null, activeStore, login: () => {}, logout: () => {}, changeStore }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
