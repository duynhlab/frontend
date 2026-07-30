import type { ShippingMethod } from "@/api/types/checkout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { SHIPPING_METHODS } from "./constants";

interface ShippingStepProps {
  method: ShippingMethod;
  onChange: (method: ShippingMethod) => void;
  onSubmit: () => void;
  onEditAddress: () => void;
  busy: boolean;
}

export default function ShippingStep({
  method,
  onChange,
  onSubmit,
  onEditAddress,
  busy,
}: ShippingStepProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <FieldSet>
        <FieldLegend>Shipping method</FieldLegend>
        <RadioGroup
          value={method}
          onValueChange={(value) => onChange(value as ShippingMethod)}
        >
          {SHIPPING_METHODS.map((m) => (
            <div key={m.key} className="flex items-center gap-2">
              <RadioGroupItem id={`shipping-${m.key}`} value={m.key} />
              <Label htmlFor={`shipping-${m.key}`}>{m.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </FieldSet>
      <p className="text-sm text-muted-foreground">
        The fee is quoted by shipping-service for your destination; tax applies
        on subtotal + fee.
      </p>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} aria-busy={busy}>
          {busy ? "Quoting…" : "Continue to payment"}
        </Button>
        <Button type="button" variant="outline" onClick={onEditAddress} disabled={busy}>
          Edit address
        </Button>
      </div>
    </form>
  );
}
