// src/routes/PrivateRouteAdmin.js
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRouteAdmin = ({ children }) => {
  const { isAdmin } = useAuth();
  const [adminStatus, setAdminStatus] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      setAdminStatus(await isAdmin());
      setLoading(false);
    };
    checkAdmin();
  }, [isAdmin]);

  if (loading) return <div>Loading permissions...</div>;
  return adminStatus ? children : <Navigate to="/unauthorized" />;
};

export default PrivateRouteAdmin;