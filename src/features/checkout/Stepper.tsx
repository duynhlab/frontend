import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  labels: readonly string[];
  current: number;
  onStepClick: (step: number) => void;
  disabled?: boolean;
}

/**
 * Horizontal wizard stepper: numbered circles with done ✓ / active / upcoming
 * states and connector lines. Completed steps are buttons — the server FSM
 * legally re-enters earlier states (edit address / change shipping), so going
 * back is allowed; upcoming steps are not clickable.
 */
export default function Stepper({ labels, current, onStepClick, disabled }: StepperProps) {
  return (
    <ol aria-label="Checkout progress" className="mb-6 flex items-center gap-2">
      {labels.map((label, i) => {
        const stepNo = i + 1;
        const isActive = stepNo === current;
        const isDone = stepNo < current;
        const clickable = isDone && !disabled;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <button
              type="button"
              aria-current={isActive ? "step" : undefined}
              disabled={!clickable}
              onClick={clickable ? () => onStepClick(stepNo) : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-1 py-1 text-sm",
                clickable && "cursor-pointer hover:text-primary",
                isActive ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  isDone && "border-success text-success",
                )}
              >
                {isDone ? <CheckIcon className="size-3.5" /> : stepNo}
              </span>
              <span>{label}</span>
            </button>
            {stepNo < labels.length && (
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
