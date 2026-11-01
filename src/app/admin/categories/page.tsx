"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Category = { id: number; name: string; slug: string; display_order: number; is_active: boolean };
type CategoryForm = { name: string; slug: string; display_order: string; is_active: boolean };

const emptyForm: CategoryForm = { name: "", slug: "", display_order: "0", is_active: true };

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    const response = await fetch("/backend-api/admin/categories", { credentials: "include" });
    if (response.status === 401) {
      router.replace("/admin/login");
      return;
    }
    if (!response.ok) throw new Error("Categories could not be loaded.");
    setCategories((await response.json()) as Category[]);
  }, [router]);

  useEffect(() => {
    void Promise.resolve()
      .then(loadCategories)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Categories could not be loaded."))
      .finally(() => setLoading(false));
  }, [loadCategories]);

  function startEdit(category: Category) {
    setEditingId(category.id);
    setForm({ name: category.name, slug: category.slug, display_order: String(category.display_order), is_active: category.is_active });
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const endpoint = editingId ? `/backend-api/admin/categories/${editingId}` : "/backend-api/admin/categories";
    try {
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, display_order: Number(form.display_order) }),
      });
      if (response.status === 401) return router.replace("/admin/login");
      const result = (await response.json().catch(() => null)) as { detail?: string } | null;
      if (!response.ok) throw new Error(result?.detail ?? "Category could not be saved.");
      await loadCategories();
      setMessage(editingId ? "Category updated successfully." : "Category added successfully.");
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Category could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category: Category) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/backend-api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: category.name, slug: category.slug, display_order: category.display_order, is_active: !category.is_active }),
      });
      if (response.status === 401) return router.replace("/admin/login");
      const result = (await response.json().catch(() => null)) as { detail?: string } | null;
      if (!response.ok) throw new Error(result?.detail ?? "Category status could not be changed.");
      await loadCategories();
      setMessage(`Category ${category.is_active ? "deactivated" : "restored"} successfully.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Category status could not be changed.");
    }
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Permanently delete ${category.name}? This cannot be undone.`)) return;
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/backend-api/admin/categories/${category.id}`, { method: "DELETE", credentials: "include" });
      if (response.status === 401) return router.replace("/admin/login");
      const result = (await response.json().catch(() => null)) as { detail?: string } | null;
      if (!response.ok) throw new Error(result?.detail ?? "Category could not be deleted.");
      await loadCategories();
      setMessage("Category permanently deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Category could not be deleted.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f7f4] px-5 py-8 text-[#101c35] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-[#d8c8a6] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/admin" className="text-xs font-semibold tracking-[0.16em] text-[#98743b]">← BACK TO DASHBOARD</Link>
            <p className="mt-5 text-xs tracking-[0.22em] text-[#98743b]">CATALOG MANAGEMENT</p>
            <h1 className="mt-2 text-3xl font-semibold">Categories</h1>
            <p className="mt-2 text-sm text-[#656565]">Create, organize, archive, and safely remove service categories.</p>
          </div>
          <button type="button" onClick={() => { resetForm(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#101c35] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1b2d50] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#98743b]"><Plus size={17} aria-hidden="true" /> Add Category</button>
        </div>

        {(message || error) && <p className={`mt-5 text-sm ${error ? "text-red-700" : "text-green-700"}`} role={error ? "alert" : "status"}>{error ?? message}</p>}

        <section className="mt-7 border border-[#d8c8a6] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="category-form-heading">
          <h2 id="category-form-heading" className="text-xl font-semibold">{editingId ? "Edit category" : "Add category"}</h2>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Name<input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 min-h-11 w-full border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /></label>
            <label className="text-sm font-medium">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="mt-2 min-h-11 w-full border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /></label>
            <label className="text-sm font-medium">Display order<input required min="0" type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: event.target.value })} className="mt-2 min-h-11 w-full border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /></label>
            <label className="flex min-h-11 items-center gap-3 self-end text-sm font-medium"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="size-4 accent-[#101c35]" /> Active category</label>
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row"><button type="submit" disabled={saving} className="min-h-11 bg-[#101c35] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : editingId ? "Save Changes" : "Add Category"}</button>{editingId && <button type="button" onClick={resetForm} className="min-h-11 border border-[#d8c8a6] px-5 py-3 text-sm font-semibold">Cancel</button>}</div>
          </form>
        </section>

        <section className="mt-8" aria-labelledby="category-list-heading">
          <div className="flex items-center justify-between"><h2 id="category-list-heading" className="text-xl font-semibold">Existing categories</h2><span className="text-sm text-[#656565]">{categories.length} total</span></div>
          {loading ? <p className="mt-5 text-sm text-[#656565]">Loading categories...</p> : categories.length === 0 ? <p className="mt-5 border border-dashed border-[#d8c8a6] p-6 text-sm text-[#656565]">No categories found.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2">{categories.map((category) => <article key={category.id} className="border border-[#d8c8a6] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{category.name}</h3><p className="mt-1 text-sm text-[#656565]">/{category.slug} · Order {category.display_order}</p></div><span className={`shrink-0 border px-2 py-1 text-xs font-semibold ${category.is_active ? "border-green-200 text-green-700" : "border-[#d8c8a6] text-[#98743b]"}`}>{category.is_active ? "Active" : "Inactive"}</span></div><div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3"><button type="button" onClick={() => startEdit(category)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#d8c8a6] px-3 py-2 text-sm font-semibold hover:bg-[#f8f7f4]"><Pencil size={15} aria-hidden="true" /> Edit</button><button type="button" onClick={() => toggleCategory(category)} className="min-h-11 border border-[#98743b] px-3 py-2 text-sm font-semibold text-[#98743b] hover:bg-[#f8f7f4]">{category.is_active ? "Deactivate" : "Restore"}</button><button type="button" onClick={() => deleteCategory(category)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 size={15} aria-hidden="true" /> Delete</button></div></article>)}</div>}
        </section>
      </div>
    </main>
  );
}
