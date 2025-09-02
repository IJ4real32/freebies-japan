// File: src/pages/AdminDashboard.js
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [adminStatus, setAdminStatus] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check admin status and redirect if needed
  useEffect(() => {
    const checkAdminStatus = async () => {
      const admin = await isAdmin();
      setAdminStatus(admin);
      setLoading(false);
      
      if (!admin) {
        navigate('/unauthorized');
      }
    };

    checkAdminStatus();
  }, [isAdmin, navigate]);

  // Show loading state while checking auth status
  if (loading || !currentUser) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="text-sm mr-3">Logged in as: {currentUser.email}</span>
            {adminStatus && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Admin
              </span>
            )}
          </div>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/admin/requests"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-all border border-transparent hover:border-blue-200"
        >
          <h2 className="text-xl font-semibold mb-2">Manage Requests</h2>
          <p className="text-gray-600">View and approve item requests</p>
          <div className="mt-4 text-blue-500 text-sm font-medium">View →</div>
        </Link>
        
        <Link
          to="/admin/users"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-all border border-transparent hover:border-blue-200"
        >
          <h2 className="text-xl font-semibold mb-2">User Management</h2>
          <p className="text-gray-600">Manage user accounts and permissions</p>
          <div className="mt-4 text-blue-500 text-sm font-medium">View →</div>
        </Link>
        
        <Link
          to="/admin/items"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-all border border-transparent hover:border-blue-200"
        >
          <h2 className="text-xl font-semibold mb-2">Item Management</h2>
          <p className="text-gray-600">Manage donated items</p>
          <div className="mt-4 text-blue-500 text-sm font-medium">View →</div>
        </Link>
      </div>

      {/* Admin Quick Stats (example) */}
      <div className="mt-12 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-gray-500 text-sm">Pending Requests</h3>
            <p className="text-2xl font-bold">24</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-gray-500 text-sm">Active Users</h3>
            <p className="text-2xl font-bold">142</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-gray-500 text-sm">Available Items</h3>
            <p className="text-2xl font-bold">87</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;