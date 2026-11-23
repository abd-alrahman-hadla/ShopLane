"use client";

import { Link } from "@/i18n/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useId, useState, useTransition, type FormEvent } from "react";
import { StarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { deleteMyReview, getMyReviewState, submitReview } from "@/features/reviews/actions";
import type { ReviewState } from "@/features/reviews/reviews";
import { REVIEW_BODY_MAX, REVIEW_BODY_MIN } from "@/features/reviews/schemas";
import { cn } from "@/lib/utils";

function StarPicker({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const name = useId();
  const t = useTranslations("reviews");
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{t("yourRating")}</legend>
      <div className="flex gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((rating) => (
          <label key={rating} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              className="peer sr-only"
              aria-label={t("starOption", { count: rating })}
            />
            <StarIcon
              aria-hidden
              className={cn(
                "peer-focus-visible:ring-ring/50 size-7 rounded-sm text-amber-500 peer-focus-visible:ring-3",
                rating <= value ? "fill-current" : "fill-transparent text-amber-500/40",
              )}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type ReviewFormProps = { productId: string; productName: string };

/** Review form island. Only verified buyers get the form; the server enforces it again. */
export function ReviewForm({ productId, productName }: ReviewFormProps) {
  const { status } = useSession();
  const t = useTranslations("reviews");
  const pathname = usePathname();
  const router = useRouter();
  const textareaId = useId();
  const [state, setState] = useState<ReviewState | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void getMyReviewState(productId).then((result) => {
      if (cancelled || !result) return;
      setState(result);
      setRating(result.existing?.rating ?? 0);
      setBody(result.existing?.body ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [status, productId]);

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <p className="text-muted-foreground text-sm" data-testid="review-form-status">
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`}
          className="underline underline-offset-4"
        >
          {t("signIn")}
        </Link>{" "}
        {t("signInToReview")}
      </p>
    );
  }

  if (!state) return null;

  if (!state.canReview && !state.existing) {
    return (
      <p className="text-muted-foreground text-sm" data-testid="review-form-status">
        {t("onlyBuyers", { name: productName })}
      </p>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (rating === 0) {
      setError(t("chooseRating"));
      return;
    }
    startTransition(async () => {
      const result = await submitReview({ productId, rating, body });
      if (!result.ok) {
        setError(result.fieldErrors?.body ?? result.fieldErrors?.rating ?? result.error);
        return;
      }
      setState({ canReview: true, existing: { rating, body: body.trim() } });
      setEditing(false);
      setMessage(result.created ? t("posted") : t("updated"));
      router.refresh();
    });
  }

  function handleDelete(): void {
    startTransition(async () => {
      const result = await deleteMyReview(productId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setState({ canReview: state?.canReview ?? false, existing: null });
      setRating(0);
      setBody("");
      setMessage(t("deleted"));
      router.refresh();
    });
  }

  if (state.existing && !editing) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border p-4" data-testid="my-review">
        <p className="text-sm font-medium">{t("youReviewed")}</p>
        {message && (
          <p className="text-sm text-success" role="status">
            {message}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            {t("edit")}
          </Button>
          <Button variant="ghost" onClick={handleDelete} disabled={isPending}>
            {t("delete")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border p-4"
      data-testid="review-form"
    >
      <p className="text-sm font-medium">{state.existing ? t("editYours") : t("write")}</p>
      {message && (
        <p className="text-sm text-success" role="status">
          {message}
        </p>
      )}
      <StarPicker value={rating} onChange={setRating} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={textareaId}>{t("yourReview")}</Label>
        <textarea
          id={textareaId}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          minLength={REVIEW_BODY_MIN}
          maxLength={REVIEW_BODY_MAX}
          rows={4}
          required
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3"
          placeholder={t("placeholder")}
        />
        <span className="text-muted-foreground self-end text-xs tabular-nums">
          {body.trim().length}/{REVIEW_BODY_MAX}
        </span>
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? t("saving") : state.existing ? t("saveChanges") : t("post")}
        </Button>
        {state.existing && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
