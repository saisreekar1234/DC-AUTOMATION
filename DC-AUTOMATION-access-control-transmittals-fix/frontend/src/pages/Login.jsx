import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import "./Login.css";

const languages = {
  en: {
    language: "English",
    welcome: "Welcome back",
    subtitle: "Sign in to access your Document Control workspace.",
    email: "Email address",
    password: "Password",
    emailPlaceholder: "Enter your email",
    passwordPlaceholder: "Enter your password",
    remember: "Remember me",
    forgot: "Forgot password?",
    signIn: "Sign in",
    signingIn: "Signing in...",
    secure: "Secure enterprise access",
    secureText:
      "Your project information and controlled documents are protected.",
    error: "Unable to sign in. Please check your credentials.",
    tagline: "Control information. Control projects.",
  },

  te: {
    language: "తెలుగు",
    welcome: "స్వాగతం",
    subtitle: "మీ డాక్యుమెంట్ కంట్రోల్ వర్క్‌స్పేస్‌లోకి సైన్ ఇన్ చేయండి.",
    email: "ఇమెయిల్ చిరునామా",
    password: "పాస్‌వర్డ్",
    emailPlaceholder: "మీ ఇమెయిల్ నమోదు చేయండి",
    passwordPlaceholder: "మీ పాస్‌వర్డ్ నమోదు చేయండి",
    remember: "నన్ను గుర్తుంచుకోండి",
    forgot: "పాస్‌వర్డ్ మర్చిపోయారా?",
    signIn: "సైన్ ఇన్",
    signingIn: "సైన్ ఇన్ అవుతోంది...",
    secure: "సురక్షిత ఎంటర్‌ప్రైజ్ యాక్సెస్",
    secureText:
      "మీ ప్రాజెక్ట్ సమాచారం మరియు నియంత్రిత డాక్యుమెంట్లు రక్షించబడతాయి.",
    error: "సైన్ ఇన్ చేయలేకపోయాము. మీ వివరాలను తనిఖీ చేయండి.",
    tagline: "సమాచారాన్ని నియంత్రించండి. ప్రాజెక్టులను నియంత్రించండి.",
  },

  hi: {
    language: "हिन्दी",
    welcome: "वापसी पर स्वागत है",
    subtitle: "अपने डॉक्यूमेंट कंट्रोल वर्कस्पेस में साइन इन करें।",
    email: "ईमेल पता",
    password: "पासवर्ड",
    emailPlaceholder: "अपना ईमेल दर्ज करें",
    passwordPlaceholder: "अपना पासवर्ड दर्ज करें",
    remember: "मुझे याद रखें",
    forgot: "पासवर्ड भूल गए?",
    signIn: "साइन इन",
    signingIn: "साइन इन हो रहा है...",
    secure: "सुरक्षित एंटरप्राइज़ एक्सेस",
    secureText:
      "आपकी प्रोजेक्ट जानकारी और नियंत्रित डॉक्यूमेंट सुरक्षित हैं।",
    error: "साइन इन नहीं हो सका। कृपया अपनी जानकारी जाँचें।",
    tagline: "जानकारी नियंत्रित करें। प्रोजेक्ट नियंत्रित करें।",
  },

  ar: {
    language: "العربية",
    welcome: "مرحباً بعودتك",
    subtitle: "سجّل الدخول للوصول إلى مساحة إدارة المستندات.",
    email: "عنوان البريد الإلكتروني",
    password: "كلمة المرور",
    emailPlaceholder: "أدخل بريدك الإلكتروني",
    passwordPlaceholder: "أدخل كلمة المرور",
    remember: "تذكرني",
    forgot: "هل نسيت كلمة المرور؟",
    signIn: "تسجيل الدخول",
    signingIn: "جارٍ تسجيل الدخول...",
    secure: "وصول مؤسسي آمن",
    secureText:
      "معلومات المشروع والمستندات الخاضعة للرقابة محمية.",
    error: "تعذر تسجيل الدخول. يرجى التحقق من بياناتك.",
    tagline: "تحكم في المعلومات. تحكم في المشاريع.",
  },
};

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [language, setLanguage] = useState(
    localStorage.getItem("dc_language") || "en",
  );

  const t = languages[language] || languages.en;

  function changeLanguage(value) {
    setLanguage(value);
    localStorage.setItem("dc_language", value);

    document.documentElement.dir =
      value === "ar" ? "rtl" : "ltr";

    document.documentElement.lang = value;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError(t.error);
      return;
    }

    try {
      setLoading(true);
      setError("");

      await login(
        email.trim(),
        password,
        remember,
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t.error,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dc-login-shell">
      <section className="dc-login-visual">
        <div className="dc-grid" /><div className="dc-glow dc-glow-a" /><div className="dc-glow dc-glow-b" />

        <div className="login-blueprint blueprint-one">
          <div />
          <div />
          <div />
          <div />
        </div>

        <div className="dc-orbit orbit-one"><span /></div>

        <div className="login-blueprint blueprint-two">
          <div />
          <div />
          <div />
        </div>

        <div className="dc-visual-content">
          <div className="login-brand">
            <div className="login-brand-logo">
              DC
            </div>

            <div>
              <strong>DOCUMENT CONTROL</strong>
              <span>AUTOMATION PLATFORM</span>
            </div>
          </div>

          <div className="login-hero-copy">
            <div className="login-kicker">
              ENGINEERING · PROJECTS · CONTROL
            </div>

            <h1>
              Control information.
              <br />
              <span>Control projects.</span>
            </h1>

            <p>
              A central workspace for documents,
              revisions, transmittals, approvals
              and controlled project information.
            </p>
          </div>

          <div className="login-features">
            <div>
              <span>01</span>
              <strong>Document Register</strong>
              <small>
                Centralised document control
              </small>
            </div>

            <div>
              <span>02</span>
              <strong>Revision Control</strong>
              <small>
                Complete revision history
              </small>
            </div>

            <div>
              <span>03</span>
              <strong>Workflow Automation</strong>
              <small>
                Reviews, approvals and signatures
              </small>
            </div>

            <div>
              <span>04</span>
              <strong>Transmittal Intelligence</strong>
              <small>
                Automated customer response processing
              </small>
            </div>
          </div>

          <div className="login-visual-footer">
            <span>DOCUMENT CONTROL AUTOMATION</span>
            <span>SECURE · CONTROLLED · TRACEABLE</span>
          </div>
        </div>
      </section>

      <section className="dc-login-form-side">
        <div className="login-top-controls">
          <div className="login-language">
            <span>🌐</span>

            <select
              value={language}
              onChange={(event) =>
                changeLanguage(event.target.value)
              }
              aria-label="Language"
            >
              <option value="en">English</option>
              <option value="te">తెలుగు</option>
              <option value="hi">हिन्दी</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </div>

        <div className="dc-login-card">
          <div className="login-card-logo">
            <span>DC</span>
          </div>

          <div className="login-heading">
            <div className="login-small-label">
              DOCUMENT CONTROL
            </div>

            <h2>{t.welcome}</h2>

            <p>{t.subtitle}</p>
          </div>

          {error && (
            <div className="login-error">
              <span>!</span>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">
                {t.email}
              </label>

              <div className="login-input-wrapper">
                <span className="input-icon">
                  @
                </span>

                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder={t.emailPlaceholder}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">
                {t.password}
              </label>

              <div className="login-input-wrapper">
                <span className="input-icon">
                  •
                </span>

                <input
                  id="login-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder={
                    t.passwordPlaceholder
                  }
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value,
                    )
                  }
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) =>
                    setRemember(
                      event.target.checked,
                    )
                  }
                />

                <span>{t.remember}</span>
              </label>

              <button
                type="button"
                className="forgot-button"
              >
                {t.forgot}
              </button>
            </div>

            <button
              className="login-submit"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading ? t.signingIn : t.signIn}
              </span>

              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="login-security">
            <div className="security-icon">
              ✓
            </div>

            <div>
              <strong>{t.secure}</strong>
              <span>{t.secureText}</span>
            </div>
          </div>
        </div>

        <div className="dc-login-bottom">
          <span>
            © {new Date().getFullYear()} Document
            Control Automation
          </span>

          <span>{t.tagline}</span>
        </div>
      </section>
    </main>
  );
}