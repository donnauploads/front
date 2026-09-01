"use client"

import Link from "next/link"
import {
  ArrowLeftRight,
  Camera,
  Landmark,
  Barcode,
  ChevronRight,
  Repeat2,
  Link2,
  type LucideIcon,
} from "lucide-react"

/**
 * Move money — hub page. Lists six primary transfer destinations as
 * `.action-btn` tiles (same component the home overview uses) and a
 * secondary `.panel` list of "More ways to move" items.
 *
 * The actual transfer form lives at /move/transfer and gets its own
 * port using the design's `view-transfer` markup in the next chunk.
 */

type Tile = { label: string; href: string; Icon: LucideIcon }
type Row = { title: string; body: string; href: string; Icon: LucideIcon }

const TILES: Tile[] = [
  { label: "Transfer", href: "/move/transfer", Icon: ArrowLeftRight },
  { label: "Wire", href: "/move/wire", Icon: Landmark },
  { label: "Deposit check", href: "/move/deposit-check", Icon: Camera },
  { label: "Deposit cash", href: "/move/deposit-cash", Icon: Barcode },
]

const ROWS: Row[] = [
  {
    title: "Manage recurring",
    body: "Schedule weekly, biweekly, or monthly transfers.",
    href: "/move/recurring",
    Icon: Repeat2,
  },
  {
    title: "Manage linked accounts",
    body: "External banks and debit cards.",
    href: "/move/linked",
    Icon: Link2,
  },
]

export default function MoveTab() {
  return (
    <>
      <div className="page-head">
        <h2>Move money</h2>
        <p className="ph-sub">
          Transfer between your accounts, send to people, wire abroad, or
          deposit a check, all in one place.
        </p>
      </div>

      <div className="actions-bar">
        {TILES.map(({ label, href, Icon }) => (
          <Link key={label} className="action-btn" href={href}>
            <span className="action-ic">
              <Icon strokeWidth={2} aria-hidden />
            </span>
            <span className="al">{label}</span>
          </Link>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>More ways to move</h3>
        </div>
        <div className="panel-body">
          {ROWS.map(({ title, body, href, Icon }) => (
            <Link key={href} className="move-row" href={href}>
              <span className="mr-ic">
                <Icon strokeWidth={2} aria-hidden />
              </span>
              <span className="mr-body">
                <span className="mr-title">{title}</span>
                <span className="mr-sub">{body}</span>
              </span>
              <ChevronRight className="mr-chev" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
