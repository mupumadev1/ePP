// src/api/userContext.js
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import axiosInstance, { setCsrfToken } from './axiosInstance';
import { useNavigate } from 'react-router-dom';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userProfile, setUserProfile] = useState(null);
    const [userRole, setUserRole] = useState({
        userType: null,
        canAccessAdmin: false,
        canAccessBidder: false,
        dashboardRoute: '/login',
        isSupplier: false,
        isAdmin: false,
        isEvaluator: false,
        isProcuringEntity: false
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const updateUserRole = useCallback((userData) => {
        if (userData && userData.role_info) {
            const roleInfo = userData.role_info;
            setUserRole({
                userType: userData.user_type,
                canAccessAdmin: roleInfo.can_access_admin_dashboard || false,
                canAccessBidder: roleInfo.can_access_bidder_dashboard || false,
                dashboardRoute: roleInfo.dashboard_route || '/login',
                isSupplier: roleInfo.is_supplier || false,
                isAdmin: roleInfo.is_admin_user || false,
                isEvaluator: roleInfo.is_evaluator_user || false,
                isProcuringEntity: roleInfo.is_procuring_entity_user || false
            });
        } else {
            setUserRole({
                userType: null,
                canAccessAdmin: false,
                canAccessBidder: false,
                dashboardRoute: '/login',
                isSupplier: false,
                isAdmin: false,
                isEvaluator: false,
                isProcuringEntity: false
            });
        }
    }, []);

    const fetchUserProfile = useCallback(async () => {
        try {
            setCsrfToken();
            const response = await axiosInstance.get('users/me/');
            if (response.data.authenticated && response.data.user) {
                setUserProfile(response.data.user);
                updateUserRole(response.data.user);
            } else {
                setUserProfile(null);
                updateUserRole(null);
            }
        } catch (error) {
            console.error("Error fetching user profile!", error);
            setUserProfile(null);
            updateUserRole(null);

            // If unauthorized, redirect to login
            if (error.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [updateUserRole, navigate]);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    const login = useCallback(async (userData) => {
        try {
            setCsrfToken();
            console.log("Logging in with data:", userData);
            const response = await axiosInstance.post('/users/login/', userData);

            // Check if login was successful and get role information
            if (response.data && response.data.role_info) {
                setUserProfile(response.data);
                updateUserRole(response.data);

                // Navigate to appropriate dashboard based on role
                const dashboardRoute = response.data.role_info.dashboard_route || '/dashboard';
                navigate(dashboardRoute);
            } else {
                // Fallback: fetch user profile to get complete role info
                await fetchUserProfile();
            }

            return response.data;
        } catch (error) {
            console.error("Login failed:", error);

            // Handle specific error cases
            if (error.response?.status === 403) {
                const errorMessage = error.response?.data?.error || 'Access denied';
                throw new Error(errorMessage);
            }

            throw new Error(error.response?.data?.error || 'Login failed');
        }
    }, [fetchUserProfile, updateUserRole, navigate]);

    const logout = useCallback(async () => {
        setCsrfToken();
        try {
            await axiosInstance.post('/users/logout/');
        } catch (error) {
            console.error('Failed to Log Out:', error);
        } finally {
            setUserProfile(null);
            updateUserRole(null);
            navigate('/login');
        }
    }, [updateUserRole, navigate]);

    const updateUserProfile = useCallback(async (updatedProfile) => {
        try {
            const response = await axiosInstance.put('/users/update-profile/', updatedProfile);
            console.log(response.data);
            setUserProfile(response.data);
            updateUserRole(response.data);
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }, [updateUserRole]);

    // Check if user can access a specific route
    const canAccessRoute = useCallback((route) => {
        if (!userProfile) return false;

        // Admin routes
        const adminRoutes = ['/dashboard', '/tenders', '/evaluation', '/contracts', '/reports', '/settings'];
        if (adminRoutes.some(adminRoute => route.startsWith(adminRoute))) {
            return userRole.canAccessAdmin;
        }

        // Bidder routes that require authentication
        const bidderAuthRoutes = ['/bidder/dashboard', '/bidder/bids'];
        if (bidderAuthRoutes.some(bidderRoute => route.startsWith(bidderRoute))) {
            return userRole.canAccessBidder;
        }

        // Bidding action routes
        if (route.includes('/bid') && route.startsWith('/bidder/')) {
            return userRole.canAccessBidder;
        }

        // Public routes
        return true;
    }, [userProfile, userRole]);

    // Get redirect route based on current user's role
    const getRedirectRoute = useCallback(() => {
        return userRole.dashboardRoute;
    }, [userRole.dashboardRoute]);

    const contextValue = useMemo(() => ({
        userProfile,
        userRole,
        loading,
        login,
        logout,
        setUserProfile,
        updateUserProfile,
        canAccessRoute,
        getRedirectRoute,
        updateUserRole
    }), [
        userProfile,
        userRole,
        loading,
        login,
        logout,
        updateUserProfile,
        canAccessRoute,
        getRedirectRoute,
        updateUserRole
    ]);

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};

UserProvider.propTypes = {
    children: PropTypes.node.isRequired,
};