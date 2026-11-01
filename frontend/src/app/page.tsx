"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  Clock,
  Images,
  MapPin,
  Menu,
  Phone,
  Scissors,
  Sparkles,
  Star,
  X,
} from "lucide-react";

type CatalogCategory = {
  id: number;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
};

type CatalogService = {
  id: number;
  category_id: number;
  category_slug: string;
  name: string;
  slug: string;
  price: number | string;
  currency: string;
  display_order: number;
  is_active: boolean;
};

type CatalogDeal = {
  id: number;
  name: string;
  slug: string;
  price: number | string;
  currency: string;
  display_order: number;
  is_active: boolean;
};

type CatalogDealItem = {
  id: number;
  deal_id: number;
  deal_slug: string;
  service_id: number | null;
  label: string;
  display_order: number;
};

type GalleryItem = {
  id: number;
  asset_path: string;
  title: string | null;
  caption: string | null;
  alt_text: string;
  display_order: number;
  category: { id: number; name: GalleryCategory; slug: string; display_order: number };
};

type CatalogData = {
  categories: CatalogCategory[];
  services: CatalogService[];
  deals: CatalogDeal[];
  dealItems: CatalogDealItem[];
};

const catalogApiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? "/backend-api"
).replace(/\/$/, "");

const dealImageDescriptions: Record<string, string> = {
  "gentlemans-complete": "Man receiving a complete haircut and beard grooming treatment",
  "hair-refresh": "Barber styling a man's haircut",
  "beard-refresh": "Barber shaping a man's beard",
  "beard-and-glow": "Man receiving a facial skincare treatment with a mask",
  "facial-luxe": "Man receiving a premium facial treatment",
};

const dealImageSources: Record<string, string> = {
  "gentlemans-complete": "/images/Gentleman's Complete.png",
  "hair-refresh": "/images/Hair Refresh.png",
  "beard-refresh": "/images/Beard Refresh.jpg",
  "beard-and-glow": "/images/Beard & Glow.jpg",
  "facial-luxe": "/images/Facial Luxe.jpg",
};

const formatPrice = (price: number | string) =>
  Number(price).toLocaleString("en-PK");

const galleryCategories = ["Salon", "Our Work"] as const;
type GalleryCategory = (typeof galleryCategories)[number];

const localSalonGallery: GalleryItem[] = [
  {
    id: 1,
    asset_path: "images/Updates Salon Pics/img_1.png",
    title: "Grooming stations",
    caption: "A view across the studio's grooming stations and mirrors.",
    alt_text: "Men's grooming stations with barber chairs, mirrors, and product shelves",
    display_order: 1,
    category: { id: 1, name: "Salon", slug: "salon", display_order: 1 },
  },
  {
    id: 2,
    asset_path: "images/Updates Salon Pics/img_2.png",
    title: "Barber chairs and stations",
    caption: "The studio's bright, welcoming grooming area.",
    alt_text: "Barber chairs and grooming equipment inside the salon",
    display_order: 2,
    category: { id: 1, name: "Salon", slug: "salon", display_order: 1 },
  },
  {
    id: 3,
    asset_path: "images/Updates Salon Pics/img_3.png",
    title: "Studio entrance",
    caption: "The Perfect Hair and Beard Studio entrance and signboard.",
    alt_text: "Exterior entrance of Perfect Hair and Beard Studio with its signboard",
    display_order: 3,
    category: { id: 1, name: "Salon", slug: "salon", display_order: 1 },
  },
  {
    id: 4,
    asset_path: "images/Updates Salon Pics/img_4.png",
    title: "Waiting lounge",
    caption: "A comfortable waiting area inside the studio.",
    alt_text: "Comfortable waiting lounge with patterned walls and upholstered seating",
    display_order: 4,
    category: { id: 1, name: "Salon", slug: "salon", display_order: 1 },
  },
  {
    id: 5,
    asset_path: "images/Updates Salon Pics/img_5.png",
    title: "Signature barber chair",
    caption: "A detailed view of a studio grooming station.",
    alt_text: "Leather barber chair, mirror, and grooming station inside the salon",
    display_order: 5,
    category: { id: 1, name: "Salon", slug: "salon", display_order: 1 },
  },
  {
    id: 6,
    asset_path: "images/Updates Salon Pics/img_6.png",
    title: "Product and styling station",
    caption: "Salon products arranged around a barber station.",
    alt_text: "Barber chair with salon products and styling tools arranged on shelves",
    display_order: 6,
    category: { id: 1, name: "Salon", slug: "salon", display_order: 1 },
  },
];

