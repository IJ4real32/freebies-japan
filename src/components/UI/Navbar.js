// File: src/components/UI/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { currentUser, logout, isAuthenticated, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [adminStatus, setAdminStatus] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (isAuthenticated()) {
        setAdminStatus(await isAdmin());
      }
      setAuthChecked(true);
    };
    checkAuthStatus();
  }, [isAuthenticated, isAdmin]);

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLogoutLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <nav className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold hover:text-blue-200 transition-colors">
            Freebies Japan
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="w-full md:w-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold hover:text-blue-200 transition-colors">
            Freebies Japan
          </Link>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 rounded-md hover:bg-blue-700 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className={`${isMenuOpen ? 'block' : 'hidden'} md:flex gap-6 items-center mt-4 md:mt-0`}>
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center">
            <Link 
              to="/items" 
              className="hover:text-blue-200 transition-colors py-2 md:py-0"
              onClick={() => setIsMenuOpen(false)}
            >
              Items
            </Link>
            
            {isAuthenticated() && (
              <>
                <Link 
                  to="/donate" 
                  className="hover:text-blue-200 transition-colors py-2 md:py-0"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Donate
                </Link>
                <Link 
                  to="/myrequests" 
                  className="hover:text-blue-200 transition-colors py-2 md:py-0"
                  onClick={() => setIsMenuOpen(false)}
                >
                  My Requests
                </Link>
              </>
            )}
            
            {adminStatus && (
              <Link 
                to="/admin" 
                className="hover:text-blue-200 transition-colors py-2 md:py-0"
                onClick={() => setIsMenuOpen(false)}
              >
                Admin
              </Link>
            )}
          </div>

          <div className="border-t md:border-t-0 border-blue-500 pt-4 md:pt-0 w-full md:w-auto">
            {!isAuthenticated() ? (
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <Link 
                  to="/login" 
                  className="hover:text-blue-200 transition-colors py-2 md:py-0"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100 transition-colors w-full md:w-auto text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Signup
                </Link>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm italic">{currentUser.email}</span>
                  {adminStatus && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 w-full md:w-auto"
                >
                  {logoutLoading ? 'Logging Out...' : 'Logout'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;