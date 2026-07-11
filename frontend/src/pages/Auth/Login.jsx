import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const Login = () => {
  const navigate = useNavigate();
  const loginAction = useAuthStore((state) => state.loginAction);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    const loadingToast = toast.loading("Logging in...");
    const res = await loginAction(data.email, data.password);
    
    toast.dismiss(loadingToast);

    if (res.success) {
      toast.success("Welcome back to Instagram!");
      navigate("/home");
    } else {
      toast.error(res.error || "Invalid credentials");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-center bg-black min-h-screen w-full overflow-y-auto">
      {/* Visual Branding Section */}
      <div className="hidden lg:flex flex-col justify-center items-center bg-black h-screen w-3/5 p-12 border-r border-zinc-900">
        <img
          src="/Images/insta.png"
          alt="InstaLogo"
          className="h-28 w-28 mb-8"
        />
        <h1 className="text-4xl xl:text-5xl font-bold text-white text-center leading-tight">
          See everyday moments from your
        </h1>
        <h1 className="text-5xl xl:text-6xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mt-4">
          close friends.
        </h1>
        <img
          src="https://static.cdninstagram.com/rsrc.php/yR/r/92ZsVHNkyvf.webp"
          alt="Instagram Mockup"
          className="h-96 xl:h-[480px] object-contain mt-8 animate-float"
        />
      </div>

      {/* Login Credentials Form */}
      <div className="bg-black lg:bg-[#101114] text-white min-h-screen lg:h-screen w-full lg:w-2/5 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile Logo View */}
          <div className="flex flex-col items-center lg:items-start mb-8 lg:mb-10">
            <img
              src="/Images/insta.png"
              alt="Logo"
              className="w-16 h-16 lg:hidden mb-4"
            />
            <h1 className="text-3xl font-extrabold text-center lg:text-left bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Instagram
            </h1>
            <p className="text-gray-400 mt-2 text-center lg:text-left">
              Enter your credentials to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <input
                {...register("email")}
                type="text"
                placeholder="Email address"
                className={`w-full h-12 rounded-xl bg-zinc-900/60 border ${
                  errors.email ? "border-red-500 focus:border-red-500" : "border-zinc-800 focus:border-blue-500"
                } px-4 text-md outline-none transition placeholder:text-zinc-500`}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <input
                {...register("password")}
                type="password"
                placeholder="Password"
                className={`w-full h-12 rounded-xl bg-zinc-900/60 border ${
                  errors.password ? "border-red-500 focus:border-red-500" : "border-zinc-800 focus:border-blue-500"
                } px-4 text-md outline-none transition placeholder:text-zinc-500`}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </button>
          </form>

          <button
            type="button"
            className="w-full mt-4 text-sm text-zinc-500 hover:text-zinc-400 transition"
          >
            Forgot password?
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-zinc-800"></div>
            <span className="mx-4 text-xs font-bold text-zinc-500">OR</span>
            <div className="flex-1 h-px bg-zinc-800"></div>
          </div>

          <button
            onClick={() => navigate("/signup")}
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl border border-zinc-800 hover:bg-zinc-900/50 text-white font-semibold transition duration-200 cursor-pointer"
          >
            Create new account
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
