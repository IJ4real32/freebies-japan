// ✅ FILE: src/components/Admin/AdminLayout.jsx - FIXED FULL WIDTH
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminLayout({ title = "Admin Panel", children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ------------------------------------------------------------
   * 🖥️ Force full-width admin layout
   * ------------------------------------------------------------ */
  useEffect(() => {
    document.body.classList.add("admin-mode", "overflow-x-hidden");
    return () => {
      document.body.classList.remove("admin-mode", "overflow-x-hidden");
    };
  }, []);

  /* ------------------------------------------------------------
   * 🔄 Auto-close sidebar on mobile when route changes
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  /* ------------------------------------------------------------
   * 🔗 Sidebar links
   * ------------------------------------------------------------ */
  const links = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/requests", label: "Requests" },
    { path: "/admin/items", label: "Items" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/payments", label: "Payments" },
    { path: "/admin/money-donations", label: "Donations" },
    { path: "/admin/lottery", label: "Lottery" },
    { path: "/admin/pickups", label: "Pickups" },
  ];

  /* ------------------------------------------------------------
   * 🔘 Logout handler
   * ------------------------------------------------------------ */
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  /* ------------------------------------------------------------
   * 🧱 Fixed Layout - ABSOLUTELY NO WIDTH CONSTRAINTS
   * ------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex w-full">
      {/* 🟦 Desktop Sidebar - Always visible on desktop */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-gray-200 shadow-sm flex-col flex-shrink-0">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center px-4 py-5 border-b">
            <img
              src="/LogoX.png"
              alt="Freebies Japan"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto mt-4">
            {links.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block px-6 py-3 text-sm font-medium rounded-r-lg transition-all mx-2 mb-1 ${
                    active
                      ? "bg-indigo-100 text-indigo-700 border-l-4 border-indigo-500 shadow-sm"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4 text-center text-xs text-gray-500">
            Freebies Japan © {new Date().getFullYear()}
          </div>
        </div>
      </aside>

      {/* 🟦 Mobile Sidebar - Overlay */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 shadow-xl transform transition-transform duration-300 z-40 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-5 border-b">
            <img
              src="/LogoX.png"
              alt="Freebies Japan"
              className="h-10 w-auto object-contain"
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto mt-4">
            {links.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`block px-6 py-3 text-sm font-medium rounded-r-lg transition-all mx-2 mb-1 ${
                    active
                      ? "bg-indigo-100 text-indigo-700 border-l-4 border-indigo-500"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-4 text-center text-xs text-gray-500">
            Freebies Japan © {new Date().getFullYear()}
          </div>
        </div>
      </aside>

      {/* Main Content Area - FULL WIDTH, NO CONSTRAINTS */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* 🟦 Top Header */}
        <header className="bg-gradient-to-r from-indigo-900 via-blue-900 to-purple-900 text-white shadow-lg z-30 flex-shrink-0 w-full">
          <div className="flex items-center justify-between px-6 py-4 w-full">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded hover:bg-white/20 transition md:hidden"
              >
                <Menu size={22} />
              </button>

              <h1 className="font-semibold text-xl">{title}</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/items")}
                className="bg-white/10 hover:bg-white/20 text-sm px-4 py-2 rounded-lg transition"
              >
                Back to App
              </button>

              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* 📄 Main Content - ABSOLUTELY NO WIDTH CONSTRAINTS */}
        <main className="flex-1 p-6 overflow-auto bg-gray-50 w-full">
          {/* ⚠️ REMOVED ALL CONTAINER CONSTRAINTS - Children render full width */}
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>

      {/* 🩵 Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
