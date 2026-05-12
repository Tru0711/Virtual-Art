import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { toastError, toastSuccess } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';

const OTP_LENGTH = 6;

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeAuth } = useAuth();

  const email = location.state?.email || '';
  const purpose = location.state?.purpose || '';
  const initialExpiry = Number(location.state?.expiresInSeconds || 600);
  const initialCooldown = Number(location.state?.cooldownSeconds || 60);

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [expiresIn, setExpiresIn] = useState(initialExpiry);
  const [cooldown, setCooldown] = useState(initialCooldown);

  const inputRefs = useRef([]);

  const title = useMemo(() => {
    if (purpose === 'signup') return 'Verify your account';
    if (purpose === 'forgot_password') return 'Verify password reset OTP';
    if (purpose === 'login') return 'Verify login OTP';
    return 'Verify OTP';
  }, [purpose]);

  useEffect(() => {
    if (!email || !purpose) {
      navigate('/login', { replace: true });
    }
  }, [email, purpose, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const otp = digits.join('');
  const isOtpReady = otp.length === OTP_LENGTH && digits.every((d) => d !== '');

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const focusInput = (index) => {
    const node = inputRefs.current[index];
    if (node) node.focus();
  };

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);
    setError('');

    if (value && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const updated = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((char, i) => {
      updated[i] = char;
    });
    setDigits(updated);

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    focusInput(focusIndex);
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');

    if (!isOtpReady) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    if (expiresIn <= 0) {
      setError('OTP expired. Please resend a new code.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.verifyOtp({ email, purpose, otp });

      if (purpose === 'signup' && response?.token && response?.user) {
        await completeAuth(response);
        toastSuccess('Account verified successfully');
        const userType = response.user.user_type;
        if (userType === 'artist') {
          navigate('/artist/dashboard', { replace: true });
        } else {
          navigate('/user/dashboard', { replace: true });
        }
        return;
      }

      if (purpose === 'forgot_password') {
        toastSuccess('OTP verified. Set your new password.');
        navigate('/reset-password', {
          replace: true,
          state: {
            email,
            resetToken: response.resetToken,
          },
        });
        return;
      }

      toastSuccess(response?.message || 'OTP verified successfully');
      navigate('/login', { replace: true });
    } catch (err) {
      const message = err?.message || 'Failed to verify OTP';
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError('');

    try {
      const response = await api.resendOtp({ email, purpose });
      setDigits(Array(OTP_LENGTH).fill(''));
      setExpiresIn(Number(response?.expiresInSeconds || initialExpiry));
      setCooldown(Number(response?.cooldownSeconds || initialCooldown));
      toastSuccess(response?.message || 'OTP resent successfully');
      focusInput(0);
    } catch (err) {
      const message = err?.message || 'Failed to resend OTP';
      setError(message);
      if (err?.data?.cooldownSeconds) {
        setCooldown(Number(err.data.cooldownSeconds));
      }
      toastError(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8">
        <button
          onClick={() => navigate('/login')}
          className="text-gray-600 hover:text-gray-800 mb-6 flex items-center gap-2 transition-colors"
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-100 rounded-full mb-4">
            <ShieldCheck className="h-8 w-8 text-cyan-700" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{title}</h2>
          <p className="text-gray-600">
            Enter the OTP sent to <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5" onPaste={handlePaste}>
          <div className="flex justify-center gap-2 md:gap-3">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  inputRefs.current[index] = node;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                className="w-11 h-12 md:w-12 md:h-14 text-center text-xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 flex items-center justify-between">
            <span>OTP expires in:</span>
            <strong>{formatTime(expiresIn)}</strong>
          </div>

          <button
            type="submit"
            disabled={loading || !isOtpReady}
            className="w-full py-3 bg-cyan-700 text-white rounded-lg font-semibold hover:bg-cyan-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying OTP...' : 'Verify OTP'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="w-full py-3 border border-cyan-700 text-cyan-800 rounded-lg font-semibold hover:bg-cyan-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : resending ? 'Resending...' : 'Resend OTP'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OtpVerification;
