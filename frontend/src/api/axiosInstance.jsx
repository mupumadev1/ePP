import axios from "axios";

const axiosInstance = axios.create({
    baseURL: "http://192.168.100.201:8000/",
    withCredentials: true,
   // timeout: 10000, // Add timeout for better UX
});

// Optimized cookie parser with caching
let cookieCache = new Map();
let lastCookieString = '';

const getCookie = (name) => {
    const currentCookies = document.cookie;
    
    // Use cache if cookies haven't changed
    if (currentCookies === lastCookieString && cookieCache.has(name)) {
        return cookieCache.get(name);
    }
    
    // Clear cache and reparse if cookies changed
    if (currentCookies !== lastCookieString) {
        cookieCache.clear();
        lastCookieString = currentCookies;
    }
    
    if (!currentCookies) {
        cookieCache.set(name, null);
        return null;
    }

    const cookies = currentCookies.split(';');
    const cookieRegex = new RegExp(`^\\s*${name}=\\s*(.*)`);

    const cookie = cookies.find(c => cookieRegex.test(c));
    const value = cookie ? decodeURIComponent(cookie.replace(cookieRegex, '$1')) : null;
    
    cookieCache.set(name, value);
    return value;
};

// Track current token to avoid unnecessary header updates
let currentCsrfToken = null;

export const setCsrfToken = () => {
    const csrfToken = getCookie("csrftoken");
    if (csrfToken && csrfToken !== currentCsrfToken) {
        axiosInstance.defaults.headers["X-CSRFToken"] = csrfToken;
        currentCsrfToken = csrfToken;
        return true; // Token was updated
    }
    return false; // Token unchanged
};

// Enhanced request interceptor with retry logic for CSRF
axiosInstance.interceptors.request.use(
    (config) => {
        setCsrfToken();
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling common errors
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Handle CSRF token issues
        if (error.response?.status === 403 && 
            error.response?.data?.detail?.includes('CSRF') && 
            !originalRequest._retry) {
            
            originalRequest._retry = true;
            
            try {
                // Force refresh CSRF token
                currentCsrfToken = null;
                cookieCache.clear();
                await axiosInstance.get('/users/get-csrf-token/');
                setCsrfToken();
                
                // Retry original request
                return axiosInstance(originalRequest);
            } catch (retryError) {
                console.error('CSRF retry failed:', retryError);
            }
        }
        
        // Handle authentication errors
        if (error.response?.status === 401 && !originalRequest.url?.includes('/login/')) {
            // Clear local auth state
            localStorage.removeItem('isAuthenticated');
            
            // Optionally dispatch a logout event
            window.dispatchEvent(new CustomEvent('auth-logout'));
        }
        
        return Promise.reject(error);
    }
);

export default axiosInstance;