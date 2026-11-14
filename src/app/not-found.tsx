import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-muted-foreground text-sm tracking-widest uppercase">404</p>
      <h1 className="text-2xl font-semibold">We couldn’t find that page</h1>
      <p className="text-muted-foreground">
        The product may have sold out for good or moved to a new address.
      </p>
      <Link href="/products" className={buttonVariants()}>
        Browse the shop
      </Link>
    </main>
  );
}
