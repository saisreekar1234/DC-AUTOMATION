import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const LANGUAGES = [
  {
    code: "en",
    label: "English",
    native: "English",
    dir: "ltr",
    flag: "🇬🇧",
  },
  {
    code: "ar",
    label: "Arabic",
    native: "العربية",
    dir: "rtl",
    flag: "🇸🇦",
  },
  {
    code: "zh-CN",
    label: "Chinese (Simplified)",
    native: "简体中文",
    dir: "ltr",
    flag: "🇨🇳",
  },
  {
    code: "zh-TW",
    label: "Chinese (Traditional)",
    native: "繁體中文",
    dir: "ltr",
    flag: "🇹🇼",
  },
  {
    code: "cs",
    label: "Czech",
    native: "Čeština",
    dir: "ltr",
    flag: "🇨🇿",
  },
  {
    code: "da",
    label: "Danish",
    native: "Dansk",
    dir: "ltr",
    flag: "🇩🇰",
  },
  {
    code: "nl",
    label: "Dutch",
    native: "Nederlands",
    dir: "ltr",
    flag: "🇳🇱",
  },
  {
    code: "fi",
    label: "Finnish",
    native: "Suomi",
    dir: "ltr",
    flag: "🇫🇮",
  },
  {
    code: "fr",
    label: "French",
    native: "Français",
    dir: "ltr",
    flag: "🇫🇷",
  },
  {
    code: "de",
    label: "German",
    native: "Deutsch",
    dir: "ltr",
    flag: "🇩🇪",
  },
  {
    code: "el",
    label: "Greek",
    native: "Ελληνικά",
    dir: "ltr",
    flag: "🇬🇷",
  },
  {
    code: "he",
    label: "Hebrew",
    native: "עברית",
    dir: "rtl",
    flag: "🇮🇱",
  },
  {
    code: "hi",
    label: "Hindi",
    native: "हिन्दी",
    dir: "ltr",
    flag: "🇮🇳",
  },
  {
    code: "hu",
    label: "Hungarian",
    native: "Magyar",
    dir: "ltr",
    flag: "🇭🇺",
  },
  {
    code: "id",
    label: "Indonesian",
    native: "Bahasa Indonesia",
    dir: "ltr",
    flag: "🇮🇩",
  },
  {
    code: "it",
    label: "Italian",
    native: "Italiano",
    dir: "ltr",
    flag: "🇮🇹",
  },
  {
    code: "ja",
    label: "Japanese",
    native: "日本語",
    dir: "ltr",
    flag: "🇯🇵",
  },
  {
    code: "ko",
    label: "Korean",
    native: "한국어",
    dir: "ltr",
    flag: "🇰🇷",
  },
  {
    code: "ms",
    label: "Malay",
    native: "Bahasa Melayu",
    dir: "ltr",
    flag: "🇲🇾",
  },
  {
    code: "no",
    label: "Norwegian",
    native: "Norsk",
    dir: "ltr",
    flag: "🇳🇴",
  },
  {
    code: "pl",
    label: "Polish",
    native: "Polski",
    dir: "ltr",
    flag: "🇵🇱",
  },
  {
    code: "pt",
    label: "Portuguese",
    native: "Português",
    dir: "ltr",
    flag: "🇵🇹",
  },
  {
    code: "ro",
    label: "Romanian",
    native: "Română",
    dir: "ltr",
    flag: "🇷🇴",
  },
  {
    code: "ru",
    label: "Russian",
    native: "Русский",
    dir: "ltr",
    flag: "🇷🇺",
  },
  {
    code: "es",
    label: "Spanish",
    native: "Español",
    dir: "ltr",
    flag: "🇪🇸",
  },
  {
    code: "sv",
    label: "Swedish",
    native: "Svenska",
    dir: "ltr",
    flag: "🇸🇪",
  },
  {
    code: "ta",
    label: "Tamil",
    native: "தமிழ்",
    dir: "ltr",
    flag: "🇮🇳",
  },
  {
    code: "te",
    label: "Telugu",
    native: "తెలుగు",
    dir: "ltr",
    flag: "🇮🇳",
  },
  {
    code: "th",
    label: "Thai",
    native: "ไทย",
    dir: "ltr",
    flag: "🇹🇭",
  },
  {
    code: "tr",
    label: "Turkish",
    native: "Türkçe",
    dir: "ltr",
    flag: "🇹🇷",
  },
  {
    code: "uk",
    label: "Ukrainian",
    native: "Українська",
    dir: "ltr",
    flag: "🇺🇦",
  },
  {
    code: "ur",
    label: "Urdu",
    native: "اردو",
    dir: "rtl",
    flag: "🇵🇰",
  },
  {
    code: "vi",
    label: "Vietnamese",
    native: "Tiếng Việt",
    dir: "ltr",
    flag: "🇻🇳",
  },
];

