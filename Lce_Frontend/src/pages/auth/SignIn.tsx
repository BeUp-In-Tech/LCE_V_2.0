import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import AuthHeader from "../../components/navbar/AuthHeader";
import { Link, useNavigate, useLocation } from "react-router-dom";
import SocialPage from "../../components/shared/SocialPage";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../components/Toast";


type LoginFormInputs = {
  email: string;
  password: string;
};

const SignIn: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showInfo } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();

  
  
  
  const hasCheckedAuth = useRef(false);
  React.useEffect(() => {
    if (!authLoading && !hasCheckedAuth.current) {
      hasCheckedAuth.current = true;
      if (isAuthenticated) {
        const from =
          (location.state as { from?: { pathname: string } })?.from?.pathname ||
          "/dashboard/dashboardHome";
        navigate(from, { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, navigate, location]);

  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    setError(null);

    try {
      await login(data.email, data.password);
      
      const from =
        (location.state as { from?: { pathname: string } })?.from?.pathname ||
        "/dashboard/dashboardHome";
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof Error && err.message === "USER_NOT_FOUND") {
        showInfo("Account not found. Let's create one!");
        setTimeout(() => {
          navigate("/accoutntype", {
            state: { email: data.email, password: data.password },
          });
        }, 1500);
        return;
      }
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
      setIsLoading(false);
    }
  };

  return (
    <main className="bg-white min-h-screen">
      <AuthHeader />
      <div className="min-h-[calc(100vh-165px)] flex items-center justify-center p-4">
        <div className="w-full border border-gray-300 max-w-110 bg-white rounded-3xl p-8 sm:p-10">
          <h1 className="text-[26px] text-center text-[#7047EB] mb-8 font-medium">
            Log in to your account
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
            <div>
              <div className="bg-[#F0F2F5] rounded-[14px] px-4 py-2.5 relative">
                <label
                  htmlFor="email"
                  className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 mb-0.5"
                >
                  <Mail size={12} /> Email
                </label>
                <input
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  className="w-full bg-transparent border-none p-0 text-sm outline-none text-[#2F393D] placeholder-gray-400"
                  disabled={isLoading}
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-red-500 text-xs mt-1 ml-1" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="bg-[#F0F2F5] rounded-[14px] px-4 py-2.5 relative">
                <label
                  htmlFor="password"
                  className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 mb-0.5"
                >
                  <Lock size={12} /> Password
                </label>
                <div className="flex items-center">
                  <input
                    {...register("password", {
                      required: "Password is required",
                    })}
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="Enter your password"
                    className="w-full bg-transparent border-none p-0 text-sm outline-none text-[#2F393D] placeholder-gray-400 pr-8"
                    disabled={isLoading}
                    aria-invalid={errors.password ? "true" : "false"}
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-gray-400 hover:text-gray-600 p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {errors.password && (
                <p id="password-error" className="text-red-500 text-xs mt-1 ml-1" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#3CA5E1] hover:bg-[#3496cc] disabled:bg-gray-400 text-white font-semibold py-3.5 rounded-full text-[15px] transition-colors mt-2 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </button>

            <div className="text-right mt-2">
              <Link
                to="/forgotPassword"
                type="button"
                className="text-[#3CA5E1] font-semibold text-[13px] hover:text-[#3496cc] transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 text-gray-400 bg-white">
                or continue with
              </span>
            </div>
          </div>

          <SocialPage />

          <p className="text-center mt-8 text-sm text-[#4B5457]">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-[#3CA5E1] font-semibold hover:text-[#3496cc] transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default SignIn;
