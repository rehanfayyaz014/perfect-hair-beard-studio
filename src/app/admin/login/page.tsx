"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/backend-api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error("Invalid admin credentials.");
      router.replace("/admin");
    } catch {
      setError("Login failed. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-5 text-[#101c35]">
      <form onSubmit={handleSubmit} className="w-full max-w-md border border-[#d8c8a6] bg-white p-7 shadow-sm sm:p-9">
        <Image
          src="/brand/logo.png"
          alt="Perfect Hair and Beard Studio"
          width={180}
          height={70}
          className="h-auto max-h-16 w-auto object-contain object-left"
          priority
        />
        <p className="mt-6 text-xs tracking-[0.22em] text-[#98743b]">ADMIN ACCESS</p>
        <h1 className="mt-3 text-3xl font-semibold">Admin Login</h1>
        <div className="mt-7 space-y-4">
          <label className="block text-sm font-medium" htmlFor="username">
            Email / Login Identifier
            <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} required className="mt-2 w-full border border-[#d8c8a6] px-3 py-2" autoComplete="username" />
          </label>
          <label className="block text-sm font-medium" htmlFor="password">
            Password
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-2 w-full border border-[#d8c8a6] px-3 py-2" autoComplete="current-password" />
          </label>
        </div>
        {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="mt-6 w-full bg-[#101c35] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
