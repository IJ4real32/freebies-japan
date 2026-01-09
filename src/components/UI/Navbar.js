// ✅ FILE: src/components/UI/Navbar.jsx
// FINAL MOBILE-SAFE NAVBAR (NO REGRESSIONS)

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useLanguage } from "../../contexts/LanguageContext";

import {
  Globe,
  Menu,
  X,
  Home,
  Package,
  User,
  Shield,
} from "lucide-react";

const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

export default function Navbar() {
  const { currentUser, logout, isAdmin, loadingAuth } = useAuth();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const [hidden, setHidden] = useState(false);
  const [logoSmall, setLogoSmall] = useState(false);

  const isAdminRoute = location.pathname.startsWith("/admin");

  /* ------------------------------------------------------------
   * Scroll: hide on scroll-down, show on scroll-up
   ------------------------------------------------------------ */
  useEffect(() => {
let lastY = window.scrollY;
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const current = window.scrollY;

          setHidden(current > lastY && current > 40);
          setLogoSmall(current > 20);

          lastY = current;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Close menus on route change */
  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenu(false);
    setLangMenuOpen(false);
  }, [location.pathname]);

  /* Hide for Admin pages */
    if (isAdminRoute || loadingAuth || !currentUser) return null;

  /* Logout handler */
  const handleLogout = async () => {
    if (!window.confirm("Logout?")) return;
    await logout();
    localStorage.setItem("hasSeenOnboarding", "true");
    navigate("/onboarding");
  };

  /* Classes */
  const navHidden = hidden ? "-translate-y-full" : "translate-y-0";
  const bg = "bg-blue-900/95 shadow-md backdrop-blur";

  const currentPath = location.pathname;

  return (
    <>
      {/* TOP NAVBAR */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${navHidden} ${bg}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-2">

          {/* 🔥 Scaled Logo (does NOT change navbar height) */}
          <Link to="/items" className="flex items-center">
                  <img
                    src="/LogoX.png"
                    alt="Freebies Japan"
               className={`h-10 sm:h-12 transform transition-transform duration-300 ${
    logoSmall ? "scale-90" : "scale-[3]"
              }`}
              style={{ transformOrigin: "center" }}
            />
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">

            <Link
              to="/items"
              className={currentPath === "/items" ? "text-blue-200 font-semibold" : "hover:text-blue-200"}
                          >
              {t("items")}
            </Link>

            <Link
              to="/myactivity"
              className={currentPath === "/myactivity" ? "text-blue-200 font-semibold" : "hover:text-blue-200"}
                          >
              {t("My Activity")}
            </Link>

            {/* Language Menu */}
            <div className="relative">
              <button onClick={() => setLangMenuOpen(!langMenuOpen)} className="hover:text-blue-200">
                <Globe size={18} />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white text-black rounded-lg shadow-xl border z-50 animate-fadeInDown">
                  {languages.map(({ code, name, flag }) => (
                    <button
                      key={code}
                      onClick={() => {
                        setLanguage(code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-blue-50 ${
language === code ? "bg-blue-50 font-semibold" : ""
                      }`}
                                          >
                      <span>{flag}</span> {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button onClick={() => setDropdownOpen(!dropdownOpen)}>
                <img
                  src={currentUser.avatar || "/default-avatar.png"}
                  className="w-9 h-9 rounded-full border object-cover"
                  alt="avatar"
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white text-black rounded-lg shadow-xl border z-50 animate-fadeInDown">

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex gap-2 items-center px-4 py-2 text-blue-600 font-semibold hover:bg-gray-100 border-b"
                    >
                      <Shield size={16} /> Admin Panel
                    </Link>
                  )}

                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex gap-2 items-center px-4 py-2 hover:bg-gray-100"
                  >
                    <User size={16} /> {t("profile")}
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-gray-100"
                  >
                    <X size={16} /> {t("logout")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 text-white">
            {mobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* MOBILE MENU DROPDOWN */}
        {mobileMenu && (
          <div className="md:hidden bg-blue-900/95 px-5 py-4 space-y-3 animate-fadeInDown">

            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenu(false)}
                className="flex items-center gap-2 py-2 font-semibold text-blue-300"
              >
                <Shield size={18} />
                Admin Panel
              </Link>
            )}

            <Link to="/items" onClick={() => setMobileMenu(false)} className="block py-2">
              {t("items")}
            </Link>

            <Link to="/myactivity" onClick={() => setMobileMenu(false)} className="block py-2">
              {t("My Activity")}
            </Link>

            <hr className="border-blue-700 my-2" />

            <Link to="/profile" onClick={() => setMobileMenu(false)} className="block py-2">
              {t("profile")}
            </Link>

            <button onClick={handleLogout} className="block py-2 text-red-300">
              {t("logout")}
            </button>

            <div className="flex gap-4 pt-3">
              {languages.map(({ code, flag }) => (
                <button
                  key={code}
                  onClick={() => setLanguage(code)}
                  className={`text-xl ${language === code ? "opacity-100" : "opacity-40"}`}
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* BOTTOM NAV (MOBILE) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-blue-900/95 border-t border-blue-800/40 text-white flex justify-around items-center py-2 z-40">
          <Link
            to="/items"
          className={`flex flex-col items-center text-xs ${currentPath === "/items" && "text-blue-300"}`}
                      >
              <Home size={20} />
          <span>{t("Items")}</span>
          </Link>

          <Link
            to="/myactivity"
          className={`flex flex-col items-center text-xs ${currentPath === "/myactivity" && "text-blue-300"}`}
                      >
              <Package size={20} />
          <span>{t("Activity")}</span>
          </Link>

          <Link
            to="/profile"
          className={`flex flex-col items-center text-xs ${currentPath === "/profile" && "text-blue-300"}`}
                      >
              <User size={20} />
          <span>{t("Profile")}</span>
          </Link>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInDown {
          animation: fadeInDown .3s ease-out;
        }
      `}</style>
    </>
  );
}
