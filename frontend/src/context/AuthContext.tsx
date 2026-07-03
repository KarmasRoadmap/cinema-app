import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { UserProfile } from "../types";

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getStoredToken(): string | null {
  try {
    return localStorage.getItem("access_token");
  } catch {
    return null;
  }
}

function setStoredToken(token: string): void {
  try {
    localStorage.setItem("access_token", token);
  } catch {
    // localStorage not available
  }
}

function removeStoredToken(): void {
  try {
    localStorage.removeItem("access_token");
  } catch {
    // localStorage not available
  }
}

const BASE_URL =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:8000/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [user, setUser] = useState<UserProfile | null>(null);

  const getMe = useCallback(async (authToken: string): Promise<UserProfile | null> => {
    try {
      const res = await fetch(`${BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as UserProfile;
      return data;
    } catch {
      return null;
    }
  }, []);

  // Load user profile when token is available
  useEffect(() => {
    if (token) {
      getMe(token)
        .then((profile) => {
          if (profile) {
            setUser(profile);
          } else {
            // Token invalid
            setToken(null);
            removeStoredToken();
          }
        })
        .catch(() => {
          setToken(null);
          removeStoredToken();
        });
    } else {
      setUser(null);
    }
  }, [token, getMe]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(errorBody || "Error al iniciar sesión");
    }

    const data = (await res.json()) as { access: string; refresh: string };
    setStoredToken(data.access);
    setToken(data.access);

    // Fetch user profile
    const profile = await getMe(data.access);
    setUser(profile);
  }, [getMe]);

  const register = useCallback(async (email: string, password: string, name: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(errorBody || "Error al registrarse");
    }

    const data = (await res.json()) as { access: string; refresh: string };
    setStoredToken(data.access);
    setToken(data.access);

    const profile = await getMe(data.access);
    setUser(profile);
  }, [getMe]);

  const logout = useCallback((): void => {
    setToken(null);
    setUser(null);
    removeStoredToken();
  }, []);

  const isAuthenticated = !!token && !!user;
  const isAdmin = !!(user && (user.role === "admin" || user.is_active));

  return (
    <AuthContext.Provider
      value={{ token, user, login, register, logout, isAuthenticated, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return ctx;
}
