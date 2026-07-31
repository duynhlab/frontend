import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addressSchema, type AddressFormValues } from "./schemas";

interface FieldSpec {
  name: keyof AddressFormValues;
  label: string;
  required: boolean;
  fullWidth: boolean;
  autoComplete?: string;
  maxLength?: number;
}

const FIELDS: FieldSpec[] = [
  { name: "full_name", label: "Full name", required: true, fullWidth: true, autoComplete: "name" },
  { name: "line1", label: "Address line 1", required: true, fullWidth: true, autoComplete: "address-line1" },
  { name: "line2", label: "Address line 2", required: false, fullWidth: true, autoComplete: "address-line2" },
  { name: "city", label: "City", required: true, fullWidth: false, autoComplete: "address-level2" },
  { name: "region", label: "Region/State", required: false, fullWidth: false, autoComplete: "address-level1" },
  { name: "post_code", label: "Postal code", required: false, fullWidth: false, autoComplete: "postal-code" },
  { name: "country", label: "Country code", required: true, fullWidth: false, autoComplete: "country", maxLength: 2 },
];

interface AddressStepProps {
  /** Current values (kept by the parent so back/next preserves the form). */
  address: AddressFormValues;
  onSubmit: (values: AddressFormValues) => void;
  busy: boolean;
}

export default function AddressStep({ address, onSubmit, busy }: AddressStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    // `values` (not defaultValues) so a session refresh from the server or a
    // back-navigation re-mount always shows the latest saved address.
    values: address,
  });

  const submit = handleSubmit((values) => {
    onSubmit({ ...values, country: values.country.toUpperCase() });
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="max-w-2xl space-y-3">
      <h3 className="text-base font-semibold">Shipping address</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map((spec) => (
          <Field
            key={spec.name}
            data-invalid={!!errors[spec.name] || undefined}
            className={cn(spec.fullWidth && "sm:col-span-2")}
          >
            <FieldLabel htmlFor={`address-${spec.name}`}>
              {spec.label}
              {spec.required ? " *" : ""}
            </FieldLabel>
            <Input
              id={`address-${spec.name}`}
              type="text"
              aria-invalid={!!errors[spec.name]}
              {...(spec.autoComplete && { autoComplete: spec.autoComplete })}
              {...(spec.maxLength !== undefined && { maxLength: spec.maxLength })}
              {...register(spec.name)}
            />
            <FieldError errors={errors[spec.name] ? [errors[spec.name]] : undefined} />
          </Field>
        ))}
      </div>
      <Button type="submit" disabled={busy} aria-busy={busy}>
        {busy ? "Saving…" : "Continue to shipping"}
      </Button>
    </form>
  );
}
