import { ShieldCheckIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * One-click demo accounts (DEMO_MODE only). Plain form posts: the route handler
 * sets the session cookie and redirects, so the whole page reloads signed in.
 */
export function DemoSignIn() {
  return (
    <section
      aria-labelledby="demo-heading"
      className="bg-muted/60 flex flex-col gap-3 rounded-xl border p-4"
      data-testid="demo-sign-in"
    >
      <div className="flex flex-col gap-1">
        <h2 id="demo-heading" className="text-sm font-semibold">
          Try the demo
        </h2>
        <p className="text-muted-foreground text-sm">
          No email needed. Payments run in Stripe test mode: use card 4242 4242 4242 4242.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <form action="/api/demo/session" method="post">
          <input type="hidden" name="role" value="admin" />
          <Button type="submit" className="w-full">
            <ShieldCheckIcon data-icon="inline-start" />
            Demo admin
          </Button>
        </form>
        <form action="/api/demo/session" method="post">
          <input type="hidden" name="role" value="customer" />
          <Button type="submit" variant="outline" className="w-full">
            <UserIcon data-icon="inline-start" />
            Demo customer
          </Button>
        </form>
      </div>
    </section>
  );
}
