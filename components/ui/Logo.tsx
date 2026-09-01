import Image from "next/image"
import { cn } from "@/lib/utils"
import { BRAND_NAME, BRAND_SHORT } from "@/lib/brand"

export function Logo({
  className,
  theme = "dark",
}: {
  className?: string
  theme?: "dark" | "light"
}) {
  const color = theme === "light" ? "text-kale" : "text-fern"
  return (
    <div className={cn("flex items-center gap-2", color, className)}>
      <Image
        src="/lappy.png"
        alt={BRAND_NAME}
        width={28}
        height={28}
        priority
        className="h-7 w-auto"
      />
      <span className="text-xl font-bold tracking-tight lowercase">{BRAND_SHORT}</span>
    </div>
  )
}
