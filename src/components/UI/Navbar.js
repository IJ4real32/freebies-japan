// ✅ FILE: src/components/UI/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useLanguage } from "../../contexts/LanguageContext";
import { Globe, Menu, X } from "lucide-react";

const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

const Navbar = ({ isTransparent = false }) => {
  const { currentUser, logout, isAdmin, loadingAuth } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  /* 🧭 Hide navbar on admin pages */
  const isAdminRoute = location.pathname.startsWith("/admin");
  useEffect(() => {
    if (isAdminRoute) {
      setHidden(true);
      setMobileMenu(false);
    } else {
      setHidden(false);
    }
  }, [isAdminRoute]);

  /* 🧭 Scroll hide/show */
  useEffect(() => {
    if (isAdminRoute) return;
    let lastY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 10);
      if (currentY > lastY && currentY > 60) setHidden(true);
      else setHidden(false);
      lastY = currentY;
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isAdminRoute]);

  if (loadingAuth || !currentUser || isAdminRoute) return null;

  const navBase = "navbar-safe fixed left-0 w-full z-50 text-white transition-all duration-500";
  const translate = hidden ? "-translate-y-full" : "translate-y-0";
  const scrolledClass = scrolled ? "bg-blue-900/90 backdrop-blur-md shadow" : isTransparent ? "bg-transparent" : "bg-blue-900";

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMobileMenu(false);
    await logout();
    navigate("/onboarding");
  };

  return (
    <nav className={`${navBase} ${translate} ${scrolledClass}`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 pb-3">
        {/* ✅ Logo */}
        <Link to="/items" className="flex items-center gap-2">
          <img
            src="/LogoX.png"
            alt="Freebies Japan"
            className="h-12 sm:h-16 w-auto object-contain"
          />
        </Link>

        {/* ✅ Desktop Links */}
        <div className="hidden md:flex items-center gap-5 text-sm text-white">
          <Link to="/items" className="hover:text-blue-200 transition-colors">
            {t("items")}
          </Link>
          <Link to="/donate" className="hover:text-blue-200 transition-colors">
            {t("donate")}
          </Link>
          <Link
            to="/myactivity"
            className="hover:text-blue-200 transition-colors"
          >
            {t("My Activity") || "My Activity"}
          </Link>

          {isAdmin() && !isAdminRoute && (
            <Link
              to="/admin"
              className="hover:text-yellow-300 transition-colors text-xs"
            >
              {t("adminDashboard")}
            </Link>
          )}

          {/* 🌐 Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="text-white flex items-center gap-1 focus:outline-none"
            >
              <Globe size={18} />
            </button>
            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white text-black rounded shadow z-50">
                {languages.map(({ code, name, flag }) => (
                  <button
                    key={code}
                    onClick={() => {
                      setLanguage(code);
                      setLangMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-blue-100 ${
                      language === code ? "bg-blue-50 font-semibold" : ""
                    }`}
                  >
                    <span>{flag}</span>
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 👤 User Dropdown */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 focus:outline-none"
              >
                <img
                  src={currentUser.avatar || "/default-avatar.png"}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border"
                />
                {isAdmin() && (
                  <span className="ml-1 bg-yellow-300 text-yellow-900 text-xs px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white text-black rounded shadow z-50">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/profile");
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    {t("profile")}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    {t("logout")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ✅ Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenu(!mobileMenu)}
          className="md:hidden text-white"
        >
          {mobileMenu ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ✅ Mobile Dropdown */}
      {mobileMenu && (
        <div className="md:hidden bg-blue-900/95 backdrop-blur-md border-t border-blue-700/40 text-white px-4 py-3 space-y-3 text-sm animate-fadeInDown">
          <Link to="/items" onClick={() => setMobileMenu(false)} className="block">
            {t("items")}
          </Link>
          <Link to="/donate" onClick={() => setMobileMenu(false)} className="block">
            {t("donate")}
          </Link>
          <Link
            to="/myactivity"
            onClick={() => setMobileMenu(false)}
            className="block"
          >
            {t("My Activity") || "My Activity"}
          </Link>

          {isAdmin() && (
            <Link
              to="/admin"
              onClick={() => setMobileMenu(false)}
              className="block text-yellow-300"
            >
              {t("adminDashboard")}
            </Link>
          )}

          <hr className="border-blue-800/40 my-2" />

          <Link
            to="/profile"
            onClick={() => setMobileMenu(false)}
            className="block"
          >
            {t("profile")}
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full text-left text-red-300 hover:text-red-400"
          >
            {t("logout")}
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeInDown {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInDown { animation: fadeInDown 0.3s ease-out; }
      `}</style>
    </nav>
  );
};

export default Navbar;
