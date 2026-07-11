import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import { Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username too long")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^a-zA-Z0-9]/, "Must contain at least one special character"),
    confirmpassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmpassword, {
    message: "Passwords do not match",
    path: ["confirmpassword"],
  });

const Signup = () => {
  const navigate = useNavigate();
  const signupAction = useAuthStore((state) => state.signupAction);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmpassword: "",
    },
  });

  const onSubmit = async (data) => {
    const loadingToast = toast.loading("Creating account...");
    const res = await signupAction({
      username: data.username,
      email: data.email,
      password: data.password,
      confirmpassword: data.confirmpassword,
    });
    
    toast.dismiss(loadingToast);

    if (res.success) {
      toast.success("Account created successfully!");
      navigate("/home");
    } else {
      toast.error(res.error || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#101114] text-white flex flex-col items-center justify-center p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        disabled={isSubmitting}
        className="self-start sm:ml-20 md:ml-40 lg:ml-60 xl:ml-80 mb-6 flex items-center gap-2 text-zinc-400 hover:text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowLeft size={18} />
        <span>Back</span>
      </button>

      {/* Form Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[440px] bg-black/40 border border-zinc-900 rounded-2xl p-8"
      >
        <h1 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          Create Account
        </h1>
        <p className="text-zinc-400 text-center text-sm mb-8">
          Sign up to see photos and videos from your friends.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Username */}
          <div>
            <input
              {...register("username")}
              type="text"
              placeholder="Username"
              className={`w-full h-12 rounded-xl bg-zinc-900/60 border ${
                errors.username ? "border-red-500 focus:border-red-500" : "border-zinc-800 focus:border-blue-500"
              } px-4 text-md outline-none transition placeholder:text-zinc-500`}
              disabled={isSubmitting}
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.username.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <input
              {...register("email")}
              type="email"
              placeholder="Email"
              className={`w-full h-12 rounded-xl bg-zinc-900/60 border ${
                errors.email ? "border-red-500 focus:border-red-500" : "border-zinc-800 focus:border-blue-500"
              } px-4 text-md outline-none transition placeholder:text-zinc-500`}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
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

          {/* Confirm Password */}
          <div>
            <input
              {...register("confirmpassword")}
              type="password"
              placeholder="Confirm Password"
              className={`w-full h-12 rounded-xl bg-zinc-900/60 border ${
                errors.confirmpassword ? "border-red-500 focus:border-red-500" : "border-zinc-800 focus:border-blue-500"
              } px-4 text-md outline-none transition placeholder:text-zinc-500`}
              disabled={isSubmitting}
            />
            {errors.confirmpassword && (
              <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.confirmpassword.message}</p>
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
                Signing up...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-zinc-400 text-sm">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-400 cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
