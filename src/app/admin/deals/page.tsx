"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Service = { id: number; name: string; slug: string; price: string | number; is_active: boolean };
type DealItem = { id: number | null; label: string; service_id: number | null; display_order: number };
type Deal = { id: number; name: string; slug: string; price: string | number; currency: string; display_order: number; is_active: boolean; items: DealItem[] };
type DealForm = { name: string; slug: string; price: string; currency: string; display_order: string; is_active: boolean; items: DealItem[] };

const emptyForm: DealForm = { name: "", slug: "", price: "", currency: "PKR", display_order: "0", is_active: true, items: [{ id: null, label: "", service_id: null, display_order: 0 }] };

async function readError(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as { detail?: string } | null;
  return result?.detail ?? fallback;
}

function imageForSlug(slug: string) {
  const images: Record<string, string> = {
    "gentlemans-complete": "/images/Gentleman's Complete.png",
    "hair-refresh": "/images/Hair Refresh.png",
    "beard-refresh": "/images/Beard Refresh.jpg",
    "beard-and-glow": "/images/Beard & Glow.jpg",
    "facial-luxe": "/images/Facial Luxe.jpg",
  };
  return images[slug];
}

export default function AdminDealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<DealForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [dealsResponse, servicesResponse] = await Promise.all([
      fetch("/backend-api/admin/deals", { credentials: "include" }),
      fetch("/backend-api/admin/services", { credentials: "include" }),
    ]);
    if (dealsResponse.status === 401 || servicesResponse.status === 401) return router.replace("/admin/login");
    if (!dealsResponse.ok) throw new Error(await readError(dealsResponse, "Deals could not be loaded."));
    if (!servicesResponse.ok) throw new Error(await readError(servicesResponse, "Services could not be loaded."));
    setDeals((await dealsResponse.json()) as Deal[]);
    setServices((await servicesResponse.json()) as Service[]);
  }, [router]);

  useEffect(() => {
    void Promise.resolve()
      .then(loadData)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Deals could not be loaded."))
      .finally(() => setLoading(false));
  }, [loadData]);

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, items: [{ id: null, label: "", service_id: null, display_order: 0 }] });
  }

  function startEdit(deal: Deal) {
    setEditingId(deal.id);
    setViewing(null);
    setForm({ name: deal.name, slug: deal.slug, price: String(deal.price), currency: deal.currency, display_order: String(deal.display_order), is_active: deal.is_active, items: deal.items.map((item) => ({ ...item })) });
    setMessage(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateItem(index: number, changes: Partial<DealItem>) {
    setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }));
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, { id: null, label: "", service_id: null, display_order: current.items.length }] }));
  }

  function removeItem(index: number) {
    setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, display_order: itemIndex })) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    if (form.items.some((item) => !item.label.trim())) {
      setError("Every included item needs a label.");
      setSaving(false);
      return;
    }
    const endpoint = editingId ? `/backend-api/admin/deals/${editingId}` : "/backend-api/admin/deals";
    try {
      const response = await fetch(endpoint, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, credentials: "include", body: JSON.stringify({ ...form, price: form.price, display_order: Number(form.display_order), items: form.items.map((item, index) => ({ ...item, display_order: index })) }) });
      if (response.status === 401) return router.replace("/admin/login");
      if (!response.ok) throw new Error(await readError(response, "Deal could not be saved."));
      await loadData();
      setMessage(editingId ? "Deal updated successfully." : "Deal added successfully.");
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Deal could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDeal(deal: Deal) {
    setError(null); setMessage(null);
    try {
      const response = await fetch(`/backend-api/admin/deals/${deal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Accept: "application/json" }, credentials: "include", body: JSON.stringify({ name: deal.name, slug: deal.slug, price: deal.price, currency: deal.currency, display_order: deal.display_order, is_active: !deal.is_active, items: deal.items }) });
      if (response.status === 401) return router.replace("/admin/login");
      if (!response.ok) throw new Error(await readError(response, "Deal status could not be changed."));
      await loadData(); setMessage(`Deal ${deal.is_active ? "deactivated" : "activated"} successfully.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Deal status could not be changed."); }
  }

  async function deleteDeal(deal: Deal) {
    if (!window.confirm(`Permanently delete ${deal.name} and its included items?`)) return;
    setError(null); setMessage(null);
    try {
      const response = await fetch(`/backend-api/admin/deals/${deal.id}`, { method: "DELETE", credentials: "include" });
      if (response.status === 401) return router.replace("/admin/login");
      if (!response.ok) throw new Error(await readError(response, "Deal could not be deleted."));
      await loadData(); if (viewing?.id === deal.id) setViewing(null); setMessage("Deal permanently deleted.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Deal could not be deleted."); }
  }

  return (
    <main className="min-h-screen bg-[#f8f7f4] px-5 py-8 text-[#101c35] sm:px-8 sm:py-10"><div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 border-b border-[#d8c8a6] pb-7 sm:flex-row sm:items-end sm:justify-between"><div><Link href="/admin" className="text-xs font-semibold tracking-[0.16em] text-[#98743b]">← BACK TO DASHBOARD</Link><p className="mt-5 text-xs tracking-[0.22em] text-[#98743b]">CATALOG MANAGEMENT</p><h1 className="mt-2 text-3xl font-semibold">Deals</h1><p className="mt-2 text-sm text-[#656565]">Manage promotional packages and their included items separately from regular services.</p></div><button type="button" onClick={() => { resetForm(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#101c35] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1b2d50]"><Plus size={17} aria-hidden="true" /> Add Deal</button></div>
      {(message || error) && <p className={`mt-5 text-sm ${error ? "text-red-700" : "text-green-700"}`} role={error ? "alert" : "status"}>{error ?? message}</p>}
      <section className="mt-7 border border-[#d8c8a6] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="deal-form-heading"><h2 id="deal-form-heading" className="text-xl font-semibold">{editingId ? "Edit deal" : "Add deal"}</h2><div className="relative mt-5 aspect-[4/3] max-w-sm overflow-hidden border border-[#d8c8a6] bg-[#202e47]">{imageForSlug(form.slug) ? <Image src={imageForSlug(form.slug)!} alt="Existing deal artwork preview" fill sizes="(max-width: 640px) 100vw, 384px" className="object-cover" /> : <div className="flex h-full items-center justify-center px-6 text-center text-xs font-semibold tracking-[0.14em] text-[#d9b879]">DEAL IMAGE PLACEHOLDER</div>}</div><p className="mt-2 text-xs text-[#656565]">Visual placeholder only. Images are configured in code and are not saved by this form.</p><form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Deal name<input required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 min-h-11 w-full border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /></label><label className="text-sm font-medium">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={180} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="mt-2 min-h-11 w-full border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /></label><label className="text-sm font-medium">Price (PKR)<input required min="0" step="0.01" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-2 min-h-11 w-full border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /></label><label className="text-sm font-medium">Display order<input required min="0" type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: event.target.value })} className="mt-2 min-h-11 w-full border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /></label><label className="flex min-h-11 items-center gap-3 self-end text-sm font-medium"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="size-4 accent-[#101c35]" /> Active deal</label><div className="sm:col-span-2"><p className="text-sm font-semibold">Included items</p><div className="mt-3 space-y-3">{form.items.map((item, index) => <div key={item.id ?? `new-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input aria-label={`Included item ${index + 1} label`} required maxLength={200} value={item.label} placeholder="Displayed item label" onChange={(event) => updateItem(index, { label: event.target.value })} className="min-h-11 border border-[#d8c8a6] px-3 outline-none focus:border-[#98743b]" /><select aria-label={`Linked service for item ${index + 1}`} value={item.service_id ?? ""} onChange={(event) => updateItem(index, { service_id: event.target.value ? Number(event.target.value) : null })} className="min-h-11 border border-[#d8c8a6] bg-white px-3 outline-none focus:border-[#98743b]"><option value="">Label only</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}{service.is_active ? "" : " (Inactive)"}</option>)}</select><button type="button" aria-label={`Remove included item ${index + 1}`} onClick={() => removeItem(index)} disabled={form.items.length === 1} className="inline-flex min-h-11 items-center justify-center border border-red-200 px-3 text-red-700 disabled:opacity-40"><X size={16} aria-hidden="true" /></button></div>)}</div><button type="button" onClick={addItem} className="mt-3 min-h-11 border border-[#98743b] px-4 text-sm font-semibold text-[#98743b]">Add included item</button></div><div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row"><button type="submit" disabled={saving} className="min-h-11 bg-[#101c35] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : editingId ? "Save Changes" : "Add Deal"}</button>{editingId && <button type="button" onClick={resetForm} className="min-h-11 border border-[#d8c8a6] px-5 py-3 text-sm font-semibold">Cancel</button>}</div></form></section>
      <section className="mt-8" aria-labelledby="deal-list-heading"><div className="flex items-center justify-between gap-4"><div><h2 id="deal-list-heading" className="text-xl font-semibold">Existing deals</h2><p className="mt-1 text-sm text-[#656565]">All active and inactive deals are included.</p></div><span className="shrink-0 text-sm text-[#656565]">{deals.length} total</span></div>{loading ? <p className="mt-5 text-sm text-[#656565]">Loading deals...</p> : deals.length === 0 ? <p className="mt-5 border border-dashed border-[#d8c8a6] p-6 text-sm text-[#656565]">No deals found.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2">{deals.map((deal) => <article key={deal.id} className="flex flex-col overflow-hidden border border-[#d8c8a6] bg-white shadow-sm"><div className="relative aspect-[4/3] overflow-hidden bg-[#202e47]">{imageForSlug(deal.slug) ? <Image src={imageForSlug(deal.slug)!} alt="Deal artwork" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /> : <div className="flex h-full items-center justify-center px-6 text-center text-xs font-semibold tracking-[0.14em] text-[#d9b879]">DEAL IMAGE PLACEHOLDER</div>}</div><div className="flex flex-1 flex-col p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{deal.name}</h3><p className="mt-1 text-sm text-[#8b6a36]">{deal.currency} {deal.price}</p><p className="mt-1 text-xs text-[#656565]">/{deal.slug} · Order {deal.display_order}</p></div><span className={`shrink-0 border px-2 py-1 text-xs font-semibold ${deal.is_active ? "border-green-200 text-green-700" : "border-[#d8c8a6] text-[#98743b]"}`}>{deal.is_active ? "Active" : "Inactive"}</span></div><ul className="mt-4 space-y-1 text-sm text-[#656565]">{deal.items.map((item) => <li key={item.id ?? item.label}>· {item.label}</li>)}</ul><div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" onClick={() => setViewing(deal)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#d8c8a6] px-3 text-sm font-semibold"><Eye size={15} aria-hidden="true" /> View</button><button type="button" onClick={() => startEdit(deal)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#d8c8a6] px-3 text-sm font-semibold"><Pencil size={15} aria-hidden="true" /> Edit</button><button type="button" onClick={() => toggleDeal(deal)} className="min-h-11 border border-[#98743b] px-3 text-sm font-semibold text-[#98743b]">{deal.is_active ? "Deactivate" : "Activate"}</button><button type="button" onClick={() => deleteDeal(deal)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-red-200 px-3 text-sm font-semibold text-red-700"><Trash2 size={15} aria-hidden="true" /> Delete</button></div></div></article>)}</div>}</section>
      {viewing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101c35]/70 px-5 py-8"><section role="dialog" aria-modal="true" aria-labelledby="deal-view-heading" className="max-h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs tracking-[0.2em] text-[#98743b]">DEAL DETAILS</p><h2 id="deal-view-heading" className="mt-2 text-2xl font-semibold">{viewing.name}</h2></div><button type="button" onClick={() => setViewing(null)} aria-label="Close deal details" className="min-h-11 border border-[#d8c8a6] px-3"><X size={17} /></button></div><p className="mt-4 text-lg font-semibold text-[#8b6a36]">{viewing.currency} {viewing.price}</p><ul className="mt-5 space-y-2 text-sm text-[#656565]">{viewing.items.map((item) => <li key={item.id ?? item.label}>· {item.label}</li>)}</ul></section></div>}
    </div></main>
  );
}
