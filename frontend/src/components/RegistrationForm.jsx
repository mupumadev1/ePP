import React, { useState } from 'react';
import { register, verifyEmail, resendOtp } from '../api/auth.jsx';

const RegistrationForm = ({ onBackToLogin, onRegistrationSuccess }) => {
  const [step, setStep] = useState(1); // 1: registration form, 2: email verification
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    businessRegNumber: '',
    businessCategory: '',
    experience: ''
  });

  const [uploads, setUploads] = useState({
    businessRegCertificate: null,
    taxComplianceCert: null,
    companyProfile: null
  });

  const [verificationData, setVerificationData] = useState({
    otp: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setUploads(prev => ({
      ...prev,
      [name]: files[0] || null
    }));
  };

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      // Submit JSON payload expected by backend (files are currently not required by API)
      const payload = {
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        phoneNumber: formData.phoneNumber,
        businessRegNumber: formData.businessRegNumber,
        businessCategory: formData.businessCategory,
        experience: formData.experience ? Number(formData.experience) : undefined,
      };

      const result = await register(payload);
      setVerificationData({ ...verificationData, email: formData.email });
      setSuccess(result.message);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyEmail(verificationData);
      setSuccess('Email verified successfully! You can now log in.');
      if (onRegistrationSuccess) {
        onRegistrationSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);

    try {
      await resendOtp({ email: verificationData.email });
      setSuccess('Verification code sent to your email');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your Email
          </h2>
          <p className="text-gray-600">
            We've sent a 6-digit code to {verificationData.email}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmitVerification} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              maxLength="6"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
              value={verificationData.otp}
              onChange={(e) =>
                setVerificationData({
                  ...verificationData,
                  otp: e.target.value.replace(/\D/g, '').slice(0, 6)
                })
              }
              placeholder="000000"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || verificationData.otp.length !== 6}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={loading}
            className="text-blue-600 hover:underline text-sm"
          >
            Resend verification code
          </button>
          <div>
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-gray-600 hover:underline text-sm"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Register as Supplier
        </h2>
        <p className="text-gray-600">
          Join our e-procurement platform to access tender opportunities
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded whitespace-pre-line">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmitRegistration} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              name="firstName"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              name="lastName"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username *
          </label>
          <input
            type="text"
            name="username"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Choose a unique username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            name="phoneNumber"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder="+260971234567"
          />
        </div>

        {/* Business Requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Registration Number *
          </label>
          <input
            type="text"
            name="businessRegNumber"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.businessRegNumber}
            onChange={handleInputChange}
            placeholder="BRN-123456"
          />
        </div>

       <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Business Registration Certificate *
          </label>
          <input
            type="file"
            name="businessRegCertificate"
            accept=".pdf,.jpg,.jpeg,.png"
            required
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
                       file:rounded-md file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-600
                       hover:file:bg-blue-100"
          />
          {uploads.businessRegCertificate && (
            <div className="mt-2 p-2 border border-gray-300 rounded-md text-sm text-gray-700">
              <strong>Selected:</strong> {uploads.businessRegCertificate.name}
            </div>
          )}
        </div>


       <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Tax Compliance Certificate *
          </label>
          <input
            type="file"
            name="taxComplianceCert"
            accept=".pdf,.jpg,.jpeg,.png"
            required
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
                       file:rounded-md file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-600
                       hover:file:bg-blue-100"
          />
          {uploads.taxComplianceCert && (
            <div className="mt-2 p-2 border border-gray-300 rounded-md text-sm text-gray-700">
              <strong>Selected:</strong> {uploads.taxComplianceCert.name}
            </div>
          )}
        </div>
    <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Upload Company Profile *
  </label>
  <input
    type="file"
    name="companyProfile"
    accept=".pdf,.doc,.docx"
    required
    onChange={handleFileChange}
    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
               file:rounded-md file:border-0
               file:text-sm file:font-semibold
               file:bg-blue-50 file:text-blue-600
               hover:file:bg-blue-100"
  />
  {uploads.companyProfile && (
    <div className="mt-2 p-2 border border-gray-300 rounded-md text-sm text-gray-700">
      <strong>Selected:</strong> {uploads.companyProfile.name}
    </div>
  )}
</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Category *
          </label>
          <select
            name="businessCategory"
            required
            value={formData.businessCategory}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select category</option>
            <option value="construction">Construction</option>
            <option value="it">IT Services</option>
            <option value="consulting">Consulting</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Experience *
          </label>
          <textarea
            name="experience"
            required
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.experience}
            onChange={handleInputChange}
            placeholder="Describe your company’s experience, years of operation, or past projects..."
          />
        </div>

        {/* Password */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Re-enter your password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-gray-600 hover:underline text-sm"
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
};

export default RegistrationForm;
