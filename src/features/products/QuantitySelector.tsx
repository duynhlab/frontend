import { useId } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuantitySelectorProps {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  /** Upper clamp (e.g. available stock). Unbounded when omitted. */
  max?: number;
}

/**
 * QuantitySelector — controlled quantity stepper with min/max clamping and a
 * programmatically associated label (both were missing in the legacy version).
 */
export default function QuantitySelector({
  quantity,
  onChange,
  min = 1,
  max,
}: QuantitySelectorProps) {
  const inputId = useId();
  const clamp = (value: number) =>
    Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, value));

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={inputId}>Quantity:</Label>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Decrease quantity"
        onClick={() => onChange(clamp(quantity - 1))}
        disabled={quantity <= min}
      >
        <MinusIcon aria-hidden="true" />
      </Button>
      <Input
        id={inputId}
        type="number"
        inputMode="numeric"
        className="w-16 text-center"
        value={quantity}
        min={min}
        {...(max !== undefined && { max })}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          onChange(clamp(Number.isNaN(value) ? min : value));
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Increase quantity"
        onClick={() => onChange(clamp(quantity + 1))}
        disabled={max !== undefined && quantity >= max}
      >
        <PlusIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
