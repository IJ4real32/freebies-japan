// File: src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import PrivateRouteAdmin from './routes/PrivateRouteAdmin';
import Navbar from './components/UI/Navbar';

// Import all pages
import Home from './pages/Home';
import Items from './pages/Items';
import Donate from './pages/Donate';
import MyRequests from './pages/MyRequests';
import AdminDashboard from './pages/AdminDashboard';
import RequestsAdmin from './pages/RequestsAdmin';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Signup from './pages/Signup';
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/items" element={<Items />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected User Routes */}
          <Route path="/donate" element={<PrivateRoute><Donate /></PrivateRoute>} />
          <Route path="/myrequests" element={<PrivateRoute><MyRequests /></PrivateRoute>} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<PrivateRouteAdmin><AdminDashboard /></PrivateRouteAdmin>} />
          <Route path="/admin/requests" element={<PrivateRouteAdmin><RequestsAdmin /></PrivateRouteAdmin>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;