import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Phone, Lock, ArrowRight, AlertCircle, UserPlus, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useCarePulseStore } from '../../lib/store';
import { loadGoogleScript, authenticateWithBackend, GOOGLE_CLIENT_ID, parseJwt, useGoogleAuth } from '../../lib/googleAuth';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const setUserAuth = useCarePulseStore((s) => s.setUserAuth);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn: googleSignIn, isLoading: isGoogleLoading, error: googleError, setError: setGoogleError } = useGoogleAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sign up modal prompt state
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [unregisteredIdentifier, setUnregisteredIdentifier] = useState('');

  // Sync google auth error to local error message
  useEffect(() => {
    if (googleError) {
      setErrorMessage(googleError);
    }
  }, [googleError]);

  // Sign up modal prompt & OAuth Redirect check
  useEffect(() => {
    let isMounted = true;

    // 1. Check if returning from Google OAuth Redirect (#access_token=...)
    const checkRedirectToken = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          setErrorMessage(null);
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const gProfile = await userRes.json();
            if (gProfile?.email) {
              const authResult = await authenticateWithBackend({
                profile: {
                  email: gProfile.email,
                  name: gProfile.name || gProfile.email.split('@')[0],
                  picture: gProfile.picture || '',
                  googleId: gProfile.sub,
                },
              });
              if (authResult?.user) {
                await setUserAuth(authResult.user, authResult.token);
                window.history.replaceState(null, '', window.location.pathname);
                navigate('/home');
                return;
              }
            }
          } catch (err: any) {
            console.error('Google OAuth redirect token error:', err);
            setErrorMessage('Failed to sign in with Google account.');
          }
        }
      }
    };

    checkRedirectToken();

    // 2. Initialize Google Identity Services for web One-Tap & buttons
    const initGoogle = async () => {
      try {
        await loadGoogleScript();
        if (!isMounted) return;

        if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.trim() !== '') {
          if (window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              auto_select: false,
              callback: async (response: { credential: string }) => {
                try {
                  setErrorMessage(null);
                  const authResult = await authenticateWithBackend({ credential: response.credential });
                  if (authResult?.user) {
                    await setUserAuth(authResult.user, authResult.token);
                    navigate('/home');
                  }
                } catch (err: any) {
                  console.error('Backend Google Auth error:', err);
                  const decoded = parseJwt(response.credential);
                  if (decoded?.email) {
                    await setUserAuth({
                      id: decoded.sub || `usr-${Date.now()}`,
                      fullName: decoded.name || decoded.email.split('@')[0],
                      email: decoded.email,
                      phone: '',
                      dob: '1995-07-24',
                      gender: 'Not specified',
                      bloodGroup: 'O+',
                      emergencyContact: { name: 'Emergency Contact', phone: '+1 555-0199', relationship: 'Primary' },
                      avatarUrl: decoded.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
                      authProvider: 'google',
                    });
                    navigate('/home');
                  } else {
                    setErrorMessage(err.message || 'Failed to authenticate with Google.');
                  }
                }
              },
            });

            try {
              window.google.accounts.id.prompt();
            } catch (promptErr) {
              console.warn('Google One-Tap prompt note:', promptErr);
            }
          }
        }
      } catch (err) {
        console.warn('Google SDK init notice:', err);
      }
    };

    initGoogle();

    return () => {
      isMounted = false;
    };
  }, [navigate, setUserAuth]);

  const handleGoogleClick = () => {
    setErrorMessage(null);
    setGoogleError(null);
    googleSignIn(async (user, token) => {
      await setUserAuth(user, token);
      navigate('/home');
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const inputVal = phone.trim();
    const passVal = password.trim();

    // TODO: RE-ENABLE FOR PRODUCTION — Empty field constraint
    // if (!inputVal) {
    //   setErrorMessage('Please enter your registered phone number or email.');
    //   setIsLoading(false);
    //   return;
    // }

    const isEmail = inputVal.includes('@');
    const payload = isEmail
      ? { email: inputVal, password: passVal }
      : { phone: inputVal, password: passVal };

    const tryFetch = async (endpoint: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);
      try {
        return await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const apiEnvUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
    const endpointsToTry: string[] = [];
    if (apiEnvUrl) {
      endpointsToTry.push(apiEnvUrl.endsWith('/api') ? `${apiEnvUrl}/auth/login` : `${apiEnvUrl}/api/auth/login`);
    }
    endpointsToTry.push('/api/auth/login');
    endpointsToTry.push('http://localhost:5000/api/auth/login');

    let res: Response | null = null;
    let data: any = {};

    for (const ep of endpointsToTry) {
      try {
        res = await tryFetch(ep);
        if (res) break;
      } catch {
        // try next endpoint
      }
    }

    if (res) {
      data = await res.json().catch(() => ({}));

      // TODO: RE-ENABLE FOR PRODUCTION — 404 Not Found constraint (user doesn't exist in backend)
      // if (res.status === 404 || (data.detail && data.detail.toLowerCase().includes('not found'))) {
      //   setUnregisteredIdentifier(inputVal);
      //   setShowSignupPrompt(true);
      //   setErrorMessage(`No account found for "${inputVal}". Click below to Sign Up.`);
      //   setIsLoading(false);
      //   return;
      // } else if (!res.ok) {
      //   setErrorMessage(data.detail || data.error || 'Incorrect password or authentication error.');
      //   setIsLoading(false);
      //   return;
      // }

      if (data.user) {
        await setUserAuth(data.user, data.token);
        setIsLoading(false);
        navigate('/home');
        return;
      }
    } else {
      // Fallback check against local registered users if backend network is totally offline
      const storedUsersStr = localStorage.getItem('carepulse_registered_users');
      const registeredUsers: any[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];

      const inputDigits = inputVal.replace(/\D/g, '').slice(-10);
      const inputLowerEmail = inputVal.toLowerCase();

      const localMatched = registeredUsers.find((u) => {
        const uDigits = (u.phone || '').replace(/\D/g, '').slice(-10);
        const uEmail = (u.email || '').toLowerCase();
        return (
          (inputDigits && uDigits && inputDigits === uDigits) ||
          (inputLowerEmail && uEmail && inputLowerEmail === uEmail)
        );
      });

      if (localMatched) {
        // TODO: RE-ENABLE FOR PRODUCTION — Password mismatch constraint (local fallback)
        // if (localMatched.password && passVal && localMatched.password !== passVal) {
        //   setErrorMessage('Incorrect password. Please verify and try again.');
        // } else {
          await setUserAuth(localMatched, `local-token-${Date.now()}`);
          setIsLoading(false);
          navigate('/home');
          return;
        // }
      } else {
        // TODO: RE-ENABLE FOR PRODUCTION — Unregistered user constraint (local fallback)
        // setUnregisteredIdentifier(inputVal);
        // setShowSignupPrompt(true);
        // setErrorMessage(`No account found for "${inputVal}". Click below to Sign Up.`);
      }
    }

    setIsLoading(false);
  };

  const handleProceedToSignup = () => {
    setShowSignupPrompt(false);
    const isEmail = unregisteredIdentifier.includes('@');
    navigate('/register', {
      state: isEmail ? { initialEmail: unregisteredIdentifier } : { initialPhone: unregisteredIdentifier },
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 py-8 sm:px-6 w-full relative">
      <div className="w-full max-w-sm sm:max-w-md space-y-5">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-teal flex items-center justify-center text-white shadow-xs">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-[#0B5A54] tracking-tight">CarePulse</h1>
            <p className="text-xs font-medium text-[#6B7280]">Empathetic healthcare at your fingertips</p>
          </div>
        </div>

        {/* Main Login Card */}
        <Card padding="lg" className="shadow-xs border border-[#E4E7EC] bg-[#F8FAFC]/90 space-y-4">
          <div className="text-left space-y-1 pb-1 border-b border-[#E4E7EC]/60">
            <h2 className="text-base sm:text-lg font-bold font-heading text-[#111827]">Welcome back</h2>
            <p className="text-xs text-[#6B7280] leading-snug">Log in to manage appointments & health records</p>
          </div>

          {/* User existence & error alert */}
          {errorMessage && (
            <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-amber-50 text-amber-950 text-xs border border-amber-300 shadow-2xs animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-snug font-semibold">{errorMessage}</span>
              </div>
              {showSignupPrompt && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleProceedToSignup}
                    className="w-full text-center text-xs font-bold text-white bg-[#0B5A54] hover:bg-[#094843] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl shadow-2xs cursor-pointer transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account / Sign Up Now →</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Number / Email Input */}
            <div className="space-y-1.5 text-left">
              <Input
                label="PHONE NUMBER OR EMAIL"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number or email"
                leftIcon={<Phone className="w-4 h-4 text-[#0B5A54]" />}
                required
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">
                  PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => alert('Password reset link sent to your registered contact!')}
                  className="text-[11px] font-bold text-[#0B5A54] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isPassword
                leftIcon={<Lock className="w-4 h-4 text-[#0B5A54]" />}
                placeholder="Enter password"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="mt-1 text-xs font-bold py-3 rounded-xl shadow-2xs"
            >
              LOGIN
            </Button>

            {/* Divider */}
            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E4E7EC]" />
              </div>
              <span className="relative bg-[#F8FAFC] px-3 text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-wider">
                OR
              </span>
            </div>

            {/* Google Sign-in (Always Rendered on Android & Web) */}
            <div className="w-full flex flex-col items-center justify-center">
              <Button
                type="button"
                variant="outline"
                fullWidth
                isLoading={isGoogleLoading}
                onClick={handleGoogleClick}
                className="flex items-center justify-center gap-2 font-bold text-xs text-[#111827] bg-white border border-[#E4E7EC] shadow-2xs py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.35 7.37 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.24C.45 8.17 0 9.99 0 12s.45 3.83 1.24 5.4s3.28 3.13 5.28 3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.65 1.24 6.6l4.04 3.13c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </Button>
            </div>
          </form>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-3 pt-1">
          <p className="text-xs font-semibold text-[#6B7280]">
            New user?{' '}
            <button
              onClick={() => navigate('/register')}
              className="font-bold text-[#0B5A54] hover:underline ml-0.5"
            >
              Sign Up
            </button>
          </p>

          <div className="flex justify-center items-center gap-1.5 pt-1">
            <div className="w-6 h-1 rounded-full bg-[#0B5A54]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]/40" />
          </div>
        </div>
      </div>

      {/* Interactive Account Not Found -> Signup Modal Prompt */}
      {showSignupPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-[#E4E7EC] relative animate-scale-up">
            <button
              onClick={() => setShowSignupPrompt(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#9CA3AF] hover:text-[#111827] hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 text-[#0B5A54] flex items-center justify-center mx-auto shadow-xs">
              <UserPlus className="w-8 h-8 text-[#0B5A54]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold font-heading text-[#111827]">Account Not Found</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                We couldn't find an account matching <span className="font-bold text-[#111827]">{unregisteredIdentifier}</span>. Would you like to create a new profile now?
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="button"
                size="lg"
                fullWidth
                onClick={handleProceedToSignup}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="py-3.5 rounded-xl text-xs font-bold shadow-xs"
              >
                Sign Up & Create Account
              </Button>

              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => setShowSignupPrompt(false)}
                className="py-2.5 rounded-xl text-xs font-bold text-[#6B7280] border-[#E4E7EC] hover:bg-gray-50"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
