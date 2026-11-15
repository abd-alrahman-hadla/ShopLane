"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProfile, type ProfileFormState } from "@/features/account/actions";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, formAction, isPending] = useActionState<ProfileFormState, FormData>(
    saveProfile,
    {},
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          name="name"
          defaultValue={name}
          autoComplete="name"
          required
          maxLength={80}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "profile-name-error" : "profile-name-hint"}
        />
        <p id="profile-name-hint" className="text-muted-foreground text-xs">
          Shown on your reviews as first name and last initial.
        </p>
        {state.error && (
          <p id="profile-name-error" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={email} readOnly disabled />
        <p className="text-muted-foreground text-xs">
          You sign in with this address, so it can’t be changed here.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        {state.ok && (
          <p className="text-sm text-emerald-700" role="status">
            Saved.
          </p>
        )}
      </div>
    </form>
  );
}
