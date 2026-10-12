import type { Metadata } from 'next';
// fonts: system stacks (next/font removed — was crashing the build)
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';




export const metadata: Metadata = {
  title: 'Roxanne Cosmetics — Fine Fragrance, Skincare & Makeup',
  description:
    'Roxanne Cosmetics: curated perfumes, colognes, skincare and makeup. Browse the collection — product information only, no online ordering.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="">
      <body className="min-h-screen bg-[#fdfbf9] text-stone-900 antialiased dark:bg-stone-950 dark:text-stone-100">
        <Header />
        <main className="mx-auto max-w-6xl px-4">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