const TEXT = {
  en: {
    dashboard: "Dashboard",
    projects: "Projects",
    documents: "Documents",
    transmittals: "Transmittals",
    approvals: "Approvals",
    settings: "Settings",
    users: "Users",
    help: "Help & Support",
    profile: "My Profile",
    editProfile: "Edit Profile",
    signOut: "Sign out",
    language: "Language",
    search:
      "Search documents, projects, transmittals, mail, workflows...",
    save: "Save changes",
    cancel: "Cancel",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    account: "Account",
    preferences: "Preferences",
  },

  ar: {
    dashboard: "لوحة التحكم",
    projects: "المشاريع",
    documents: "المستندات",
    transmittals: "الإرساليات",
    approvals: "الموافقات",
    settings: "الإعدادات",
    users: "المستخدمون",
    help: "المساعدة والدعم",
    profile: "ملفي الشخصي",
    editProfile: "تعديل الملف الشخصي",
    signOut: "تسجيل الخروج",
    language: "اللغة",
    search:
      "البحث في المستندات والمشاريع والإرساليات والبريد وسير العمل...",
    save: "حفظ التغييرات",
    cancel: "إلغاء",
    changePassword: "تغيير كلمة المرور",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور",
    account: "الحساب",
    preferences: "التفضيلات",
  },

  hi: {
    dashboard: "डैशबोर्ड",
    projects: "प्रोजेक्ट",
    documents: "दस्तावेज़",
    transmittals: "ट्रांसमिटल",
    approvals: "अनुमोदन",
    settings: "सेटिंग्स",
    users: "उपयोगकर्ता",
    help: "सहायता और समर्थन",
    profile: "मेरी प्रोफ़ाइल",
    editProfile: "प्रोफ़ाइल संपादित करें",
    signOut: "साइन आउट",
    language: "भाषा",
    search:
      "दस्तावेज़, प्रोजेक्ट, ट्रांसमिटल, मेल और वर्कफ़्लो खोजें...",
    save: "परिवर्तन सहेजें",
    cancel: "रद्द करें",
    changePassword: "पासवर्ड बदलें",
    currentPassword: "वर्तमान पासवर्ड",
    newPassword: "नया पासवर्ड",
    confirmPassword: "पासवर्ड की पुष्टि करें",
    account: "खाता",
    preferences: "प्राथमिकताएँ",
  },

  te: {
    dashboard: "డ్యాష్‌బోర్డ్",
    projects: "ప్రాజెక్టులు",
    documents: "డాక్యుమెంట్లు",
    transmittals: "ట్రాన్స్‌మిటల్స్",
    approvals: "ఆమోదాలు",
    settings: "సెట్టింగ్స్",
    users: "వినియోగదారులు",
    help: "సహాయం & మద్దతు",
    profile: "నా ప్రొఫైల్",
    editProfile: "ప్రొఫైల్ సవరించండి",
    signOut: "సైన్ అవుట్",
    language: "భాష",
    search:
      "డాక్యుమెంట్లు, ప్రాజెక్టులు, ట్రాన్స్‌మిటల్స్, మెయిల్, వర్క్‌ఫ్లోలను శోధించండి...",
    save: "మార్పులను సేవ్ చేయండి",
    cancel: "రద్దు",
    changePassword: "పాస్‌వర్డ్ మార్చండి",
    currentPassword: "ప్రస్తుత పాస్‌వర్డ్",
    newPassword: "కొత్త పాస్‌వర్డ్",
    confirmPassword: "పాస్‌వర్డ్ నిర్ధారించండి",
    account: "ఖాతా",
    preferences: "ప్రాధాన్యతలు",
  },

  fr: {
    dashboard: "Tableau de bord",
    projects: "Projets",
    documents: "Documents",
    transmittals: "Transmissions",
    approvals: "Approbations",
    settings: "Paramètres",
    users: "Utilisateurs",
    help: "Aide et support",
    profile: "Mon profil",
    editProfile: "Modifier le profil",
    signOut: "Se déconnecter",
    language: "Langue",
    search:
      "Rechercher des documents, projets, transmissions, e-mails et workflows...",
    save: "Enregistrer",
    cancel: "Annuler",
    changePassword: "Changer le mot de passe",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    account: "Compte",
    preferences: "Préférences",
  },

  de: {
    dashboard: "Dashboard",
    projects: "Projekte",
    documents: "Dokumente",
    transmittals: "Übermittlungen",
    approvals: "Genehmigungen",
    settings: "Einstellungen",
    users: "Benutzer",
    help: "Hilfe & Support",
    profile: "Mein Profil",
    editProfile: "Profil bearbeiten",
    signOut: "Abmelden",
    language: "Sprache",
    search:
      "Dokumente, Projekte, Übermittlungen, Mail und Workflows suchen...",
    save: "Änderungen speichern",
    cancel: "Abbrechen",
    changePassword: "Passwort ändern",
    currentPassword: "Aktuelles Passwort",
    newPassword: "Neues Passwort",
    confirmPassword: "Passwort bestätigen",
    account: "Konto",
    preferences: "Präferenzen",
  },

  es: {
    dashboard: "Panel",
    projects: "Proyectos",
    documents: "Documentos",
    transmittals: "Transmisiones",
    approvals: "Aprobaciones",
    settings: "Configuración",
    users: "Usuarios",
    help: "Ayuda y soporte",
    profile: "Mi perfil",
    editProfile: "Editar perfil",
    signOut: "Cerrar sesión",
    language: "Idioma",
    search:
      "Buscar documentos, proyectos, transmisiones, correo y flujos de trabajo...",
    save: "Guardar cambios",
    cancel: "Cancelar",
    changePassword: "Cambiar contraseña",
    currentPassword: "Contraseña actual",
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar contraseña",
    account: "Cuenta",
    preferences: "Preferencias",
  },

  pt: {
    dashboard: "Painel",
    projects: "Projetos",
    documents: "Documentos",
    transmittals: "Transmissões",
    approvals: "Aprovações",
    settings: "Definições",
    users: "Utilizadores",
    help: "Ajuda e suporte",
    profile: "O meu perfil",
    editProfile: "Editar perfil",
    signOut: "Terminar sessão",
    language: "Idioma",
    search:
      "Pesquisar documentos, projetos, transmissões, correio e fluxos de trabalho...",
    save: "Guardar alterações",
    cancel: "Cancelar",
    changePassword: "Alterar palavra-passe",
    currentPassword: "Palavra-passe atual",
    newPassword: "Nova palavra-passe",
    confirmPassword: "Confirmar palavra-passe",
    account: "Conta",
    preferences: "Preferências",
  },

  "zh-CN": {
    dashboard: "仪表板",
    projects: "项目",
    documents: "文档",
    transmittals: "传输单",
    approvals: "审批",
    settings: "设置",
    users: "用户",
    help: "帮助与支持",
    profile: "我的资料",
    editProfile: "编辑资料",
    signOut: "退出登录",
    language: "语言",
    search: "搜索文档、项目、传输单、邮件和工作流...",
    save: "保存更改",
    cancel: "取消",
    changePassword: "修改密码",
    currentPassword: "当前密码",
    newPassword: "新密码",
    confirmPassword: "确认密码",
    account: "账户",
    preferences: "偏好设置",
  },

  "zh-TW": {
    dashboard: "儀表板",
    projects: "專案",
    documents: "文件",
    transmittals: "傳送單",
    approvals: "核准",
    settings: "設定",
    users: "使用者",
    help: "說明與支援",
    profile: "我的個人資料",
    editProfile: "編輯個人資料",
    signOut: "登出",
    language: "語言",
    search: "搜尋文件、專案、傳送單、郵件與工作流程...",
    save: "儲存變更",
    cancel: "取消",
    changePassword: "變更密碼",
    currentPassword: "目前密碼",
    newPassword: "新密碼",
    confirmPassword: "確認密碼",
    account: "帳戶",
    preferences: "偏好設定",
  },

  ja: {
    dashboard: "ダッシュボード",
    projects: "プロジェクト",
    documents: "文書",
    transmittals: "トランスミッタル",
    approvals: "承認",
    settings: "設定",
    users: "ユーザー",
    help: "ヘルプとサポート",
    profile: "マイプロフィール",
    editProfile: "プロフィールを編集",
    signOut: "サインアウト",
    language: "言語",
    search:
      "文書、プロジェクト、トランスミッタル、メール、ワークフローを検索...",
    save: "変更を保存",
    cancel: "キャンセル",
    changePassword: "パスワードを変更",
    currentPassword: "現在のパスワード",
    newPassword: "新しいパスワード",
    confirmPassword: "パスワードを確認",
    account: "アカウント",
    preferences: "環境設定",
  },

  ko: {
    dashboard: "대시보드",
    projects: "프로젝트",
    documents: "문서",
    transmittals: "전송 문서",
    approvals: "승인",
    settings: "설정",
    users: "사용자",
    help: "도움말 및 지원",
    profile: "내 프로필",
    editProfile: "프로필 편집",
    signOut: "로그아웃",
    language: "언어",
    search: "문서, 프로젝트, 전송, 메일, 워크플로 검색...",
    save: "변경 사항 저장",
    cancel: "취소",
    changePassword: "비밀번호 변경",
    currentPassword: "현재 비밀번호",
    newPassword: "새 비밀번호",
    confirmPassword: "비밀번호 확인",
    account: "계정",
    preferences: "환경설정",
  },

  ru: {
    dashboard: "Панель управления",
    projects: "Проекты",
    documents: "Документы",
    transmittals: "Передачи",
    approvals: "Согласования",
    settings: "Настройки",
    users: "Пользователи",
    help: "Помощь и поддержка",
    profile: "Мой профиль",
    editProfile: "Редактировать профиль",
    signOut: "Выйти",
    language: "Язык",
    search:
      "Поиск документов, проектов, передач, почты и рабочих процессов...",
    save: "Сохранить изменения",
    cancel: "Отмена",
    changePassword: "Изменить пароль",
    currentPassword: "Текущий пароль",
    newPassword: "Новый пароль",
    confirmPassword: "Подтвердите пароль",
    account: "Учётная запись",
    preferences: "Настройки предпочтений",
  },
};

function getInitialLanguage() {
  const saved = localStorage.getItem("dc_language");

  if (LANGUAGES.some((item) => item.code === saved)) {
    return saved;
  }

  const browser = navigator.language || "en";

  if (LANGUAGES.some((item) => item.code === browser)) {
    return browser;
  }

  const base = browser.split("-")[0];

  return (
    LANGUAGES.find((item) => item.code === base)?.code || "en"
  );
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const metadata =
    LANGUAGES.find((item) => item.code === language) ||
    LANGUAGES[0];

  useEffect(() => {
    localStorage.setItem("dc_language", language);

    document.documentElement.lang = language;
    document.documentElement.dir = metadata.dir;
  }, [language, metadata.dir]);

  const value = useMemo(
    () => ({
      language,
      metadata,
      languages: LANGUAGES,

      setLanguage: (code) => {
        if (LANGUAGES.some((item) => item.code === code)) {
          setLanguageState(code);
        }
      },

      t: (key) => {
        return TEXT[language]?.[key] || TEXT.en[key] || key;
      },
    }),
    [language, metadata]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}