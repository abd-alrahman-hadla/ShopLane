import "./globals.css";

/**
 * The real root layout is app/[locale]/layout.tsx (it owns <html lang dir>).
 * This pass-through exists so app/not-found.tsx has a parent.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
