"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Images, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type GalleryCategory = { id: number; name: string; slug: string; display_order: number; is_active: boolean };
type GalleryItem = {
  id: number;
  category_id: number;
  asset_path: string;
  title: string | null;
  caption: string | null;
  alt_text: string;
  display_order: number;
  is_published: boolean;
};

const apiBase = "/backend-api/admin/gallery";

export default function AdminGalleryPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [assetManifest, setAssetManifest] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [itemForm, setItemForm] = useState({ category_id: "", asset_path: "", title: "", caption: "", alt_text: "", display_order: "0", is_published: false });

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [categoryResponse, itemResponse, manifestResponse] = await Promise.all([
        fetch(`${apiBase}/categories`, { credentials: "include" }),
        fetch(`${apiBase}/items`, { credentials: "include" }),
        fetch("/gallery/manifest.json", { cache: "no-store" }),
      ]);
      if ([categoryResponse, itemResponse].some((response) => response.status === 401)) {
        router.replace("/admin/login");
        return;
      }
      if (!categoryResponse.ok || !itemResponse.ok) throw new Error("Gallery records could not be loaded.");
      setCategories((await categoryResponse.json()) as GalleryCategory[]);
      setItems((await itemResponse.json()) as GalleryItem[]);
      if (manifestResponse.ok) setAssetManifest((await manifestResponse.json()) as string[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gallery records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  // The page must fetch protected admin data after the client session is available.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void loadData(); }, []);

  const selectedCategory = useMemo(() => categories.find((category) => String(category.id) === itemForm.category_id), [categories, itemForm.category_id]);

  function resetItemForm() {
    setEditingItem(null);
    setItemForm({ category_id: categories[0] ? String(categories[0].id) : "", asset_path: "", title: "", caption: "", alt_text: "", display_order: "0", is_published: false });
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null); setError(null);
    const response = await fetch(`${apiBase}/categories`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: categoryName, slug: categorySlug, display_order: 0, is_active: true }) });
    if (response.status === 401) return router.replace("/admin/login");
    if (!response.ok) return setError((await response.json()).detail ?? "Gallery category could not be saved.");
    setCategoryName(""); setCategorySlug(""); setNotice("Gallery category saved."); await loadData();
  }

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null); setError(null);
    if (!itemForm.category_id || !itemForm.asset_path) return setError("Choose a category and a managed gallery asset.");
    const payload = { ...itemForm, category_id: Number(itemForm.category_id), display_order: Number(itemForm.display_order) };
    const url = editingItem ? `${apiBase}/items/${editingItem.id}` : `${apiBase}/items`;
    const response = await fetch(url, { method: editingItem ? "PATCH" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (response.status === 401) return router.replace("/admin/login");
    if (!response.ok) return setError((await response.json()).detail ?? "Gallery item could not be saved.");
    setNotice(editingItem ? "Gallery item updated." : "Gallery item saved."); resetItemForm(); await loadData();
  }

  async function removeItem(id: number) {
    if (!window.confirm("Delete this gallery metadata record? The image file will not be deleted.")) return;
    const response = await fetch(`${apiBase}/items/${id}`, { method: "DELETE", credentials: "include" });
    if (!response.ok) return setError("Gallery item could not be deleted.");
    setNotice("Gallery metadata deleted."); await loadData();
  }

  return (
    <main className="min-h-screen bg-[#f8f7f4] px-4 py-7 text-[#101c35] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <section className="border-b border-[#d8c8a6] pb-7">
          <p className="text-xs tracking-[0.22em] text-[#98743b]">GALLERY / OUR WORK</p>
          <h1 className="mt-3 text-3xl font-semibold">Manage gallery metadata</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#656565]">Photos are Git-managed static assets. To add a new photo, place it in <code>frontend/public/gallery/</code>, add its path to the checked-in manifest, commit, and deploy it before publishing the metadata record.</p>
        </section>

        {error && <p className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
        {notice && <p className="mt-5 border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">{notice}</p>}

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section className="border border-[#d8c8a6] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Categories</h2>
            <form className="mt-4 space-y-3" onSubmit={submitCategory}>
              <label className="block text-sm font-medium">Name<input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required className="mt-1 min-h-11 w-full border border-[#cdbd9b] px-3" placeholder="Salon" /></label>
              <label className="block text-sm font-medium">Slug<input value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="mt-1 min-h-11 w-full border border-[#cdbd9b] px-3" placeholder="salon" /></label>
              <button className="inline-flex min-h-11 items-center gap-2 bg-[#101c35] px-4 py-3 text-sm font-semibold text-white" type="submit"><Plus size={16} />Add category</button>
            </form>
            <div className="mt-6 space-y-2">
              {categories.map((category) => <div key={category.id} className="flex items-center justify-between border border-[#eee8dc] px-3 py-3 text-sm"><span>{category.name}</span><span className="text-xs text-[#98743b]">{category.is_active ? "Active" : "Inactive"}</span></div>)}
              {!loading && categories.length === 0 && <p className="text-sm text-[#656565]">No gallery categories yet. Create Salon and Our Work after the migration is applied.</p>}
            </div>
          </section>

          <section className="border border-[#d8c8a6] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Photo metadata</h2><p className="mt-1 text-sm text-[#656565]">No binary uploads or external URLs are accepted.</p></div><Images className="shrink-0 text-[#98743b]" aria-hidden="true" /></div>
            <form className="mt-5 space-y-3" onSubmit={submitItem}>
              <label className="block text-sm font-medium">Category<select value={itemForm.category_id} onChange={(event) => setItemForm({ ...itemForm, category_id: event.target.value })} required className="mt-1 min-h-11 w-full border border-[#cdbd9b] px-3"><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="block text-sm font-medium">Managed image<select value={itemForm.asset_path} onChange={(event) => setItemForm({ ...itemForm, asset_path: event.target.value })} required className="mt-1 min-h-11 w-full border border-[#cdbd9b] px-3"><option value="">Choose from manifest</option>{assetManifest.map((path) => <option key={path} value={path}>{path}</option>)}</select></label>
              {itemForm.asset_path && <div className="relative aspect-video overflow-hidden bg-[#101c35]"><Image src={`/${itemForm.asset_path}`} alt="Selected gallery preview" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /></div>}
              <label className="block text-sm font-medium">Alt text<input value={itemForm.alt_text} onChange={(event) => setItemForm({ ...itemForm, alt_text: event.target.value })} required className="mt-1 min-h-11 w-full border border-[#cdbd9b] px-3" /></label>
              <label className="block text-sm font-medium">Title (optional)<input value={itemForm.title} onChange={(event) => setItemForm({ ...itemForm, title: event.target.value })} className="mt-1 min-h-11 w-full border border-[#cdbd9b] px-3" /></label>
              <label className="block text-sm font-medium">Caption (optional)<textarea value={itemForm.caption} onChange={(event) => setItemForm({ ...itemForm, caption: event.target.value })} className="mt-1 min-h-20 w-full border border-[#cdbd9b] px-3 py-2" /></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Display order<input type="number" min="0" value={itemForm.display_order} onChange={(event) => setItemForm({ ...itemForm, display_order: event.target.value })} className="mt-1 min-h-11 w-full border border-[#cdbd9b] px-3" /></label><label className="flex min-h-11 items-center gap-2 pt-6 text-sm font-medium"><input type="checkbox" checked={itemForm.is_published} onChange={(event) => setItemForm({ ...itemForm, is_published: event.target.checked })} />Publish</label></div>
              <div className="flex flex-wrap gap-3"><button className="inline-flex min-h-11 items-center gap-2 bg-[#101c35] px-4 py-3 text-sm font-semibold text-white" type="submit"><Plus size={16} />{editingItem ? "Update item" : "Add item"}</button>{editingItem && <button type="button" onClick={resetItemForm} className="min-h-11 border border-[#cdbd9b] px-4 py-3 text-sm">Cancel</button>}</div>
              {selectedCategory && <p className="text-xs text-[#656565]">Selected category: {selectedCategory.name}</p>}
            </form>
          </section>
        </div>

        <section className="mt-6 border border-[#d8c8a6] bg-white p-5 shadow-sm"><h2 className="text-xl font-semibold">Registered photos ({items.length})</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <article key={item.id} className="overflow-hidden border border-[#eee8dc]"><div className="relative aspect-video bg-[#101c35]"><Image src={`/${item.asset_path}`} alt={item.alt_text} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" /></div><div className="space-y-2 p-4"><h3 className="font-semibold">{item.title || item.asset_path}</h3><p className="text-xs text-[#656565]">{item.is_published ? "Published" : "Unpublished"} · Order {item.display_order}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setEditingItem(item); setItemForm({ category_id: String(item.category_id), asset_path: item.asset_path, title: item.title ?? "", caption: item.caption ?? "", alt_text: item.alt_text, display_order: String(item.display_order), is_published: item.is_published }); }} className="inline-flex min-h-10 items-center gap-2 border border-[#98743b] px-3 py-2 text-xs font-semibold"><Pencil size={14} />Edit</button><button type="button" onClick={() => void removeItem(item.id)} className="inline-flex min-h-10 items-center gap-2 border border-red-300 px-3 py-2 text-xs font-semibold text-red-800"><Trash2 size={14} />Delete</button></div></div></article>)}</div>{!loading && items.length === 0 && <p className="mt-4 text-sm text-[#656565]">No gallery metadata records yet.</p>}</section>
      </div>
    </main>
  );
}
