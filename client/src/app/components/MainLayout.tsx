"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { logout } from "../../api/auth";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string; // Page title only
  subtitle?: string; // Page subtitle only
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  subtitle
}) => {
  const { user, setUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white shrink-0 p-4">
        <div className="flex items-center gap-2 mb-6">
          <Image
            src="/fourth-down-analytics-logo.png"
            alt="Fourth Down Analytics Logo"
            width={100}
            height={100}
            priority
          />
          <h6 className="text-l font-bold">Fourth Down Analytics</h6>
        </div>
        <nav className="flex flex-col gap-2">
          <Link
            href="/"
            className="hover:bg-[rgba(255,255,255,0.1)] p-2 rounded"
          >
            Dashboard
          </Link>
          <Link
            href="/integrations"
            className="hover:bg-[rgba(255,255,255,0.1)] p-2 rounded"
          >
            Connect Fantasy Platforms
          </Link>
          <Link
            href="/profile"
            className="hover:bg-[rgba(255,255,255,0.1)] p-2 rounded"
          >
            Profile
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[var(--background)] border-b border-gray-200 shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            {`Welcome${user ? `, ${user.name}` : ""}`}
          </h1>

          <button
            onClick={handleLogout}
            className="bg-[var(--accent)] text-white px-3 py-1 rounded hover:opacity-90"
          >
            Logout
          </button>
        </header>

        {/* Main scrollable content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Page title & optional subtitle */}
          {title && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              {subtitle && (
                <p className="text-sm text-foreground/70 mt-1">{subtitle}</p>
              )}
            </div>
          )}

          {/* Actual page content */}
          {children}
        </main>
      </div>
    </div>
  );
};
