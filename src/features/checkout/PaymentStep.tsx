import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { PAYMENT_METHODS } from "./constants";

interface PaymentStepProps {
  token: string;
  onChange: (token: string) => void;
  onSubmit: () => void;
  busy: boolean;
}

export default function PaymentStep({ token, onChange, onSubmit, busy }: PaymentStepProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="max-w-2xl space-y-3"
    >
      <FieldSet>
        <FieldLegend>Payment method</FieldLegend>
        <RadioGroup value={token} onValueChange={(value) => onChange(value)}>
          {PAYMENT_METHODS.map((m) => (
            <div key={m.token} className="flex items-center gap-2">
              <RadioGroupItem id={`payment-${m.token}`} value={m.token} />
              <Label htmlFor={`payment-${m.token}`}>{m.label}</Label>
              <code className="text-xs text-muted-foreground">{m.token}</code>
            </div>
          ))}
        </RadioGroup>
      </FieldSet>
      <p className="text-sm text-muted-foreground">
        Test tokens only — never real card data.
      </p>
      <Button type="submit" disabled={busy} aria-busy={busy}>
        {busy ? "Saving…" : "Review order"}
      </Button>
    </form>
  );
}
