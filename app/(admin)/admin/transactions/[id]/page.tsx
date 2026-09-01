"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useStore } from "@/lib/store"
import { TransactionEditSheet } from "@/components/admin/TransactionEditSheet"

/**
 * Permalink to a single transaction edit. Renders the side sheet directly;
 * closing it routes back to the list.
 */
export default function AdminTransactionDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""
  const router = useRouter()
  const rec = useStore((s) => s.adminTxns.find((t) => t.id === id))

  if (!rec) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/transactions"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to transactions
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Transaction not found.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Link
        href="/admin/transactions"
        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to transactions
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Editing <span className="font-mono text-slate-900">{rec.id}</span> —{" "}
        {rec.userName}&apos;s {rec.accountLabel}.
      </div>

      <TransactionEditSheet
        txnId={id}
        onClose={() => router.push("/admin/transactions")}
      />
    </div>
  )
}
