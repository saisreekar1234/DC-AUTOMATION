import { useState } from "react";

function Layout({
  activePage,
  onNavigate,
  children,
  role,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "▦",
    },
    {
      id: "projects",
      label: "Projects",
      icon: "▤",
    },
    {
      id: "documents",
      label: "Documents",
      icon: "▥",
    },
    {
      id: "transmittals",
      label: "Transmittals",
      icon: "⇄",
    },
    {
      id: "approvals",
      label: "Approvals",
      icon: "✓",
    },
    {
      id: "settings",
      label: "Settings",
      icon: "⚙",
    },
    ...(role === "admin"
      ? [
          {
            id: "users",
            label: "Users",
            icon: "♙",
          },
        ]
      : []),
  ];

  function handleNavigation(page) {
    onNavigate(page);
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">

      <button
        className="mobile-menu-button"
        onClick={() =>
          setSidebarOpen((current) => !current)
        }
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="brand">
          <div className="brand-icon">
            DC
          </div>

          <div>
            <h1>Document Control</h1>
            <span>Automation System</span>
          </div>
        </div>

        <nav className="navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${
                activePage === item.id
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleNavigation(item.id)
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot" />
            Backend Connected
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>

    </div>
  );
}

export default Layout;