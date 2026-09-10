import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

function getStoredToken() {
  return (
    localStorage.getItem("dc_token") ||
    sessionStorage.getItem("dc_token")
  );
}

function getStoredUser() {
  const raw =
    localStorage.getItem("dc_user") ||
    sessionStorage.getItem("dc_user");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("dc_user");
    sessionStorage.removeItem("dc_user");
    return null;
  }
}

function clearStoredSession() {
  localStorage.removeItem("dc_token");
  localStorage.removeItem("dc_user");
  sessionStorage.removeItem("dc_token");
  sessionStorage.removeItem("dc_user");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = getStoredToken();

      if (!token) {
        setLoading(false);
        return;
      }

      const savedUser = getStoredUser();

      if (savedUser) {
        setUser(savedUser);
      }

      try {
        const response = await api.get("/auth/me");
        const currentUser = response.data?.user;

        if (!currentUser) {
          throw new Error("Authenticated user was not returned by the server.");
        }

        setUser(currentUser);

        const storage = localStorage.getItem("dc_token")
          ? localStorage
          : sessionStorage;

        storage.setItem("dc_user", JSON.stringify(currentUser));
      } catch (error) {
        console.error("AUTH CHECK ERROR:", error);
        clearStoredSession();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    function handleAuthExpired() {
      clearStoredSession();
      setUser(null);
    }

    window.addEventListener("dc-auth-expired", handleAuthExpired);

    return () => {
      window.removeEventListener("dc-auth-expired", handleAuthExpired);
    };
  }, []);

  async function login(email, password, rememberMe = true) {
    const response = await api.post("/auth/login", {
      email: email.trim(),
      password,
    });

    const token = response.data?.token;
    const loggedInUser = response.data?.user;

    if (!token) {
      throw new Error(
        "Login succeeded but no authentication token was returned.",
      );
    }

    // Remove an older session from both storage locations first.
    clearStoredSession();

    const storage = rememberMe ? localStorage : sessionStorage;

    storage.setItem("dc_token", token);

    if (loggedInUser) {
      storage.setItem("dc_user", JSON.stringify(loggedInUser));
    }

    setUser(loggedInUser || null);

    return {
      token,
      user: loggedInUser,
    };
  }

  function updateUser(updatedUser) {
    setUser(updatedUser);
    const storage = localStorage.getItem("dc_token") ? localStorage : sessionStorage;
    storage.setItem("dc_user", JSON.stringify(updatedUser));
  }

  function logout() {
    clearStoredSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
