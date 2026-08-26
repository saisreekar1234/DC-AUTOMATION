import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";


// ======================================================
// AUTH CONTEXT
// ======================================================

const AuthContext =
  createContext(null);


// ======================================================
// AUTH PROVIDER
// ======================================================

export function AuthProvider({
  children,
}) {

  const [
    user,
    setUser,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  // ====================================================
  // LOAD SAVED USER
  // ====================================================

  useEffect(() => {

    async function loadUser() {

      const token =
        localStorage.getItem(
          "dc_token"
        );


      const savedUser =
        localStorage.getItem(
          "dc_user"
        );


      if (
        !token
      ) {

        setLoading(false);

        return;

      }


      // ------------------------------------------------
      // TEMPORARILY RESTORE USER
      // ------------------------------------------------

      if (savedUser) {

        try {

          setUser(
            JSON.parse(
              savedUser
            )
          );

        }

        catch {

          localStorage.removeItem(
            "dc_user"
          );

        }

      }


      // ------------------------------------------------
      // VERIFY TOKEN WITH BACKEND
      // ------------------------------------------------

      try {

        const response =
          await api.get(
            "/auth/me"
          );


        const currentUser =
          response.data?.user;


        if (
          currentUser
        ) {

          setUser(
            currentUser
          );


          localStorage.setItem(
            "dc_user",
            JSON.stringify(
              currentUser
            )
          );

        }

      }

      catch (error) {

        console.error(
          "AUTH CHECK ERROR:",
          error
        );


        localStorage.removeItem(
          "dc_token"
        );

        localStorage.removeItem(
          "dc_user"
        );


        setUser(null);

      }

      finally {

        setLoading(false);

      }

    }


    loadUser();

  }, []);


  // ====================================================
  // LOGIN
  // ====================================================

  async function login(
    email,
    password
  ) {

    const response =
      await api.post(
        "/auth/login",
        {
          email,
          password,
        }
      );


    const token =
      response.data?.token;


    const loggedInUser =
      response.data?.user;


    if (
      !token
    ) {

      throw new Error(
        "Login succeeded but no authentication token was returned."
      );

    }


    // ------------------------------------------------
    // STORE TOKEN
    // ------------------------------------------------

    localStorage.setItem(
      "dc_token",
      token
    );


    // ------------------------------------------------
    // STORE USER
    // ------------------------------------------------

    if (
      loggedInUser
    ) {

      localStorage.setItem(
        "dc_user",
        JSON.stringify(
          loggedInUser
        )
      );

    }


    setUser(
      loggedInUser
    );


    return {
      token,
      user:
        loggedInUser,
    };

  }


  // ====================================================
  // LOGOUT
  // ====================================================

  function logout() {

    localStorage.removeItem(
      "dc_token"
    );

    localStorage.removeItem(
      "dc_user"
    );


    setUser(null);

  }


  // ====================================================
  // PROVIDER
  // ====================================================

  return (

    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated:
          Boolean(user),
        isAdmin:
          user?.role ===
          "admin",
      }}
    >

      {children}

    </AuthContext.Provider>

  );

}


// ======================================================
// USE AUTH
// ======================================================

export function useAuth() {

  return useContext(
    AuthContext
  );

}
