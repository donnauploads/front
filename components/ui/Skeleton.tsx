import { cn } from "@/lib/utils"

/**
 * Skeleton — soft shimmering placeholder for async-feeling loading states.
 * shadcn-flavored; uses the existing `animate-pulse` Tailwind utility.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-white/[0.06] ring-1 ring-white/5",
        className,
      )}
      {...props}
    />
  )
}
