"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signup } from "../../api/auth";

/**
 * 1️⃣ Zod schema
 * Password: min 8 chars, 1 number, 1 special character
 */
const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Email is invalid"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*\d)(?=.*[^A-Za-z0-9]).*$/,
        "Password must contain at least 1 number and 1 special character"
      ),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

type SignupForm = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<SignupForm>({
    resolver: zodResolver(schema)
  });

  // Signup submit
  const onSubmit = async (data: SignupForm) => {
    const res = await signup({
      name: data.name,
      email: data.email,
      password: data.password
    });

    if (res[0] !== null) {
      setError("root", { message: res[0]?.message ?? "Signup failed" });
      setSuccessMessage("");
      return;
    }

    // Show success message
    setSuccessMessage("Signup successful! Redirecting to login...");

    // Wait 2 seconds, then redirect
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 border rounded-lg shadow-md bg-background">
        <h2 className="text-2xl font-bold mb-6 text-center text-foreground">
          Sign Up
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Global error alert */}
          {errors.root && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <span className="block sm:inline">{errors.root.message}</span>
            </div>
          )}
          {/* Success message */}
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
              <span className="block sm:inline">{successMessage}</span>
            </div>
          )}

          {/* Name */}
          <input
            type="text"
            placeholder="Full Name"
            {...register("name")}
            className="border rounded px-4 py-2"
          />
          {errors.name && (
            <p className="text-red-500 text-sm">{errors.name.message}</p>
          )}

          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            {...register("email")}
            className="border rounded px-4 py-2"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              {...register("password")}
              className="border rounded px-4 py-2 w-full"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-2 text-sm text-gray-500"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm">{errors.password.message}</p>
          )}

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              {...register("confirmPassword")}
              className="border rounded px-4 py-2 w-full"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-2 text-sm text-gray-500"
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm">
              {errors.confirmPassword.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          >
            {isSubmitting ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-500">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-blue-600 underline"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}
