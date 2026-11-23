"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAddress, type AddressFormState } from "@/features/addresses/actions";
import { US_STATES } from "@/features/addresses/schemas";
import { cn } from "@/lib/utils";

export type AddressValues = {
  id?: string;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postalCode: string;
  phone: string | null;
};

type FieldProps = {
  name: keyof Omit<AddressValues, "id">;
  label: string;
  defaultValue?: string | null;
  error?: string;
  autoComplete: string;
  optional?: boolean;
  className?: string;
};

function Field({
  name,
  label,
  defaultValue,
  error,
  autoComplete,
  optional,
  className,
}: FieldProps) {
  const id = useId();
  const t = useTranslations("addresses");
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="text-muted-foreground font-normal"> {t("optional")}</span>}
      </Label>
      <Input
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        autoComplete={autoComplete}
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

type AddressFormProps = {
  address?: AddressValues;
  onDone?: () => void;
};

/** Add (no address) or edit an address. Validated again on the server. */
export function AddressForm({ address, onDone }: AddressFormProps) {
  const [state, formAction, isPending] = useActionState<AddressFormState, FormData>(
    saveAddress,
    {},
  );
  const regionId = useId();
  const t = useTranslations("addresses");
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state, onDone]);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2" data-testid="address-form">
      {address?.id && <input type="hidden" name="addressId" value={address.id} />}
      <Field
        name="fullName"
        label={t("fields.fullName")}
        defaultValue={address?.fullName}
        error={errors.fullName}
        autoComplete="name"
        className="sm:col-span-2"
      />
      <Field
        name="line1"
        label={t("fields.line1")}
        defaultValue={address?.line1}
        error={errors.line1}
        autoComplete="address-line1"
        className="sm:col-span-2"
      />
      <Field
        name="line2"
        label={t("fields.line2")}
        defaultValue={address?.line2}
        error={errors.line2}
        autoComplete="address-line2"
        optional
        className="sm:col-span-2"
      />
      <Field
        name="city"
        label={t("fields.city")}
        defaultValue={address?.city}
        error={errors.city}
        autoComplete="address-level2"
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={regionId}>{t("fields.region")}</Label>
        <select
          id={regionId}
          name="region"
          defaultValue={address?.region ?? ""}
          required
          autoComplete="address-level1"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
          aria-invalid={errors.region ? true : undefined}
        >
          <option value="" disabled>
            {t("select")}
          </option>
          {US_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        {errors.region && <p className="text-destructive text-sm">{errors.region}</p>}
      </div>
      <Field
        name="postalCode"
        label={t("fields.postalCode")}
        defaultValue={address?.postalCode}
        error={errors.postalCode}
        autoComplete="postal-code"
      />
      <Field
        name="phone"
        label={t("fields.phone")}
        defaultValue={address?.phone}
        error={errors.phone}
        autoComplete="tel"
        optional
      />
      {state.error && (
        <p className="text-destructive text-sm sm:col-span-2" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? t("saving") : address?.id ? t("save") : t("add")}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
