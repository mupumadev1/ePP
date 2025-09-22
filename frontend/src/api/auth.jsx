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

export const checkUserAccess = async () => {
  try {
    const res = await axiosInstance.get('/users/check-access/');
    return res?.data;
  } catch (error) {
    if (error.response?.status === 401) return { error: 'Not authenticated' };
    if (error.response?.status === 403) return { error: 'Access denied' };
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

    if (res?.status >= 200 && res?.status < 300) {
      // Validate user role and access
      const userData = res?.data;
      if (userData?.status === 'suspended') {
        throw new Error('Your account has been suspended. Please contact support.');
      }
      if (userData?.status === 'inactive') {
        throw new Error('Your account is inactive. Please contact support.');
      }
      if (userData?.status === 'pending_verification') {
        throw new Error('Your account is pending verification. Please check your email.');
      }

      return userData;
    }
    throw new Error('Login failed - invalid response');
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Invalid email or password');
    }
    if (error.response?.status === 403) {
      const message = error.response?.data?.error || 'Account access denied';
      throw new Error(message);
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

    // Check if it's already a user-friendly error message
    if (error.message && !error.response) {
      throw error;
    }

    throw new Error(error.response?.data?.error || error.response?.data?.message || 'Login failed');
  }
};
export const register = async (data) => {
  try {
    // Ensure CSRF is set before posting
    await getCsrf();

    let res;
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      // Let the browser set the correct multipart boundary
      res = await axiosInstance.post('/users/register/', data);
    } else {
      const { email, password, confirmPassword, firstName, lastName, username, phoneNumber, company_name, companyName } = data || {};
      res = await axiosInstance.post('/users/register/', {
        email: String(email || '').trim().toLowerCase(),
        password,
        confirmPassword,
        first_name: String(firstName || '').trim(),
        last_name: String(lastName || '').trim(),
        username: String(username || '').trim(),
        phoneNumber: String(phoneNumber || '').trim(),
        company_name: String(company_name || companyName || '').trim(),
        user_type: 'supplier'
      });
    }

    if (res?.status >= 200 && res?.status < 300) {
      return res?.data;
    }
    throw new Error('Registration failed - invalid response');
  } catch (error) {
    if (error.response?.status === 400) {
      const errors = error.response?.data?.errors;
      if (errors) {
        // Convert validation errors to user-friendly messages
        const errorMessages = [];

        if (errors.email) {
          errorMessages.push(`Email: ${errors.email.join(', ')}`);
        }
        if (errors.username) {
          errorMessages.push(`Username: ${errors.username.join(', ')}`);
        }
        if (errors.phoneNumber) {
          errorMessages.push(`Phone: ${errors.phoneNumber.join(', ')}`);
        }
        if (errors.password) {
          errorMessages.push(`Password: ${errors.password.join(', ')}`);
        }
        if (errors.non_field_errors) {
          errorMessages.push(errors.non_field_errors.join(', '));
        }

        throw new Error(errorMessages.join('\n') || 'Registration failed');
      }
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    if (!error.response) {
      throw new Error('Network error. Please check your connection.');
    }
    throw new Error(error.response?.data?.error || 'Registration failed');
  }
};

export const verifyEmail = async ({ email, otp }) => {
  try {
    await getCsrf();

    const res = await axiosInstance.post('/users/verify-email/', {
      email: String(email || '').trim().toLowerCase(),
      otp: String(otp || '').trim()
    });

    if (res?.status >= 200 && res?.status < 300) {
      return res?.data;
    }
    throw new Error('Email verification failed');
  } catch (error) {
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.error || 'Invalid verification code');
    }
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    if (!error.response) {
      throw new Error('Network error. Please check your connection.');
    }
    throw new Error('Email verification failed');
  }
};

export const resendOtp = async ({ email }) => {
  try {
    await getCsrf();

    const res = await axiosInstance.post('/users/resend-otp/', {
      email: String(email || '').trim().toLowerCase()
    });

    if (res?.status >= 200 && res?.status < 300) {
      return res?.data;
    }
    throw new Error('Failed to resend verification code');
  } catch (error) {
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    if (!error.response) {
      throw new Error('Network error. Please check your connection.');
    }
    throw new Error('Failed to resend verification code');
  }
};


export const resetPassword = async ({ token, newPassword, confirmPassword }) => {
  try {
    await getCsrf();

    const res = await axiosInstance.post('/users/password-reset-confirm/', {
      token,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });

    if (res?.status >= 200 && res?.status < 300) {
      return res?.data;
    }
    throw new Error('Password reset failed');
  } catch (error) {
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.error || 'Invalid or expired reset token');
    }
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    if (!error.response) {
      throw new Error('Network error. Please check your connection.');
    }
    throw new Error('Password reset failed');
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

// Utility function to determine if user can access admin features
export const canAccessAdminDashboard = (userData) => {
  if (!userData || !userData.role_info) return false;
  return userData.role_info.can_access_admin_dashboard || false;
};

// Utility function to determine if user can access bidder features
export const canAccessBidderDashboard = (userData) => {
  if (!userData || !userData.role_info) return false;
  return userData.role_info.can_access_bidder_dashboard || false;
};

// Get appropriate dashboard route for user
export const getDashboardRoute = (userData) => {
  if (!userData || !userData.role_info) return '/login';
  return userData.role_info.dashboard_route || '/login';
};