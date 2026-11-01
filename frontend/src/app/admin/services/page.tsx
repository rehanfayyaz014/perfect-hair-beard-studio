"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Category = { id: number; name: string; slug: string; is_active: boolean };
type Service = {
  id: number;
  category_id: number;
  category_name: string;
  category_slug: string;
  name: string;
  slug: string;
  price: string | number;
  currency: string;
  display_order: number;
  is_active: boolean;
};
type ServiceForm = {
  category_id: string;
  name: string;
  slug: string;
  price: string;
  currency: string;
  display_order: string;
  is_active: boolean;
};

const emptyForm: ServiceForm = {
  category_id: "",
  name: "",
  slug: "",
  price: "",
  currency: "PKR",
  display_order: "0",
  is_active: true,
};

async function readError(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as { detail?: string } | null;
  return result?.detail ?? fallback;
}

export default function AdminServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Service | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [servicesResponse, categoriesResponse] = await Promise.all([
      fetch("/backend-api/admin/services", { credentials: "include" }),
      fetch("/backend-api/admin/categories", { credentials: "include" }),
    ]);
    if (servicesResponse.status === 401 || categoriesResponse.status === 401) {
      router.replace("/admin/login");
      return;
    }
    if (!servicesResponse.ok) throw new Error(await readError(servicesResponse, "Services could not be loaded."));
    if (!categoriesResponse.ok) throw new Error(await readError(categoriesResponse, "Categories could not be loaded."));
    const [serviceData, categoryData] = await Promise.all([
      servicesResponse.json() as Promise<Service[]>,
      categoriesResponse.json() as Promise<Category[]>,
    ]);
    setServices(serviceData);
    setCategories(categoryData);
    if (categoryData.length > 0) {
      setForm((current) => current.category_id ? current : { ...current, category_id: String(categoryData[0].id) });
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve()
      .then(loadData)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Services could not be loaded."))
      .finally(() => setLoading(false));
  }, [loadData]);

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return services.filter((service) => {
      const matchesQuery = !query || `${service.name} ${service.slug} ${service.category_name}`.toLowerCase().includes(query);
      const matchesCategory = categoryFilter === "all" || String(service.category_id) === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [services, search, categoryFilter]);

  function startEdit(service: Service) {
    setEditingId(service.id);
    setViewing(null);
    setForm({ category_id: String(service.category_id), name: service.name, slug: service.slug, price: String(service.price), currency: service.currency, display_order: String(service.display_order), is_active: service.is_active });
    setMessage(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, category_id: categories[0] ? String(categories[0].id) : "" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const endpoint = editingId ? `/backend-api/admin/services/${editingId}` : "/backend-api/admin/services";
    try {
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, category_id: Number(form.category_id), price: form.price, display_order: Number(form.display_order) }),
      });
      if (response.status === 401) return router.replace("/admin/login");
      if (!response.ok) throw new Error(await readError(response, "Service could not be saved."));
      await loadData();
      setMessage(editingId ? "Service updated successfully." : "Service added successfully.");
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Service could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleService(service: Service) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/backend-api/admin/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ category_id: service.category_id, name: service.name, slug: service.slug, price: service.price, currency: service.currency, display_order: service.display_order, is_active: !service.is_active }),
      });
      if (response.status === 401) return router.replace("/admin/login");
      if (!response.ok) throw new Error(await readError(response, "Service status could not be changed."));
      await loadData();
      setMessage(`Service ${service.is_active ? "deactivated" : "activated"} successfully.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Service status could not be changed.");
    }
  }

  async function deleteService(service: Service) {
    if (!window.confirm(`Permanently delete ${service.name}? Deal item labels are preserved, but this cannot be undone.`)) return;
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/backend-api/admin/services/${service.id}`, { method: "DELETE", credentials: "include" });
      if (response.status === 401) return router.replace("/admin/login");
      if (!response.ok) throw new Error(await readError(response, "Service could not be deleted."));
      await loadData();
      if (viewing?.id === service.id) setViewing(null);
      setMessage("Service permanently deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Service could not be deleted.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f7f4] px-5 py-8 text-[#101c35] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-[#d8c8a6] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/admin" className="text-xs font-semibold tracking-[0.16em] text-[#98743b]">← BACK TO DASHBOARD</Link>
            <p className="mt-5 text-xs tracking-[0.22em] text-[#98743b]">CATALOG MANAGEMENT</p>
            <h1 className="mt-2 text-3xl font-semibold">Services</h1>
            <p className="mt-2 text-sm text-[#656565]">Manage regular salon services separately from promotional deals.</p>
          </div>
          <button type="button" onClick={() => { resetForm(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#101c35] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1b2d50] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#98743b]"><Plus size={17} aria-hidden="true" /> Add Service</button>
        </div>

        {(message || error) && <p className={`mt-5 text-sm ${error ? "text-red-700" : "text-green-700"}`} role={error ? "alert" : "status"}>{error ?? message}</p>}

        <section className="mt-7 border border-[#d8c8a6] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="service-form-heading">
          <h2 id="service-form-heading" className="text-xl font-semibold">{editingId ? "Edit service" : "Add service"}</h2>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Name<input required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 min-h-11 w-full border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /></label>
            <label className="text-sm font-medium">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={180} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="mt-2 min-h-11 w-full border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /></label>
            <label className="text-sm font-medium">Category<select required value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} className="mt-2 min-h-11 w-full border border-[#d8c8a6] bg-white px-3 outline-none focus:border-[#98743b]"><option value="" disabled>Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.is_active ? "" : " (Inactive)"}</option>)}</select></label>
            <label className="text-sm font-medium">Price (PKR)<input required min="0" step="0.01" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-2 min-h-11 w-full border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /></label>
            <label className="text-sm font-medium">Display order<input required min="0" type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: event.target.value })} className="mt-2 min-h-11 w-full border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /></label>
            <label className="flex min-h-11 items-center gap-3 self-end text-sm font-medium"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="size-4 accent-[#101c35]" /> Active service</label>
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row"><button type="submit" disabled={saving || categories.length === 0} className="min-h-11 bg-[#101c35] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : editingId ? "Save Changes" : "Add Service"}</button>{editingId && <button type="button" onClick={resetForm} className="min-h-11 border border-[#d8c8a6] px-5 py-3 text-sm font-semibold">Cancel</button>}</div>
          </form>
          {categories.length === 0 && !loading && <p className="mt-4 text-sm text-amber-700">Create a category before adding a service.</p>}
        </section>

        {viewing && <section className="mt-7 border border-[#d8c8a6] bg-[#101c35] p-5 text-white shadow-sm sm:p-7" aria-labelledby="service-details-heading"><div className="flex items-start justify-between gap-4"><div><p className="text-xs tracking-[0.2em] text-[#d8c8a6]">SERVICE DETAILS</p><h2 id="service-details-heading" className="mt-2 text-2xl font-semibold">{viewing.name}</h2></div><button type="button" onClick={() => setViewing(null)} className="min-h-11 border border-white/30 px-3 text-sm">Close</button></div><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-white/60">Category</dt><dd>{viewing.category_name}</dd></div><div><dt className="text-white/60">Price</dt><dd>{viewing.currency} {viewing.price}</dd></div><div><dt className="text-white/60">Slug</dt><dd>/{viewing.slug}</dd></div><div><dt className="text-white/60">Status</dt><dd>{viewing.is_active ? "Active" : "Inactive"}</dd></div></dl></section>}

        <section className="mt-8" aria-labelledby="service-list-heading">
          <div className="flex items-center justify-between gap-4"><div><h2 id="service-list-heading" className="text-xl font-semibold">Existing services</h2><p className="mt-1 text-sm text-[#656565]">All active and inactive services are included.</p></div><span className="shrink-0 text-sm text-[#656565]">{services.length} total</span></div>
          <div className="mt-5 grid gap-3 border border-[#d8c8a6] bg-white p-4 sm:grid-cols-2"><label className="text-sm font-medium">Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, slug, or category" className="mt-2 min-h-11 w-full border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /></label><label className="text-sm font-medium">Filter by category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="mt-2 min-h-11 w-full border border-[#d8c8a6] bg-white px-3 outline-none focus:border-[#98743b]"><option value="all">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>
          {loading ? <p className="mt-5 text-sm text-[#656565]">Loading services...</p> : filteredServices.length === 0 ? <p className="mt-5 border border-dashed border-[#d8c8a6] p-6 text-sm text-[#656565]">No matching services found.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2">{filteredServices.map((service) => <article key={service.id} className="border border-[#d8c8a6] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{service.name}</h3><p className="mt-1 text-sm text-[#656565]">{service.category_name} · {service.currency} {service.price}</p><p className="mt-1 text-xs text-[#656565]">/{service.slug} · Order {service.display_order}</p></div><span className={`shrink-0 border px-2 py-1 text-xs font-semibold ${service.is_active ? "border-green-200 text-green-700" : "border-[#d8c8a6] text-[#98743b]"}`}>{service.is_active ? "Active" : "Inactive"}</span></div><div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" onClick={() => setViewing(service)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#d8c8a6] px-3 py-2 text-sm font-semibold hover:bg-[#f8f7f4]"><Eye size={15} aria-hidden="true" /> View</button><button type="button" onClick={() => startEdit(service)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#d8c8a6] px-3 py-2 text-sm font-semibold hover:bg-[#f8f7f4]"><Pencil size={15} aria-hidden="true" /> Edit</button><button type="button" onClick={() => toggleService(service)} className="min-h-11 border border-[#98743b] px-3 py-2 text-sm font-semibold text-[#98743b] hover:bg-[#f8f7f4]">{service.is_active ? "Deactivate" : "Activate"}</button><button type="button" onClick={() => deleteService(service)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 size={15} aria-hidden="true" /> Delete</button></div></article>)}</div>}
        </section>
      </div>
    </main>
  );
}
