import { useState } from "react";
import axios from "axios";

import "./Login.css";

import sulzerLogo from "../assets/sulzer-logo.jpg";


// ============================================================
// API
// ============================================================

const API_BASE_URL =
  "http://localhost:5000/api";


// ============================================================
// LOGIN COMPONENT
// ============================================================

function Login({
  onLoginSuccess,
}) {

  const [
    email,
    setEmail,
  ] = useState("");


  const [
    password,
    setPassword,
  ] = useState("");


  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


  const [
    rememberMe,
    setRememberMe,
  ] = useState(true);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  // ==========================================================
  // LOGIN
  // ==========================================================

  async function handleSubmit(event) {

    event.preventDefault();

    setError("");


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!email.trim()) {

      setError(
        "Please enter your email address."
      );

      return;

    }


    if (!password) {

      setError(
        "Please enter your password."
      );

      return;

    }


    try {

      setLoading(true);


      // ------------------------------------------------------
      // CALL BACKEND
      // ------------------------------------------------------

      const response =
        await axios.post(
          `${API_BASE_URL}/auth/login`,
          {
            email:
              email.trim(),

            password,
          }
        );


      // ------------------------------------------------------
      // GET RESPONSE
      // ------------------------------------------------------

      const token =
        response.data?.token;


      const loggedInUser =
        response.data?.user;


      if (!token) {

        throw new Error(
          "Authentication token was not returned by the server."
        );

      }


      // ------------------------------------------------------
      // STORE JWT
      // ------------------------------------------------------

      if (rememberMe) {

        localStorage.setItem(
          "dc_token",
          token
        );

      } else {

        sessionStorage.setItem(
          "dc_token",
          token
        );

      }


      // ------------------------------------------------------
      // STORE USER
      // ------------------------------------------------------

      if (loggedInUser) {

        localStorage.setItem(
          "dc_user",
          JSON.stringify(
            loggedInUser
          )
        );

      }


      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      if (
        onLoginSuccess
      ) {

        onLoginSuccess(
          loggedInUser,
          token
        );

      }

    }

    catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );


      setError(
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please check your credentials."
      );

    }

    finally {

      setLoading(false);

    }

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <main className="login-page">


      {/* ====================================================
          BACKGROUND IMAGE
          ==================================================== */}

      <div className="login-background" />


      {/* ====================================================
          DARK OVERLAY
          ==================================================== */}

      <div className="login-background-overlay" />


      {/* ====================================================
          MAIN CONTENT
          ==================================================== */}

      <div className="login-layout">


        {/* ==================================================
            LEFT SIDE
            ================================================== */}

        <section className="login-information">


          {/* COMPANY LOGO */}

          <div className="company-logo-wrapper">

            <img
              src={sulzerLogo}
              alt="Sulzer"
              className="company-logo"
            />

          </div>


          {/* BRAND */}

          <div className="login-brand-content">

            <p className="login-brand-small">
              DOCUMENT CONTROL
            </p>


            <h1>
              Automation System
            </h1>


            <div className="login-brand-line" />


            <p className="login-brand-description">
              Smart document control for
              smarter projects.
            </p>

          </div>


          {/* FEATURES */}

          <div className="login-features">


            <div className="login-feature">

              <span className="feature-icon">
                ✓
              </span>

              <span>
                Secure Access
              </span>

            </div>


            <div className="login-feature">

              <span className="feature-icon">
                ✓
              </span>

              <span>
                Centralized Documents
              </span>

            </div>


            <div className="login-feature">

              <span className="feature-icon">
                ✓
              </span>

              <span>
                Real-time Tracking
              </span>

            </div>


            <div className="login-feature">

              <span className="feature-icon">
                ✓
              </span>

              <span>
                Efficient Approvals
              </span>

            </div>


          </div>


          {/* LEFT FOOTER */}

          <div className="login-information-footer">

            <span>
              Secure
            </span>

            <span className="footer-dot">
              •
            </span>

            <span>
              Reliable
            </span>

            <span className="footer-dot">
              •
            </span>

            <span>
              Efficient
            </span>

          </div>


        </section>


        {/* ==================================================
            LOGIN CARD
            ================================================== */}

        <section className="login-card">


          {/* LOGO */}

          <div className="login-card-logo">

            <img
              src={sulzerLogo}
              alt="Sulzer"
            />

          </div>


          {/* HEADING */}

          <div className="login-heading">

            <h2>
              Welcome Back!
            </h2>

            <p>
              Sign in to continue to your account
            </p>

          </div>


          {/* SECURITY DIVIDER */}

          <div className="login-divider">

            <span />

            <div className="security-icon">
              ✓
            </div>

            <span />

          </div>


          {/* ERROR */}

          {error && (

            <div className="login-error">

              <span className="error-icon">
                !
              </span>

              <span>
                {error}
              </span>

            </div>

          )}


          {/* FORM */}

          <form
            className="login-form"
            onSubmit={
              handleSubmit
            }
          >


            {/* EMAIL */}

            <div className="login-field">

              <label htmlFor="email">
                Email Address
              </label>


              <div className="input-wrapper">

                <span className="input-icon">
                  @
                </span>


                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="Enter your email"
                  autoComplete="email"
                  disabled={loading}
                />

              </div>

            </div>


            {/* PASSWORD */}

            <div className="login-field">

              <label htmlFor="password">
                Password
              </label>


              <div className="input-wrapper">

                <span className="input-icon">
                  🔒
                </span>


                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />


                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      current =>
                        !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={loading}
                >

                  {showPassword
                    ? "◉"
                    : "◌"
                  }

                </button>

              </div>

            </div>


            {/* OPTIONS */}

            <div className="login-options">


              <label className="remember-me">

                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(
                      event.target.checked
                    )
                  }
                  disabled={loading}
                />

                <span>
                  Remember me
                </span>

              </label>


              <button
                type="button"
                className="forgot-password"
                onClick={() => {

                  setError(
                    "Please contact your administrator to reset your password."
                  );

                }}
              >

                Forgot password?

              </button>


            </div>


            {/* SIGN IN */}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >

              {loading ? (

                <>
                  <span className="login-spinner" />

                  Signing In...
                </>

              ) : (

                <>
                  <span className="login-submit-icon">
                    →
                  </span>

                  Sign In
                </>

              )}

            </button>


          </form>


          {/* SECURITY MESSAGE */}

          <div className="secure-login">

            <span className="secure-icon">
              ✓
            </span>


            <div>

              <strong>
                Secure Login
              </strong>

              <span>
                Your connection is protected.
              </span>

            </div>

          </div>


          {/* CARD FOOTER */}

          <div className="login-card-footer">

            <span>
              Document Control
            </span>

            <span>
              •
            </span>

            <span>
              Automation System
            </span>

          </div>


        </section>


      </div>


      {/* ====================================================
          COPYRIGHT
          ==================================================== */}

      <div className="login-copyright">

        © 2026 Document Control Automation System

      </div>


    </main>

  );

}


export default Login;