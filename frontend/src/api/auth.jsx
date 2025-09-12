import axiosInstance, { setCsrfToken } from './axiosInstance.jsx';

// Auth API module encapsulating best-practice session + CSRF flows
// All functions throw user-friendly Errors to be displayed by UI layers

export const getCsrf = async () => {
  const res = await axiosInstance.get('/users/get-csrf-token/');
  if (res?.data?.csrfToken) {
    setCsrfToken();
  }
  return res?.data;
};

export const me = async () => {
  try {
    const res = await axiosInstance.get('/users/me/');
    return res?.data;
  } catch (error) {
    if (error.response?.status === 401) return { authenticated: false };
    throw error;
  }
};

export const login = async ({ username, password }) => {
  try {
    // Ensure CSRF is set before posting credentials
    await getCsrf();

    const res = await axiosInstance.post('/users/login/', {
      username: String(username || '').trim(),
      password,
    });
    console.log(res)
    if (res?.status >= 200 && res?.status < 300) {
      return res?.data;
    }
    throw new Error('Login failed - invalid response');
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Invalid username or password');
    }
    if (error.response?.status === 429) {
      throw new Error('Too many login attempts. Please try again later.');
    }
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    if (!error.response) {
      throw new Error('Network error. Please check your connection.');
    }
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

export const requestPasswordReset = async ({ email }) => {
  try {
    const res = await axiosInstance.post('/users/password-reset/', {
      email: String(email || '').trim().toLowerCase(),
    });
    if (res?.status >= 200 && res?.status < 300) return res.data;
    throw new Error('Password reset request failed');
  } catch (error) {
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    if (!error.response) {
      throw new Error('Network error. Please check your connection.');
    }
    // Intentionally ambiguous to avoid user enumeration
    throw new Error('If this email is registered, you will receive reset instructions.');
  }
};

export const logout = async () => {
  try {
    await axiosInstance.post('/users/logout/');
  } catch (error) {
    // Swallow errors for idempotent logout
    console.warn('Logout error (ignored):', error?.message || error);
  } finally {
    setCsrfToken();
  }
};
