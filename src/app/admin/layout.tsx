"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgePercent,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Images,
  Scissors,
  Tags,
  X,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Categories", href: "/admin/categories", icon: Tags },
  { label: "Services", href: "/admin/services", icon: Scissors },
  { label: "Deals", href: "/admin/deals", icon: BadgePercent },
  { label: "Gallery / Our Work", href: "/admin/gallery", icon: Images },
  { label: "Change Password", href: "/admin/change-password", icon: KeyRound },
];

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  if (pathname === "/admin/login") return children;

  async function handleLogout() {
    setLogoutError(null);
    try {
      const response = await fetch("/backend-api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Logout failed.");
      router.replace("/admin/login");
    } catch {
      setLogoutError("Could not log out. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#101c35]">
      <header className="border-b border-[#d8c8a6] bg-[#101c35] text-white lg:hidden">
        <div className="flex min-h-16 items-center justify-between px-5">
          <Link href="/admin" className="text-sm font-semibold tracking-[0.12em]" onClick={() => setOpen(false)}>
            PERFECT ADMIN
          </Link>
          <button
            type="button"
            aria-label={open ? "Close admin navigation" : "Open admin navigation"}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="rounded-sm p-2 text-[#d8c8a6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8c8a6]"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <nav className="border-t border-white/15 px-4 py-3" aria-label="Admin navigation">
            <NavigationLinks onNavigate={() => setOpen(false)} />
            <LogoutButton onLogout={handleLogout} />
            {logoutError && <p className="px-3 py-2 text-xs text-red-200" role="alert">{logoutError}</p>}
          </nav>
        )}
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#d8c8a6] bg-[#101c35] text-white lg:block">
        <div className="flex h-full flex-col px-5 py-7">
          <Link href="/admin" className="border-b border-white/15 pb-7 text-sm font-semibold tracking-[0.12em]">
            PERFECT HAIR
            <span className="mt-1 block text-[#d8c8a6]">ADMIN STUDIO</span>
          </Link>
          <nav className="mt-8 flex-1" aria-label="Admin navigation">
            <NavigationLinks />
          </nav>
          <LogoutButton onLogout={handleLogout} />
          {logoutError && <p className="mt-3 text-xs text-red-200" role="alert">{logoutError}</p>}
        </div>
      </aside>

      <div className="lg:pl-64">{children}</div>
    </div>
  );
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-1">
      {navigation.map(({ label, href, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-3 rounded-sm px-3 py-3 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8c8a6]"
        >
          <Icon size={17} className="shrink-0 text-[#d8c8a6]" aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </div>
  );
}

function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <button
      type="button"
      onClick={onLogout}
      className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 py-3 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8c8a6]"
    >
      <LogOut size={17} className="shrink-0 text-[#d8c8a6]" aria-hidden="true" />
      <span>Logout</span>
    </button>
  );
}
