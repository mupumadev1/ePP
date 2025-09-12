// src/api/userContext.js
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import axiosInstance, { setCsrfToken } from './axiosInstance';
import { useNavigate } from 'react-router-dom';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchUserProfile = useCallback(async () => {
        try {
            setCsrfToken();
            const response = await axiosInstance.get('users/get-user-profile/');
            setUserProfile(response.data);
        } catch (error) {
            console.error("Error fetching user profile!", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    const login = useCallback(async (userData) => {
        try {
            setCsrfToken();
            console.log("Logging in with data:", userData);
            const response = await axiosInstance.post('/users/login/', userData);
            await fetchUserProfile();
            return response.data;
        } catch (error) {
            console.error("Login failed:", error);
            throw new Error('Login failed');
        }
    }, [fetchUserProfile]);

    const logout = useCallback(async () => {
        setCsrfToken();
        try {
            await axiosInstance.post('/users/logout/');
            setUserProfile(null);
            navigate('/');
        } catch (error) {
            console.error('Failed to Log Out:', error);
            throw new Error('Logout failed');
        }
    }, [navigate]);

    const updateUserProfile = useCallback(async (updatedProfile) => {
        try {
            const response = await axiosInstance.put('/users/update-profile/', updatedProfile);
            console.log(response.data);
            setUserProfile(response.data);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    }, []);

    const contextValue = useMemo(() => ({
        userProfile,
        loading,
        login,
        logout,
        setUserProfile,
        updateUserProfile
    }), [userProfile, loading, login, logout, updateUserProfile]);

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};

UserProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
