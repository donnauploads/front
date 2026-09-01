"use client"

import { ProfileSubPage } from "@/components/profile/ProfileSubPage"

export default function AccountDetailsPage() {
  return (
    <ProfileSubPage
      title="Account details"
      subtitle="Limits and the fine print."
    >
      <div className="pf-group">Account limits</div>
      <div className="panel">
        <div className="panel-body">
          <KvRow k="ATM withdrawal" v="$500 / day" mono />
          <KvRow k="Card purchases" v="$100,000 / day" mono />
          <KvRow k="Cash deposit" v="$50,000 / day" mono />
          <KvRow k="Mobile check deposit" v="$500,000 / day" mono />
          <KvRow k="Outgoing wire" v="$5,000,000 / day" mono />
        </div>
      </div>

      <div className="pf-group">Settings</div>
      <div className="panel">
        <div className="panel-body">
          <KvRow k="Account type" v="Spending (Checking)" />
          <KvRow k="Account opened" v="February 28, 2024" />
          <KvRow k="Currency" v="USD" />
          <KvRow k="Tax ID on file" v="••• •• 4127" />
        </div>
      </div>
    </ProfileSubPage>
  )
}

function KvRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="set-row">
      <div className="sr-l">
        <div className="sn">{k}</div>
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text-strong)",
          fontWeight: 600,
          fontFamily: mono ? "ui-monospace, Menlo, monospace" : undefined,
        }}
      >
        {v}
      </div>
    </div>
  )
}
