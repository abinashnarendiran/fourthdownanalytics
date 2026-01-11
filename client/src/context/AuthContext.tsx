"use client"; // important if using Next.js App Router

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getMe } from "../api/auth";

// 1️⃣ Define a type for your user (replace `any` with your real user type)
interface User {
  userId: number;  // match the API
  email: string;
  name?: string;
  // add any other fields your API returns
}

// 2️⃣ Define context type
interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
}

// 3️⃣ Create context with proper typing
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// 4️⃣ Provider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchUser = async () => {
    try {
      const res = await getMe(); // res = [Error | null, User | null]
      if (res[1]) {
        setUser({
          ...res[1],
          userId: res[1].userId, // ensure id is number
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Error fetching user:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  fetchUser();
}, []);
  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 5️⃣ Custom hook with proper type check
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
