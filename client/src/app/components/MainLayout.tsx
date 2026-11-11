"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { logout } from "../../api/auth";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerControls?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  subtitle,
  headerControls,
}) => {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Helper to style active links
  const linkStyle = (path: string) =>
    `p-2.5 rounded transition-colors font-medium ${
      pathname === path
        ? "bg-white/20 text-white"
        : "hover:bg-white/10 text-white/70"
    }`;

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white shrink-0 p-6 flex flex-col border-r border-border">
        <div className="flex items-center gap-3 mb-10">
          <Image
            src="/fourth-down-analytics-logo.png"
            alt="Logo"
            width={32}
            height={32}
            style={{ height: "auto" }}
            className="rounded"
          />
          <h6 className="text-sm font-bold leading-tight uppercase tracking-tighter">
            Fourth Down
            <br />
            Analytics
          </h6>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <Link href="/" className={linkStyle("/")}>
            Dashboard
          </Link>
          <Link href="/integrations" className={linkStyle("/integrations")}>
            Connect Platforms
          </Link>
          <Link href="/profile" className={linkStyle("/profile")}>
            Profile
          </Link>
        </nav>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="bg-background border-b border-border px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex flex-col">
            <h1 className="text-sm font-medium opacity-50 uppercase tracking-wider">
              {title}
            </h1>
            <p className="font-bold text-lg">
              {user ? user.name : "Guest User"}
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* Contextual Selectors (League/Week) */}
            {headerControls && (
              <div className="flex items-center gap-3 pr-6 border-r border-border">
                {headerControls}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="bg-accent text-white px-4 py-1.5 rounded-md text-sm font-bold hover:opacity-90 transition-all"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {title && (
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-muted-foreground mt-1 text-lg">{subtitle}</p>
              )}
            </div>
          )}

          <div className="max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
};
