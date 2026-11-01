"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type PasswordField = "currentPassword" | "newPassword" | "confirmNewPassword";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function toggleVisibility(field: PasswordField) {
    setVisible((current) => ({ ...current, [field]: !current[field] }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/backend-api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, confirm_new_password: confirmNewPassword }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(result?.detail ?? "Password could not be changed.");
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      window.setTimeout(() => router.replace("/admin/login"), 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password could not be changed.");
    } finally {
      setLoading(false);
    }
  }

  const fields: Array<{ key: PasswordField; label: string; value: string; setValue: (value: string) => void }> = [
    { key: "currentPassword", label: "Current password", value: currentPassword, setValue: setCurrentPassword },
    { key: "newPassword", label: "New password", value: newPassword, setValue: setNewPassword },
    { key: "confirmNewPassword", label: "Confirm new password", value: confirmNewPassword, setValue: setConfirmNewPassword },
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-5 py-10 text-[#101c35]">
      <form onSubmit={handleSubmit} className="w-full max-w-md border border-[#d8c8a6] bg-white p-7 shadow-sm sm:p-9">
        <p className="text-xs tracking-[0.22em] text-[#98743b]">ADMIN SECURITY</p>
        <h1 className="mt-3 text-3xl font-semibold">Change Password</h1>
        <p className="mt-3 text-sm text-[#656565]">Use a strong password with at least 12 characters.</p>
        <div className="mt-7 space-y-4">
          {fields.map((field) => (
            <label key={field.key} className="block text-sm font-medium" htmlFor={field.key}>
              {field.label}
              <span className="mt-2 flex border border-[#d8c8a6]">
                <input
                  id={field.key}
                  type={visible[field.key] ? "text" : "password"}
                  value={field.value}
                  onChange={(event) => field.setValue(event.target.value)}
                  required
                  minLength={field.key === "currentPassword" ? undefined : 12}
                  className="min-w-0 flex-1 px-3 py-2 outline-none"
                  autoComplete={field.key === "currentPassword" ? "current-password" : "new-password"}
                />
                <button type="button" onClick={() => toggleVisibility(field.key)} className="px-3 text-xs text-[#98743b] hover:text-[#101c35] focus-visible:outline-2 focus-visible:outline-[#98743b]">
                  {visible[field.key] ? "Hide" : "Show"}
                </button>
              </span>
            </label>
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
        {success && <p className="mt-4 text-sm text-green-700" role="status">Password changed. Please log in again.</p>}
        <button type="submit" disabled={loading} className="mt-6 w-full bg-[#101c35] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </main>
  );
}
