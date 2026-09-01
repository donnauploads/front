"use client"

import { useEffect } from "react"
import { Delete } from "lucide-react"

/**
 * Reusable 3x4 numeric keypad for amount entry.
 *
 * Wire to a parent amount STRING (e.g. "8.82"). Each digit/dot key
 * appends; the backspace key removes the last character. Enforces:
 *   - at most one decimal point
 *   - at most 2 decimal places after the "."
 *   - 10-char defensive cap (i.e. disabled once length > 9)
 *   - no leading zero unless followed by "."
 *
 * Parent owns the value; this component is a pure controlled input.
 */
export interface NumericKeypadProps {
  value: string
  onChange: (next: string) => void
  /** Mirror the keys to hardware keyboard (0-9, ".", Backspace). Defaults true. */
  captureKeyboard?: boolean
  /** When true, all inputs are no-ops. */
  disabled?: boolean
  className?: string
}

const MAX_LEN = 10

export function NumericKeypad({
  value,
  onChange,
  captureKeyboard = true,
  disabled = false,
  className,
}: NumericKeypadProps) {
  function appendDigit(d: string) {
    if (disabled) return
    if (value.length >= MAX_LEN) return
    // No leading zero (a typed "5" should not become "05"); but allow
    // 0 as the very first char if the user is about to type "0." next.
    if (value === "0") {
      onChange(d)
      return
    }
    // Cap to 2 decimal places once a dot has been placed.
    const dotIdx = value.indexOf(".")
    if (dotIdx >= 0 && value.length - dotIdx - 1 >= 2) return
    onChange(value + d)
  }
  function appendDecimal() {
    if (disabled) return
    if (value.length >= MAX_LEN) return
    if (value.includes(".")) return
    onChange((value || "0") + ".")
  }
  function backspace() {
    if (disabled) return
    if (value.length === 0) return
    onChange(value.slice(0, -1))
  }

  useEffect(() => {
    if (!captureKeyboard) return
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      // Don't steal keystrokes from real text inputs (search bars, etc.).
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        appendDigit(e.key)
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault()
        backspace()
      } else if (e.key === "." || e.key === ",") {
        e.preventDefault()
        appendDecimal()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureKeyboard, disabled, value])

  return (
    <div className={className ? `num-pad ${className}` : "num-pad"}>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
        <button
          key={k}
          type="button"
          className="np-key"
          onClick={() => appendDigit(k)}
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        className="np-key"
        onClick={appendDecimal}
        aria-label="Decimal"
      >
        .
      </button>
      <button
        type="button"
        className="np-key"
        onClick={() => appendDigit("0")}
      >
        0
      </button>
      <button
        type="button"
        className="np-key"
        onClick={backspace}
        aria-label="Backspace"
      >
        <Delete aria-hidden />
      </button>
    </div>
  )
}
