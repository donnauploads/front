"use client"

import { format, addWeeks } from "date-fns"
import { cn } from "@/lib/utils"
import type { SavingsGoal } from "@/lib/store"
import { useStore } from "@/lib/store"
import { formatMoney } from "@/lib/currency"

export function GoalCard({
  goal,
  onClick,
}: {
  goal: SavingsGoal
  onClick: () => void
}) {
  const currency = useStore((s) => s.displayCurrency)
  const pct = goal.target ? Math.min(100, (goal.balance / goal.target) * 100) : null

  // Projected ETA: weeks needed at current contribute rate
  const remaining = goal.target ? Math.max(0, goal.target - goal.balance) : 0
  const weeksToHit =
    goal.target && goal.contributePerWeek > 0
      ? Math.ceil(remaining / goal.contributePerWeek)
      : null
  const eta = weeksToHit && weeksToHit > 0 ? addWeeks(new Date(), weeksToHit) : null

  return (
    <button
      type="button"
      onClick={onClick}
      className="snap-start flex w-44 flex-shrink-0 flex-col gap-2 rounded-2xl bg-white/[0.04] p-3 text-left ring-1 ring-white/10 transition hover:bg-white/[0.08] hover:ring-fern/30"
    >
      <div className="flex items-start justify-between">
        <div className="text-xl" aria-hidden>
          {goal.emoji}
        </div>
        {goal.isDefault && (
          <span className="rounded-full bg-fern/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-fern ring-1 ring-fern/30">
            Default
          </span>
        )}
      </div>

      <div>
        <div className="truncate text-xs font-semibold text-ink">
          {goal.name}
        </div>
        <div className="mt-0.5 font-mono text-sm font-bold text-ink">
          {formatMoney(goal.balance, currency)}
        </div>
        {goal.target && (
          <div className="text-[10px] text-ink-muted">
            of {formatMoney(goal.target, currency)}
          </div>
        )}
      </div>

      {pct !== null && (
        <div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r from-fern to-highlight transition-all",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-muted">
            <span>{Math.round(pct)}%</span>
            {eta && <span>{format(eta, "MMM yy")}</span>}
          </div>
        </div>
      )}
      {pct === null && (
        <div className="text-[10px] text-ink-muted">
          No target, keep stacking 💪
        </div>
      )}
    </button>
  )
}

export function NewGoalTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="snap-start flex w-32 flex-shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-white/15 px-3 py-4 text-center text-ink-muted transition hover:border-fern/40 hover:text-ink"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fern/15 text-fern">
        +
      </div>
      <div className="text-xs font-semibold">New Goal</div>
    </button>
  )
}
