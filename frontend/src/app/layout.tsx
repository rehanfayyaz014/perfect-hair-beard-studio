import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Perfect Hair and Beard Studio | Bahria Town Phase 7",
    template: "%s | Perfect Hair and Beard Studio",
  },
  description:
    "Discover premium men's haircuts, beard grooming, hair colour and facial services at Perfect Hair and Beard Studio, Bahria Town Phase 7, Islamabad.",
  applicationName: "Perfect Hair and Beard Studio",
  metadataBase: new URL("https://example.com"),
  icons: {
    icon: [
      {
        url: "/favicon.png?v=20261018-4",
        type: "image/png",
        sizes: "768x810",
      },
    ],
    shortcut: "/favicon.png?v=20261018-4",
  },
  openGraph: {
    title: "Perfect Hair and Beard Studio",
    description:
      "Premium men's grooming, signature haircuts and beard care in Bahria Town Phase 7.",
    type: "website",
    locale: "en_PK",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
