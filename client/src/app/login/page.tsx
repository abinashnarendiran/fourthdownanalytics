"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import Head from "next/head";

/**
 * Zod schema
 */
const schema = z.object({
  email: z.string().email("Email is invalid"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*\d)(?=.*[^A-Za-z0-9]).*$/,
      "Password must contain at least 1 number and 1 special character"
    )
});

type LoginForm = z.infer<typeof schema>;

// 1️⃣ Define User type (adjust fields as needed)
interface User {
  id: number; // match the API
  email: string;
  name?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<LoginForm>({
    resolver: zodResolver(schema)
  });

  // 🔹 Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/"); // automatically redirect logged-in users
    }
  }, [user, loading, router]);

  /**
   * 🔑 Login submit
   */
  const onSubmit = async (data: LoginForm) => {
    const res = await login(data.email, data.password);

    if (res[0] === null && res[1]) {
      // ✅ set the user exactly as returned from API
      setUser(res[1]);
      router.push("/"); // redirect
    } else {
      setError("root", {
        type: "server",
        message: res[0]?.message || "Login failed"
      });
    }
  };

  if (loading) return <p>Loading...</p>; // wait for AuthContext to load

  return (
    <>
      <Head>
        <title>Fourth Down Analytics</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 border rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {/* Global error */}
            {errors.root && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {errors.root.message}
              </div>
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white py-2 rounded"
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-4 text-center text-gray-500">
            No account?{" "}
            <button
              onClick={() => router.push("/signup")}
              className="text-blue-600 underline"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </>
  );
}
