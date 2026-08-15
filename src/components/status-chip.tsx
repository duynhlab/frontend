import { statusTone, type StatusTone } from '@/features/orders/api'
import { cn } from '@/lib/utils'

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'bg-success/10 text-success-on-tint',
  warning: 'bg-warning/10 text-warning-on-tint',
  destructive: 'bg-destructive/10 text-destructive-on-tint',
  info: 'bg-primary/10 text-primary',
  muted: 'bg-muted text-muted-foreground',
}

/**
 * One chip for order, shipment and payment status alike. The word is always
 * present — colour is a second signal, never the only one.
 */
export function StatusChip({
  status,
  className,
}: {
  status: string | undefined
  className?: string
}) {
  if (!status) return null
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        TONE_CLASS[statusTone(status)],
        className,
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
