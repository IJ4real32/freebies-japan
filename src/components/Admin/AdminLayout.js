// ✅ FILE: src/components/Admin/AdminLayout.jsx
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
   * 🖥️ Activate admin desktop mode styling
   * ------------------------------------------------------------ */
  useEffect(() => {
    document.body.classList.add("admin-mode");
    return () => document.body.classList.remove("admin-mode");
  }, []);

  /* ------------------------------------------------------------
   * 🔄 Auto-close sidebar on route change
   * ------------------------------------------------------------ */
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  /* ------------------------------------------------------------
   * 🔗 Sidebar links configuration
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
   * 🧱 Layout
   * ------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 relative">
      {/* 🟦 Top Navbar */}
      <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-indigo-900 via-blue-900 to-purple-900 text-white shadow-lg z-40 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="p-2 rounded hover:bg-white/20 transition"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <h1 className="font-semibold text-lg">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/items")}
            className="bg-white/10 hover:bg-white/20 text-sm px-3 py-1.5 rounded-full transition"
          >
            Back to App
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-sm px-3 py-1.5 rounded-full flex items-center gap-1"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      {/* 🧭 Collapsible Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-white border-r border-gray-200 shadow-md transform transition-transform duration-300 z-30 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <img
              src="/LogoX.png"
              alt="Freebies Japan"
              className="h-10 w-auto object-contain"
            />
          </div>

          <nav className="flex-1 overflow-y-auto mt-3">
            {links.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block px-5 py-2.5 text-sm font-medium rounded-r-full transition-all ${
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

      {/* 📄 Main Content Area */}
      <main
        className={`transition-all duration-300 pt-20 px-4 ${
          sidebarOpen ? "md:ml-60" : "ml-0"
        }`}
      >
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>

      {/* 🩵 Background overlay when sidebar open on smaller screens */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
