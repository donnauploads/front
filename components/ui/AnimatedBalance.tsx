"use client"

import { useEffect, useState } from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { useStore } from "@/lib/store"
import { convertFromBase, currencyDecimals } from "@/lib/currency"

/**
 * Animates from previous balance to the new value with framer-motion.
 * Shows formatted currency. Re-animates whenever `value` changes.
 *
 * When the user's privacy toggle is off (`prefs.balancesVisible === false`),
 * the formatted amount is replaced with a fixed mask so the digits never
 * appear on screen. The mask doesn't animate — there's nothing to count to.
 */
const MASK = "••••••"

export function AnimatedBalance({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const visible = useStore((s) => s.prefs.balancesVisible)
  // `value` is in the base currency (USD); convert + format to the user's
  // chosen display currency so this counter matches the rest of the app.
  const currency = useStore((s) => s.displayCurrency)
  // Re-render when live FX rates arrive so the balance switches from the
  // static fallback to the live-converted value without a manual refresh.
  const fxRatesAsOf = useStore((s) => s.fxRatesAsOf)

  const mv = useMotionValue(0)
  const display = useTransform(mv, (n) =>
    convertFromBase(n, currency).toLocaleString("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: currencyDecimals(currency),
      maximumFractionDigits: currencyDecimals(currency),
    }),
  )

  // Keep the rendered string in React state so it updates on every frame
  const [text, setText] = useState(display.get())

  useEffect(() => {
    const unsub = display.on("change", (v) => setText(v))
    return () => unsub()
  }, [display])

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
    })
    return controls.stop
  }, [value, mv])

  // The motion value may not tick when only the currency changes, so refresh
  // the rendered text immediately on a currency switch.
  useEffect(() => {
    setText(display.get())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, fxRatesAsOf])

  return (
    <motion.span className={className} aria-label={visible ? undefined : "Balance hidden"}>
      {visible ? text : MASK}
    </motion.span>
  )
}
