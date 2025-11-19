// ✅ FILE: src/components/UI/Navbar.jsx (REMOVED DONATE LINKS)
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
} from "lucide-react"; // Removed PlusCircle import

const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

export default function Navbar({ isTransparent = false }) {
  /** *************************************
   *  ALL HOOKS MUST BE AT THE TOP 💯
   **************************************/
  const { currentUser, logout, isAdmin, loadingAuth } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoSmall, setLogoSmall] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const isAdminRoute = location.pathname.startsWith("/admin");

  /** *************************************
   *  EFFECTS – ALWAYS SAFE HERE
   **************************************/
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const current = window.scrollY;
          setScrolled(current > 10);
          setHidden(current > lastY && current > 70);
          setLogoSmall(current > 30);
          lastY = current;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileMenu(false);
    setLangMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  /** *************************************
   *  SAFE EARLY RETURN — FIXED VERSION
   **************************************/

  // Hide navbar completely on admin routes (intentional)
  if (isAdminRoute) {
    return null;
  }

  // Wait for Firebase auth + Firestore profile + claims
  if (loadingAuth) {
    return null;
  }

  // Hide navbar on public pages until user is known
  if (!currentUser) {
    return null;
  }

  /** *************************************
   *  Handlers
   **************************************/
  const handleLogout = async () => {
    if (window.confirm(t("confirmLogout") || "Logout?")) {
      await logout();
      localStorage.setItem("hasSeenOnboarding", "true");
      navigate("/onboarding");
    }
  };

  const base = "fixed top-0 left-0 w-full z-50 transition-all duration-500";
  const translate = hidden ? "-translate-y-full" : "translate-y-0";
  const background = scrolled
    ? "bg-blue-900/95 shadow-lg backdrop-blur"
    : isTransparent
    ? "bg-transparent"
    : "bg-blue-900";

  const currentPath = location.pathname;

  /** *************************************
   *  UI RETURN – SAFE
   **************************************/
  return (
    <>
      {/* TOP NAV */}
      <nav
        className={`${base} ${translate} ${background} text-white pt-[env(safe-area-inset-top)]`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 py-2 sm:py-3">

          {/* Logo */}
          <Link to="/items" className="flex items-center gap-2">
            <img
              src="/LogoX.png"
              alt="Freebies Japan"
              className={`${logoSmall ? "h-10 sm:h-12" : "h-14 sm:h-20"} transition-all`}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">

            <Link
              to="/items"
              className={currentPath === "/items" ? "text-blue-200 font-semibold" : "hover:text-blue-200"}
            >
              {t("items")}
            </Link>

            {/* 🚫 REMOVED: Donate Link */}
            {/* <Link
              to="/donate"
              className={currentPath === "/donate" ? "text-blue-200 font-semibold" : "hover:text-blue-200"}
            >
              {t("donate")}
            </Link> */}

            <Link
              to="/myactivity"
              className={currentPath === "/myactivity" ? "text-blue-200 font-semibold" : "hover:text-blue-200"}
            >
              {t("My Activity")}
            </Link>

            {/* Language dropdown */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1 hover:text-blue-200"
              >
                <Globe size={18} />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white text-black rounded-lg shadow-xl border animate-fadeInDown z-50">
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

            {/* Profile */}
            <div className="relative">
              <button onClick={() => setDropdownOpen(!dropdownOpen)}>
                <img
                  src={currentUser.avatar || "/default-avatar.png"}
                  className="w-9 h-9 rounded-full border object-cover"
                  alt="avatar"
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white text-black rounded-lg shadow-xl border animate-fadeInDown z-50">

                  {/* 🆕 Admin Link */}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 border-b border-gray-100 font-semibold text-blue-600"
                    >
                      <Shield size={16} />
                      Admin Panel
                    </Link>
                  )}

                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                  >
                    <User size={16} />
                    {t("profile")}
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-gray-100"
                  >
                    <X size={16} />
                    {t("logout")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2">
            {mobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-blue-900/95 px-5 py-4 space-y-3 animate-fadeInDown">

            {/* 🆕 Admin Link */}
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
            
            {/* 🚫 REMOVED: Donate Link from Mobile Menu */}
            {/* <Link to="/donate" onClick={() => setMobileMenu(false)} className="block py-2">
              {t("donate")}
            </Link> */}
            
            <Link to="/myactivity" onClick={() => setMobileMenu(false)} className="block py-2">
              {t("My Activity")}
            </Link>

            <hr className="border-blue-700 my-2" />

            <Link to="/profile" onClick={() => setMobileMenu(false)} className="block py-2">
              {t("profile")}
            </Link>

            <button onClick={handleLogout} className="text-red-300 block py-2">
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

      {/* BOTTOM MOBILE NAV - UPDATED: Removed Donate Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-blue-900/95 backdrop-blur border-t border-blue-800/40 text-white flex justify-around items-center py-2 z-40">
        <Link to="/items" className={`flex flex-col items-center text-xs ${currentPath === "/items" && "text-blue-300"}`}>
          <Home size={20} />
          <span>{t("Items")}</span>
        </Link>

        {/* 🚫 REMOVED: Donate Button from Bottom Mobile Nav */}
        {/* <Link to="/donate" className={`flex flex-col items-center text-xs ${currentPath === "/donate" && "text-blue-300"}`}>
          <PlusCircle size={22} />
          <span>{t("Donate")}</span>
        </Link> */}

        <Link to="/myactivity" className={`flex flex-col items-center text-xs ${currentPath === "/myactivity" && "text-blue-300"}`}>
          <Package size={20} />
          <span>{t("Activity")}</span>
        </Link>

        <Link to="/profile" className={`flex flex-col items-center text-xs ${currentPath === "/profile" && "text-blue-300"}`}>
          <User size={20} />
          <span>{t("Profile")}</span>
        </Link>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInDown {
          animation: fadeInDown .25s ease-out;
        }
      `}</style>
    </>
  );
}