const reviews: Array<{ name: string; quote: string; rating: number }> = [];

const whatsappBookingUrl = (message: string) =>
  "https://wa.me/923499689783?text=" + encodeURIComponent(message);

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryCategory, setGalleryCategory] = useState<GalleryCategory>("Salon");
  const [galleryItems] = useState<GalleryItem[]>(localSalonGallery);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<GalleryItem | null>(null);
  const [catalog, setCatalog] = useState<CatalogData>({
    categories: [],
    services: [],
    deals: [],
    dealItems: [],
  });
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);

    try {
      const responses = await Promise.all(
        ["categories", "services", "deals", "deal-items"].map((resource) =>
          fetch(`${catalogApiBaseUrl}/catalog/${resource}`, {
            headers: { Accept: "application/json" },
          }),
        ),
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error("Catalog API request failed.");
      }

      const [categories, services, deals, dealItems] = await Promise.all(
        responses.map((response) => response.json()),
      );

      setCatalog({ categories, services, deals, dealItems });
    } catch {
      setCatalogError(
        "Services and deals are temporarily unavailable. Please try again shortly or contact the studio.",
      );
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadCatalog);
  }, [loadCatalog]);

  const serviceCategories = useMemo(
    () =>
      catalog.categories.map((category) => ({
        ...category,
        services: catalog.services.filter(
          (service) => service.category_slug === category.slug,
        ),
      })),
    [catalog.categories, catalog.services],
  );

  const deals = useMemo(
    () =>
      catalog.deals.map((deal) => ({
        ...deal,
        services: catalog.dealItems
          .filter((item) => item.deal_slug === deal.slug)
          .sort((first, second) => first.display_order - second.display_order)
          .map((item) => item.label),
        imageDescription:
          dealImageDescriptions[deal.slug] ?? "Deal image coming soon",
      })),
    [catalog.dealItems, catalog.deals],
  );

  const currentYear = useSyncExternalStore(
    () => () => {},
    () => new Date().getFullYear(),
    () => null,
  );

  const whatsappUrl = whatsappBookingUrl(
    "Assalam-o-Alaikum! I would like to enquire about booking an appointment at Perfect Hair and Beard Studio."
  );

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-[#101c35]">
      <div className="bg-[#101c35] px-4 py-2 text-center text-xs tracking-wide text-white">
        <span className="text-[#d9b879]">OPEN DAILY</span>
        {" · "}08:00 AM – 09:00 PM
      </div>

      <header className="sticky top-0 z-50 border-b border-[#e8e3d9] bg-[#f8f7f4]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8">
          <a href="#home" className="flex items-center gap-3">
          <Image
            src="/brand/logo.png"
            alt="Perfect Hair and Beard Studio logo"
            width={1640}
            height={656}
            className="h-11 w-auto max-w-[52vw] object-contain sm:h-12 sm:max-w-[180px]"
          />

          </a>

          <nav aria-label="Primary navigation" className="hidden items-center gap-7 text-sm md:flex">
            {["Home", "Services", "Deals", "Gallery", "Reviews", "Contact"].map(
              (item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="rounded-sm transition-colors hover:text-[#a17b3f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9b879]"
                >
                  {item}
                </a>
              )
            )}
          </nav>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-sm bg-[#101c35] px-4 py-2 text-xs font-semibold tracking-wide text-white transition hover:bg-[#263b60] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9b879] md:inline-flex"
          >
            BOOK YOUR VISIT ↗
          </a>

          <button
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-sm p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#98743b] md:hidden"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuOpen && (
          <nav id="mobile-navigation" aria-label="Mobile navigation" className="flex flex-col border-t border-[#e8e3d9] px-5 py-3 sm:px-6 md:hidden">
            {["Home", "Services", "Deals", "Gallery", "Reviews", "Contact"].map(
              (item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-sm border-b border-[#e8e3d9] py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#98743b]"
                >
                  {item}
                </a>
              )
            )}
          </nav>
        )}
      </header>

      <section
        id="home"
        className="relative overflow-hidden bg-[#101c35] text-white"
      >
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-[#d9b879]/20" />
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full border border-[#d9b879]/20" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:gap-12 sm:px-6 sm:py-20 md:grid-cols-2 md:py-28 lg:px-8 lg:py-32">
          <div>
            <div className="mb-7 flex items-center gap-3 text-xs tracking-[0.25em] text-[#d9b879]">
              <span className="h-px w-10 bg-[#d9b879]" />
              PREMIUM MEN&apos;S GROOMING
            </div>

            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
              Your Style.
              <br />
              Your <span className="font-serif italic text-[#d9b879]">Signature.</span>
            </h1>

            <p className="mt-7 max-w-lg text-base leading-7 text-white/70">
              Experience the art of modern grooming at Perfect Hair and Beard
              Studio. Precision cuts, refined style, and attention to every
              detail.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 rounded-sm bg-[#d9b879] px-5 py-4 text-sm font-semibold text-[#101c35] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9b879] sm:px-6"
              >
                Book on WhatsApp <ArrowRight size={17} />
              </a>

              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-sm border border-white/30 px-5 py-4 text-sm transition hover:border-[#d9b879] hover:text-[#d9b879] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9b879] sm:px-6"
              >
                Explore Services
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-7 border-t border-white/15 pt-7">
              <div>
                <p className="text-xl font-semibold">Expert</p>
                <p className="mt-1 text-xs text-white/55">Grooming Care</p>
              </div>
              <div>
                <p className="text-xl font-semibold">Premium</p>
                <p className="mt-1 text-xs text-white/55">Products & Style</p>
              </div>
              <div>
                <p className="text-xl font-semibold">Your Style</p>
                <p className="mt-1 text-xs text-white/55">Our Priority</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-4 border border-[#d9b879]/30" />
            <div className="relative flex aspect-[4/5] flex-col items-center justify-center overflow-hidden bg-[#101c35] p-8 text-center">
              <Image
                src="/images/hero.jpg"
                alt="Professional barber providing premium grooming in an upscale barbershop"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1222]/90 via-[#101c35]/35 to-[#101c35]/10" />
              <div className="absolute inset-4 border border-white/10" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#d9b879]/60 text-[#d9b879]">
                <svg
                  aria-hidden="true"
                  className="scissors-motion h-12 w-12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="5.5" cy="6" r="2.7" />
                  <circle cx="5.5" cy="18" r="2.7" />
                  <g className="scissors-blade scissors-blade-upper">
                    <path d="M7.7 8.1 11.3 11.6" />
                    <path d="M12 11.4 20 4" />
                  </g>
                  <g className="scissors-blade scissors-blade-lower">
                    <path d="M7.7 15.9 11.3 12.4" />
                    <path d="M12 12.6 20 20" />
                  </g>
                  <circle cx="12" cy="12" r="1.1" />
                </svg>
              </div>
              <p className="relative mt-8 text-xs tracking-[0.35em] text-[#d9b879]">
                THE ART OF GROOMING
              </p>
              <h2 className="relative mt-4 font-serif text-4xl italic">
                Style with Presence
              </h2>
              <p className="relative mt-4 max-w-xs text-sm leading-6 text-white/60">
                Precision grooming for a look that feels as confident as you
                are.
              </p>
              <Sparkles className="absolute bottom-10 right-10 text-[#d9b879]/60" />
            </div>
          </div>
        </div>
      </section>

      <section id="deals" className="px-5 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs tracking-[0.22em] text-[#98743b]">
              SIGNATURE DEALS
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Grooming, thoughtfully combined.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#656565]">
              Choose a focused grooming package and book your visit directly on
              WhatsApp.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {catalogLoading ? (
              <p className="border border-[#d8c8a6] bg-white p-6 text-sm text-[#656565]">
                Loading current deals...
              </p>
            ) : catalogError ? (
              <div className="border border-[#d8c8a6] bg-white p-6 text-sm text-[#656565] md:col-span-2 xl:col-span-3">
                <p>{catalogError}</p>
                <button
                  type="button"
                  onClick={() => void loadCatalog()}
                  className="mt-4 rounded-sm bg-[#101c35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#263b60] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9b879]"
                >
                  Try Again
                </button>
              </div>
            ) : deals.length === 0 ? (
              <p className="border border-[#d8c8a6] bg-white p-6 text-sm text-[#656565] md:col-span-2 xl:col-span-3">
                No deals are currently available.
              </p>
            ) : deals.map((deal) => (
              <article
                key={deal.slug}
                className="flex flex-col overflow-hidden border border-[#d8c8a6] bg-white"
              >
                <div className="relative aspect-[4/3] overflow-hidden border-b border-[#d8c8a6] bg-[#202e47]">
                  {dealImageSources[deal.slug] ? (
                    <Image
                      src={dealImageSources[deal.slug]}
                      alt={deal.imageDescription}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-xs font-semibold tracking-[0.14em] text-[#d9b879]">
                      DEAL IMAGE COMING SOON
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-semibold">{deal.name}</h3>
                    <p className="shrink-0 text-lg font-semibold text-[#8b6a36]">
                      Rs. {formatPrice(deal.price)}
                    </p>
                  </div>
                  <ul className="mt-5 space-y-2 text-sm leading-5 text-[#656565]">
                    {deal.services.map((service) => (
                      <li key={service} className="flex gap-2">
                        <span className="text-[#98743b]">·</span>
                        <span>{service}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={whatsappBookingUrl(
                      `Assalam-o-Alaikum! I would like to book the ${deal.name} deal for Rs. ${formatPrice(deal.price)}. Included services: ${deal.services.join(", ")}. Please let me know availability.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-sm bg-[#101c35] px-5 py-3 pt-6 text-sm font-semibold text-white hover:bg-[#263b60] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9b879]"
                  >
                    Book Now <ArrowRight size={16} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs tracking-[0.22em] text-[#98743b]">
              THE GROOMING MENU
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Services & Pricing
            </h2>
            <p className="mt-3 text-sm text-[#6b6b6b]">
              Quality grooming, with clear and transparent pricing.
            </p>
          </div>
          <a href="#contact" className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#98743b]">
            Visit Our Studio <ArrowRight size={16} />
          </a>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {catalogLoading ? (
            <p className="border border-[#e7e1d7] bg-white p-6 text-sm text-[#656565] md:col-span-2">
              Loading current services...
            </p>
          ) : catalogError ? (
            <div className="border border-[#e7e1d7] bg-white p-6 text-sm text-[#656565] md:col-span-2">
              <p>{catalogError}</p>
              <button
                type="button"
                onClick={() => void loadCatalog()}
                className="mt-4 rounded-sm bg-[#101c35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#263b60] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9b879]"
              >
                Try Again
              </button>
            </div>
          ) : serviceCategories.length === 0 ? (
            <p className="border border-[#e7e1d7] bg-white p-6 text-sm text-[#656565] md:col-span-2">
              No services are currently available.
            </p>
          ) : serviceCategories.map((category) => (
            <article
              key={category.slug}
              className="border border-[#e7e1d7] bg-white p-6"
            >
              <div className="flex items-center gap-3 border-b border-[#e7e1d7] pb-4">
                <Scissors size={20} className="text-[#98743b]" />
                <h3 className="text-xl font-semibold">{category.name}</h3>
              </div>
              <div className="divide-y divide-[#eee9df]">
                {category.services.map((service) => (
                  <div
                    key={service.slug}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4"
                  >
                    <span className="text-sm font-medium">{service.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-[#8b6a36]">
                        Rs. {formatPrice(service.price)}
                      </span>
                      <a
                        href={whatsappBookingUrl(
                          `Assalam-o-Alaikum! I would like to enquire about ${service.name} (Rs. ${formatPrice(service.price)}). Please let me know availability.`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Enquire about ${service.name} on WhatsApp`}
                        className="rounded-sm text-xs text-[#8b6a36] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#98743b]"
                      >
                        Enquire
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="gallery" className="bg-[#eeebe4] px-5 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs tracking-[0.22em] text-[#98743b]">
              THE STUDIO JOURNAL
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Gallery
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#656565]">
              A visual look at our studio, entrance, waiting area, and grooming
              stations.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap gap-3" aria-label="Gallery categories">
            {galleryCategories.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={galleryCategory === category}
                onClick={() => setGalleryCategory(category)}
                className={`rounded-sm border px-4 py-2.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#98743b] ${
                  galleryCategory === category
                    ? "border-[#101c35] bg-[#101c35] text-white"
                    : "border-[#cdbd9b] bg-white text-[#101c35] hover:border-[#98743b]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {galleryItems.filter((item) => item.category.name === galleryCategory).length === 0 ? (
            <div className="mt-6 flex min-h-64 flex-col items-center justify-center border border-dashed border-[#cdbd9b] bg-white px-6 py-12 text-center">
              <Images size={32} className="text-[#98743b]" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">
                {galleryCategory} photos coming soon
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#656565]">
                Verified photos for this category will be added here when they
                are available.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {galleryItems.filter((item) => item.category.name === galleryCategory).map((item) => (
                <button key={item.id} type="button" className="group relative aspect-square overflow-hidden bg-white text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#98743b]" onClick={() => setSelectedGalleryItem(item)} aria-label={`Open ${item.alt_text}`}>
                  <Image src={`/${item.asset_path}`} alt={item.alt_text} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-300 group-hover:scale-105" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedGalleryItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101c35]/90 p-4" role="dialog" aria-modal="true" aria-label={selectedGalleryItem.alt_text}>
          <button type="button" onClick={() => setSelectedGalleryItem(null)} className="absolute right-4 top-4 rounded-sm p-2 text-white focus-visible:outline-2 focus-visible:outline-[#d9b879]" aria-label="Close gallery photo">
            <X size={28} />
          </button>
          <div className="relative h-[75vh] w-full max-w-4xl">
            <Image src={`/${selectedGalleryItem.asset_path}`} alt={selectedGalleryItem.alt_text} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}

      <section id="reviews" className="px-5 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs tracking-[0.22em] text-[#98743b]">
              CLIENT FEEDBACK
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Reviews
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#656565]">
              See what customers are saying on Google, or share your own
              experience after your visit.
            </p>
          </div>

          {reviews.length === 0 ? (
            <div className="mt-7 flex flex-col items-start gap-6 border border-[#d8c8a6] bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex gap-4">
                <Star size={24} className="mt-1 shrink-0 text-[#98743b]" aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-semibold">Your review matters</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#656565]">
                    Verified customer reviews will appear here in a future
                    update. For now, visit Google to read existing reviews or
                    leave your feedback.
                  </p>
                </div>
              </div>
              <a
                href="https://g.page/r/CfycSQJ6zTiMEAE/review"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#101c35] px-5 py-3 text-sm font-semibold text-white hover:bg-[#263b60] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9b879] sm:w-auto"
              >
                View or Leave a Review <ArrowRight size={16} />
              </a>
            </div>
          ) : (
            <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <article key={review.name} className="border border-[#e7e1d7] bg-white p-6">
                  <p className="text-sm leading-6 text-[#656565]">{review.quote}</p>
                  <p className="mt-5 text-sm font-semibold">{review.name}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#eeebe4] px-5 py-12 sm:px-6 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          <div className="flex gap-4">
            <Clock className="shrink-0 text-[#98743b]" />
            <div>
              <h3 className="font-semibold">Opening Hours</h3>
              <p className="mt-2 text-sm text-[#656565]">
                Everyday · 08:00 AM – 09:00 PM
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <MapPin className="shrink-0 text-[#98743b]" />
            <div>
              <h3 className="font-semibold">Visit Our Studio</h3>
              <p className="mt-2 text-sm leading-6 text-[#656565]">
                Shop No. 10-C, F Bahria Expy, Near Rasheed Sweets, Phase 7,
                Sector F, Bahria Town, Islamabad, 46620
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Phone className="shrink-0 text-[#98743b]" />
            <div>
              <h3 className="font-semibold">Get in Touch</h3>
              <a href="tel:03230753944" className="mt-2 block rounded-sm text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#98743b]">
                0323 0753944
              </a>
              <a href="https://wa.me/923499689783" target="_blank" rel="noreferrer" className="mt-1 block rounded-sm text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#98743b]">
                WhatsApp: 0349 9689783
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-[#101c35] px-5 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold tracking-[0.12em]">
              PERFECT HAIR AND BEARD STUDIO
            </p>
            <p className="mt-2 text-sm text-white/60">
              Refined grooming. Signature style.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-white/75">
            <a
              href="https://www.facebook.com/share/19n91wRysC/"
              target="_blank"
              rel="noreferrer"
              className="rounded-sm hover:text-[#d9b879] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9b879]"
            >
              Facebook
            </a>
            <a
              href="https://share.google/9AZG6tKEgZzGzbcvg?utm_source=chatgpt.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-sm hover:text-[#d9b879] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9b879]"
            >
              Google Maps
            </a>
            <a
              href="https://g.page/r/CfycSQJ6zTiMEAE/review"
              target="_blank"
              rel="noreferrer"
              className="rounded-sm hover:text-[#d9b879] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9b879]"
            >
              Write a Review <Star size={13} className="ml-1 inline" />
            </a>
            <a
              href="/admin/login"
              className="rounded-sm hover:text-[#d9b879] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9b879]"
            >
              Admin Login
            </a>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-white/15 pt-5 text-xs text-white/60">
          © {currentYear ?? ""} Perfect Hair and Beard Studio. All rights reserved.
        </div>
      </footer>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Book on WhatsApp"
        className="fixed bottom-4 right-4 z-40 inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-sm border border-[#d9b879] bg-[#101c35] px-3 py-3 text-xs font-semibold text-white shadow-xl transition hover:bg-[#263b60] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9b879] sm:bottom-5 sm:right-5 sm:px-4 sm:text-sm"
      >
        <Phone size={17} /> WhatsApp Booking
      </a>
    </main>
  );
}
