import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createReview } from "@/api/reviewApi";
import { toAppError } from "@/lib/errors";
import { notify } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const reviewSchema = z.object({
  rating: z.coerce.number<number>().int().min(1).max(5),
  title: z.string().trim().optional(),
  comment: z.string().trim().min(1, "Please share a few words about the product"),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

const RATING_LABELS: Record<number, string> = {
  5: "⭐⭐⭐⭐⭐ (5)",
  4: "⭐⭐⭐⭐ (4)",
  3: "⭐⭐⭐ (3)",
  2: "⭐⭐ (2)",
  1: "⭐ (1)",
};

interface ReviewFormProps {
  productId: string;
  userId: string;
  /** Called after a successful submit OR a 409 duplicate (both revalidate). */
  onSubmitted: () => Promise<unknown>;
}

export default function ReviewForm({ productId, userId, onSubmitted }: ReviewFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, title: "", comment: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createReview(
        productId,
        userId,
        values.rating,
        values.title || null,
        values.comment,
      );
      notify.success("Review submitted!");
      reset();
      await onSubmitted();
    } catch (err) {
      const appError = toAppError(err, "Failed to submit review");
      // 409 Conflict (duplicate review) — stale UI state; refresh hides the form.
      const isDuplicate =
        appError.status === 409 ||
        appError.message.toLowerCase().includes("already exists");
      if (isDuplicate) {
        notify.info("You have already reviewed this product.");
        await onSubmitted();
      } else {
        notify.error(appError.message);
      }
      if (import.meta.env.DEV) {
        console.error("[API ERROR] Create review:", appError.status, appError.message);
      }
    }
  });

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="max-w-md space-y-4">
      <Field>
        <FieldLabel htmlFor="review-rating">Rating</FieldLabel>
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={(value) => field.onChange(Number(value))}
            >
              <SelectTrigger id="review-rating" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {RATING_LABELS[n]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="review-title">Title (optional)</FieldLabel>
        <Input
          id="review-title"
          type="text"
          placeholder="Summary of your review"
          {...register("title")}
        />
      </Field>

      <Field data-invalid={!!errors.comment || undefined}>
        <FieldLabel htmlFor="review-comment">Comment</FieldLabel>
        <Textarea
          id="review-comment"
          placeholder="Share your thoughts about this product..."
          rows={3}
          aria-invalid={!!errors.comment}
          {...register("comment")}
        />
        <FieldError errors={errors.comment ? [errors.comment] : undefined} />
      </Field>

      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}
