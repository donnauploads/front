/**
 * Real adapters for the Savings surface.
 *
 *   GET    /goals                    → GoalDto[]
 *   POST   /goals                    → GoalDto
 *   PATCH  /goals/:id                → GoalDto
 *   DELETE /goals/:id                → GoalDto  (archives)
 *   POST   /goals/:id/contribute     → 200 (header: idempotency-key)
 *   GET    /autosave                 → AutosaveDto | null
 *   PUT    /autosave                 → AutosaveDto
 *
 * Cents ↔ dollars conversion happens here so callers stay in dollars.
 */

import { apiFetch } from "@/lib/api/client"
import type { Autosave, SavingsGoal, SplitAllocation } from "@/lib/store"

// ─── Wire types ────────────────────────────────────────────────────────────

export type GoalDto = {
  id: string
  emoji: string
  name: string
  /** Stringified BigInt cents, or null. */
  targetCents: string | null
  /** Stringified BigInt cents. */
  currentCents: string
  targetDate: string | null
  /** Stringified BigInt cents per week, or null. */
  contributePerWeek: string | null
  isDefault: boolean
  archivedAt: string | null
}

export type GoalSplitDto = {
  goalId: string
  percent: number
}

export type AutosaveDto = {
  enabled: boolean
  roundUpEnabled: boolean
  roundUpSourceAccountId: string | null
  splits: GoalSplitDto[]
  weeklyContributionCents: string | null
  weeklyDay: number | null
}

// ─── Conversion ────────────────────────────────────────────────────────────

function centsToDollars(s: string | null | undefined): number {
  if (s == null) return 0
  // Use Number directly for typical balances; tradeoff is fine for UI.
  return Number(s) / 100
}

function dollarsToCentsString(d: number): string {
  return String(Math.round(d * 100))
}

export function toFrontendGoal(g: GoalDto): SavingsGoal {
  return {
    id: g.id,
    emoji: g.emoji,
    name: g.name,
    balance: centsToDollars(g.currentCents),
    target: g.targetCents == null ? null : centsToDollars(g.targetCents),
    isDefault: g.isDefault,
    contributePerWeek: centsToDollars(g.contributePerWeek ?? "0"),
  }
}

/**
 * Backend stores only `{goalId, percent}` per split. We hydrate the label +
 * emoji from the user's goals list so the modal UI keeps its rich rendering.
 */
export function toFrontendAutosave(
  cfg: AutosaveDto | null,
  goals: SavingsGoal[],
): Autosave {
  if (!cfg) {
    return {
      split: [],
      roundUpsEnabled: false,
      roundUpsTargetGoalId: null,
    }
  }
  const byId = new Map(goals.map((g) => [g.id, g]))
  const split: SplitAllocation[] = cfg.splits
    .map((s) => {
      const g = byId.get(s.goalId)
      if (!g) return null
      return { id: g.id, label: g.name, emoji: g.emoji, percent: s.percent }
    })
    .filter((s): s is SplitAllocation => s !== null)
  return {
    split,
    roundUpsEnabled: cfg.roundUpEnabled,
    // Backend has no "target goal" for round-ups; we surface the first split
    // so the existing UI has something selected. Save flows ignore this.
    roundUpsTargetGoalId: split[0]?.id ?? null,
  }
}

// ─── Calls ────────────────────────────────────────────────────────────────

export async function listGoals(): Promise<SavingsGoal[]> {
  const rows = await apiFetch<GoalDto[]>("/goals")
  return rows
    .filter((g) => !g.archivedAt)
    .map(toFrontendGoal)
}

export type CreateGoalInput = {
  emoji: string
  name: string
  /** Dollars; omit / null for open-ended goal. */
  target: number | null
  /** Dollars per week. Defaults to 25 to match prior UX. */
  contributePerWeek?: number
}

export async function createGoal(input: CreateGoalInput): Promise<SavingsGoal> {
  const body: Record<string, unknown> = {
    emoji: input.emoji,
    name: input.name,
  }
  if (input.target != null && input.target > 0) {
    body.targetCents = dollarsToCentsString(input.target)
  }
  if (input.contributePerWeek != null && input.contributePerWeek > 0) {
    body.contributePerWeek = dollarsToCentsString(input.contributePerWeek)
  }
  const dto = await apiFetch<GoalDto>("/goals", { method: "POST", body })
  return toFrontendGoal(dto)
}

export type UpdateGoalInput = {
  emoji?: string
  name?: string
  /** Dollars; explicit null clears the target. */
  target?: number | null
  contributePerWeek?: number
}

export async function updateGoal(
  id: string,
  input: UpdateGoalInput,
): Promise<SavingsGoal> {
  const body: Record<string, unknown> = {}
  if (input.emoji !== undefined) body.emoji = input.emoji
  if (input.name !== undefined) body.name = input.name
  if (input.target !== undefined) {
    body.targetCents =
      input.target == null || input.target <= 0
        ? null
        : dollarsToCentsString(input.target)
  }
  if (input.contributePerWeek !== undefined) {
    body.contributePerWeek = dollarsToCentsString(input.contributePerWeek)
  }
  const dto = await apiFetch<GoalDto>(`/goals/${id}`, {
    method: "PATCH",
    body,
  })
  return toFrontendGoal(dto)
}

export async function archiveGoal(id: string): Promise<void> {
  await apiFetch<GoalDto>(`/goals/${id}`, { method: "DELETE" })
}

export async function contributeToGoal(
  id: string,
  fromAccountId: string,
  amountDollars: number,
): Promise<void> {
  const idempotencyKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `contrib-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await apiFetch<unknown>(`/goals/${id}/contribute`, {
    method: "POST",
    body: {
      fromAccountId,
      amountCents: dollarsToCentsString(amountDollars),
    },
    headers: { "idempotency-key": idempotencyKey },
  })
}

export async function getAutosave(): Promise<AutosaveDto | null> {
  return apiFetch<AutosaveDto | null>("/autosave")
}

export type UpdateAutosaveInput = {
  enabled?: boolean
  roundUpEnabled?: boolean
  roundUpSourceAccountId?: string | null
  splits?: GoalSplitDto[]
  /** Dollars per week. */
  weeklyContribution?: number | null
  /** 0 = Sunday … 6 = Saturday */
  weeklyDay?: number | null
}

export async function updateAutosave(
  input: UpdateAutosaveInput,
): Promise<AutosaveDto> {
  const body: Record<string, unknown> = {}
  if (input.enabled !== undefined) body.enabled = input.enabled
  if (input.roundUpEnabled !== undefined) body.roundUpEnabled = input.roundUpEnabled
  if (input.roundUpSourceAccountId !== undefined) {
    body.roundUpSourceAccountId = input.roundUpSourceAccountId
  }
  if (input.splits !== undefined) body.splits = input.splits
  if (input.weeklyContribution !== undefined) {
    body.weeklyContributionCents =
      input.weeklyContribution == null
        ? null
        : dollarsToCentsString(input.weeklyContribution)
  }
  if (input.weeklyDay !== undefined) body.weeklyDay = input.weeklyDay
  return apiFetch<AutosaveDto>("/autosave", { method: "PUT", body })
}
