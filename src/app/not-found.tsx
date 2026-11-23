import Link from "next/link";

/** Only for paths the locale middleware doesn't handle; localized 404s live in [locale]. */
export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground text-sm tracking-widest uppercase">404</p>
        <h1 className="text-2xl font-semibold">We couldn’t find that page</h1>
        <Link href="/" className="underline underline-offset-4">
          Go to the store
        </Link>
      </body>
    </html>
  );
}
