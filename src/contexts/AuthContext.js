import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = useCallback(async (userId) => {
    if (!userId) return false;
    try {
      const adminDoc = await getDoc(doc(db, 'admins', userId));
      return adminDoc.exists();
    } catch (error) {
      console.error('Admin check error:', error);
      return false;
    }
  }, []);

  const fetchUserData = useCallback(async (user) => {
    if (!user) {
      setCurrentUser(null);
      return null;
    }

    try {
      const [userDoc, isAdmin] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        checkAdminStatus(user.uid)
      ]);
      
      const userData = {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        role: isAdmin ? 'admin' : (userDoc.exists() ? userDoc.data().role || 'user' : 'user'),
        ...(userDoc.exists() && userDoc.data())
      };

      setCurrentUser(userData);
      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      setCurrentUser({
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        role: 'user'
      });
      return null;
    }
  }, [checkAdminStatus]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      await fetchUserData(user);
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchUserData]);

  const signup = useCallback(async (email, password, additionalData = {}) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
      await setDoc(doc(db, 'users', cred.user.uid), { 
        email: email,
        role: 'user',
        createdAt: new Date(),
        ...additionalData
      });
      return await fetchUserData(cred.user);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }, [fetchUserData]);

  const login = useCallback(async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return await fetchUserData(cred.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [fetchUserData]);

  const adminLogin = useCallback(async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userData = await fetchUserData(cred.user);
      
      if (!(await checkAdminStatus(cred.user.uid))) {
        await logout();
        throw new Error('Admin privileges required');
      }
      return userData;
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  }, [checkAdminStatus, fetchUserData, logout]);

  const value = {
    currentUser,
    loading,
    signup,
    login,
    adminLogin,
    logout,
    isAuthenticated: useCallback(() => !!currentUser, [currentUser]),
    isAdmin: useCallback(() => checkAdminStatus(currentUser?.uid), [checkAdminStatus, currentUser]),
    refreshUser: useCallback(() => fetchUserData(auth.currentUser), [fetchUserData]),
    checkAdminStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};