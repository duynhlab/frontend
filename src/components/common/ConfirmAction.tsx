import { useState, type ReactElement } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmActionProps {
  /** The element that opens the dialog (typically a Button). */
  trigger: ReactElement<Record<string, unknown>>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (delete/cancel flows). */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * ConfirmAction — the one shared confirmation dialog for destructive or
 * irreversible actions (cart remove, checkout cancel, …). Pages must use
 * this instead of hand-rolling an AlertDialog per pattern (AGENTS.md).
 */
export default function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            aria-busy={pending}
            className={cn(
              destructive &&
                buttonVariants({ variant: "destructive" }),
            )}
            onClick={(event) => {
              // Keep the dialog open until the action settles.
              event.preventDefault();
              void handleConfirm();
            }}
          >
            {pending ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
