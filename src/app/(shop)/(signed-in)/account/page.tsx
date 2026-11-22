import type { Metadata } from "next";
import { ProfileForm } from "@/components/shop/account/profile-form";
import { SignOutButton } from "@/components/shop/account/sign-out-button";
import { requireUser } from "@/lib/auth-guards";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser("/account");
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="profile-heading" className="flex flex-col gap-4">
        <h2 id="profile-heading" className="text-xl font-semibold">
          Profile
        </h2>
        <ProfileForm name={user.name ?? ""} email={user.email} />
      </section>
      <section className="flex flex-col items-start gap-3 border-t pt-6">
        <SignOutButton />
      </section>
    </div>
  );
}
