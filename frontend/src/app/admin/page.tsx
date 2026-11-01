"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgePercent, Images, Scissors, Tags } from "lucide-react";
import { useRouter } from "next/navigation";

type Admin = { id: number; username: string };

const comingNextCards = [
  {
    id: "categories",
    title: "Categories",
    description: "Organize the salon catalog into clear service groups.",
    icon: Tags,
    href: "/admin/categories",
  },
  {
    id: "services",
    title: "Services",
    description: "Manage service names, prices, categories, and availability.",
    icon: Scissors,
    href: "/admin/services",
  },
  {
    id: "deals",
    title: "Deals",
    description: "Manage offers, prices, included items, and availability.",
    icon: BadgePercent,
    href: "/admin/deals",
  },
  {
    id: "gallery",
    title: "Gallery / Our Work",
    description: "Prepare salon and grooming work photos for the public gallery.",
    icon: Images,
    href: "/admin/gallery",
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/backend-api/auth/me", { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Unauthorized");
        return response.json() as Promise<Admin>;
      })
      .then(setAdmin)
      .catch(() => router.replace("/admin/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !admin) {
    return <main className="min-h-screen bg-[#f8f7f4] p-8 text-[#101c35]">Loading dashboard...</main>;
  }

  return (
    <main className="min-h-screen bg-[#f8f7f4] px-5 py-8 text-[#101c35] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <section className="border-b border-[#d8c8a6] pb-8">
          <p className="text-xs tracking-[0.22em] text-[#98743b]">ADMIN DASHBOARD</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Welcome, {admin.username}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#656565]">
            Manage the Perfect Hair and Beard Studio catalog from one secure workspace.
          </p>
          <Link
            href="/admin/change-password"
            className="mt-6 inline-flex min-h-11 items-center border border-[#98743b] px-4 py-3 text-sm font-semibold text-[#101c35] transition-colors hover:bg-[#101c35] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#98743b]"
          >
            Change Password
          </Link>
        </section>

        <section className="pt-8" aria-labelledby="catalog-tools-heading">
          <div>
            <p className="text-xs tracking-[0.22em] text-[#98743b]">CATALOG TOOLS</p>
            <h2 id="catalog-tools-heading" className="mt-2 text-2xl font-semibold">Management areas</h2>
            <p className="mt-2 text-sm text-[#656565]">These tools are being prepared for the next admin implementation batch.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {comingNextCards.map(({ id, title, description, icon: Icon, href }) => (
              <article id={id} key={id} className="scroll-mt-6 border border-[#d8c8a6] bg-white p-5 shadow-sm">
                <Icon size={22} className="text-[#98743b]" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-[#656565]">{description}</p>
                {href ? (
                  <Link href={href} className="mt-5 inline-flex min-h-11 items-center border border-[#98743b] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-[#101c35] hover:bg-[#101c35] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#98743b]">
                    {id === "categories" ? "MANAGE CATEGORIES" : id === "services" ? "MANAGE SERVICES" : id === "deals" ? "MANAGE DEALS" : "MANAGE GALLERY"}
                  </Link>
                ) : (
                  <span className="mt-5 inline-flex border border-[#d8c8a6] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-[#98743b]">
                    COMING NEXT
                  </span>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
