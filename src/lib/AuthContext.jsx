import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEMO_MODE } from "@/lib/demoMode";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Demo mode has no backend to authenticate against — it's a fully open
  // local sandbox (see src/lib/mockEvents.js), so treat every visitor as an
  // authenticated "leader" rather than gating the Add/Edit/Delete UI there.
  const [isAuthenticated, setIsAuthenticated] = useState(DEMO_MODE);
  const [isLoadingAuth, setIsLoadingAuth] = useState(!DEMO_MODE);

  const checkSession = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const res = await fetch("/api/auth/session", { credentials: "same-origin" });
      const body = await res.json();
      setIsAuthenticated(!!body.authenticated);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (!DEMO_MODE) checkSession();
  }, [checkSession]);

  const login = useCallback(async (password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Login failed");
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    if (DEMO_MODE) return;
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoadingAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
