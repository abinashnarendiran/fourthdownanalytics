"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { logout } from "../api/auth";

interface Props {
  children: React.ReactNode;
}

export default function MainLayout({ children }: Props) {
  const { user, setUser } = useAuth();
  console.log("MainLayout user:", user);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();       // call backend to clear cookie
      setUser(null);        // reset AuthContext user
      router.push("/login"); // redirect to login
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white shrink-0 p-4">
        <h1 className="text-xl font-bold mb-6">Fourth Down Analytics</h1>
        <nav className="flex flex-col gap-2">
          <Link href="/" className="hover:bg-[rgba(255,255,255,0.1)] p-2 rounded">Dashboard</Link>
          <Link href="/settings" className="hover:bg-[rgba(255,255,255,0.1)] p-2 rounded">Connect Fantasy Platforms</Link>
          <Link href="/profile" className="hover:bg-[rgba(255,255,255,0.1)] p-2 rounded">Profile</Link>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[var(--background)] border-b border-gray-200 shadow px-4 py-3 flex justify-between items-center">
          <h2 className="font-bold text-lg">Welcome{user ? `, ${user.name}` : ""}</h2>
          <button
            onClick={handleLogout}  // async logout handler
            className="bg-[var(--accent)] text-white px-3 py-1 rounded hover:opacity-90"
          >
            Logout
          </button>
        </header>

        {/* Main scrollable content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
