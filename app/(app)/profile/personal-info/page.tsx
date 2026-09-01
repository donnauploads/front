"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, Loader2, Lock } from "lucide-react"
import { ProfileSubPage } from "@/components/profile/ProfileSubPage"
import { AvatarEditor } from "@/components/profile/AvatarEditor"
import { useStore } from "@/lib/store"
import { Toast } from "@/components/ui/Toast"
import { ApiError } from "@/lib/api/errors"
import {
  fetchMe,
  type MeDto,
} from "@/lib/profile/api/profile.real"

export default function PersonalInfoPage() {
  const setSessionUser = useStore((s) => s.setSessionUser)
  const setCustomerUser = useStore((s) => s.setUser)
  const customerUser = useStore((s) => s.user)

  const [me, setMe] = useState<MeDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [avatarOpen, setAvatarOpen] = useState(false)
  // When set, the AvatarEditor lands directly on the crop view with
  // this file pre-loaded — used by the "Change" pill which opens the
  // OS file picker BEFORE the modal so the user doesn't have to
  // click through the in-modal upload card first.
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)

  function openAvatarFromFile() {
    avatarFileInputRef.current?.click()
  }
  function onAvatarFilePicked(file: File | null | undefined) {
    if (!file) return
    setPendingAvatarFile(file)
    setAvatarOpen(true)
  }
  const [toast, setToast] = useState({ open: false, msg: "" })

  function flash(msg: string) {
    setToast({ open: true, msg })
    setTimeout(() => setToast({ open: false, msg: "" }), 3500)
  }

  // Tapping any locked field's lock surfaces this notice.
  const notifyLocked = () => flash("Contact admin to update your details.")

  const applyMe = useCallback(
    (m: MeDto) => {
      setMe(m)
      setSessionUser({
        id: m.id,
        email: m.email,
        firstName: m.firstName ?? "",
        lastName: m.lastName ?? "",
        role: m.role,
        novaTag: m.novaTag,
        phoneE164: m.phoneE164,
        avatarUrl: m.avatarUrl,
        status: m.status,
      })
      setCustomerUser({
        name: [m.firstName, m.lastName].filter(Boolean).join(" "),
        novaTag: m.novaTag ?? "",
        memberSince: customerUser?.memberSince ?? new Date().getFullYear().toString(),
        initials: initialsOf(m.firstName, m.lastName),
        avatarUrl: m.avatarUrl,
      })
    },
    [setSessionUser, setCustomerUser, customerUser?.memberSince],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchMe()
      .then((m) => {
        if (cancelled) return
        applyMe(m)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof ApiError ? e.message : "Couldn't load your profile.",
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function saveAvatar(avatarUrl: string) {
    if (!me) return
    applyMe({ ...me, avatarUrl })
    flash("Profile photo updated")
  }
  function clearAvatar() {
    if (!me) return
    applyMe({ ...me, avatarUrl: null })
    flash("Profile photo removed")
  }

  return (
    <ProfileSubPage
      title="Personal information"
      subtitle="Your verified details. Contact support to change them."
    >
      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: 40,
            color: "var(--ink-mute)",
            fontSize: 14,
          }}
        >
          <Loader2 className="animate-spin" width={16} height={16} aria-hidden />
          Loading your profile…
        </div>
      ) : error ? (
        <div className="card-error" role="alert">
          {error}
        </div>
      ) : me ? (
        <>
          <AvatarRow
            avatarUrl={me.avatarUrl}
            initials={initialsOf(me.firstName, me.lastName)}
            onOpen={() => setAvatarOpen(true)}
            onChange={openAvatarFromFile}
          />

          <div className="pf-group">Identity</div>
          <div className="panel">
            <div className="panel-body">
              <ReadOnlyField
                label="Legal name"
                value={[me.firstName, me.lastName].filter(Boolean).join(" ") || "Not set"}
                note="Verified at signup, contact support to change."
                onLock={notifyLocked}
              />
              <ReadOnlyField
                label="Date of birth"
                value={formatDob(me.dob)}
                note="Verified at signup, contact support to change."
                onLock={notifyLocked}
              />
            </div>
          </div>

          <div className="pf-group">Contact</div>
          <div className="panel">
            <div className="panel-body">
              <ReadOnlyField
                label="Email"
                value={me.email}
                note="Email changes require contacting support."
                onLock={notifyLocked}
              />
              <ReadOnlyField
                label="Phone"
                value={me.phoneE164 ?? "Not on file"}
                note="Phone changes require contacting support."
                onLock={notifyLocked}
              />
              <ReadOnlyField
                label="Address"
                multiline
                value={"101 California St, Floor 5\nSan Francisco, CA 94111"}
                note="Mailing address on file, contact support to update."
                onLock={notifyLocked}
              />
            </div>
          </div>
        </>
      ) : null}

      <Toast open={toast.open} message={toast.msg} />

      <AvatarEditor
        open={avatarOpen}
        currentAvatarUrl={me?.avatarUrl ?? null}
        initialFile={pendingAvatarFile}
        onClose={() => {
          setAvatarOpen(false)
          setPendingAvatarFile(null)
        }}
        onSaved={saveAvatar}
        onRemoved={clearAvatar}
      />

      {/* Hidden file input — driven by the "Change" pill on AvatarRow.
          Opening the OS dialog directly (instead of routing through the
          editor's picker subview) skips a click. */}
      <input
        ref={avatarFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          onAvatarFilePicked(e.target.files?.[0] ?? null)
          // Allow picking the same file twice in a row.
          e.currentTarget.value = ""
        }}
      />
    </ProfileSubPage>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function initialsOf(first: string | null, last: string | null): string {
  const f = (first ?? "").trim()
  const l = (last ?? "").trim()
  if (!f && !l) return "??"
  return ((f[0] ?? "") + (l[0] ?? "")).toUpperCase() || "??"
}

/** Format the stored DOB (ISO date) as "14 May 1990". Returns "" when there's
 *  no DOB on file (or it's unparseable) so the locked field renders empty. */
function formatDob(dob: string | null): string {
  if (!dob) return ""
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function AvatarRow({
  avatarUrl,
  initials,
  onOpen,
  onChange,
}: {
  avatarUrl: string | null
  initials: string
  /** Tapping the avatar itself opens the full editor (picker subview
   *  → crop). Used when the user wants to remove the current photo. */
  onOpen: () => void
  /** "Change" pill — opens the OS file picker directly and skips the
   *  intermediate picker subview when a file is chosen. */
  onChange: () => void
}) {
  return (
    <div className="set-profile">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Change profile photo"
        className="sp-avatar"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" />
        ) : (
          <span className="sp-avatar-initials">{initials}</span>
        )}
        <span className="sp-cam-badge" aria-hidden>
          <Camera width={13} height={13} />
        </span>
      </button>
      <div className="sp-meta">
        <div className="sp-name">
          {avatarUrl ? "Custom photo" : "Using your initials"}
        </div>
        <div className="sp-sub">JPG, PNG, or WebP up to 5 MB.</div>
      </div>
      <button type="button" onClick={onChange} className="sp-change">
        <Camera width={15} height={15} aria-hidden />
        Change
      </button>
    </div>
  )
}

function ReadOnlyField({
  label,
  value,
  note,
  multiline,
  onLock,
}: {
  label: string
  value: string
  note: string
  multiline?: boolean
  /** Tapping the lock surfaces a "contact admin" notice (works on touch,
   *  unlike a hover-only tooltip). */
  onLock?: () => void
}) {
  return (
    <div className="set-row" style={{ alignItems: "flex-start", gap: 12 }}>
      <div className="sr-l" style={{ minWidth: 0, flex: 1 }}>
        <div
          className="sd"
          style={{
            fontSize: 10,
            letterSpacing: ".12em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          className="sn"
          style={{
            marginTop: 2,
            whiteSpace: multiline ? "pre-line" : undefined,
            wordBreak: "break-word",
          }}
        >
          {value}
        </div>
        <div className="sd" style={{ marginTop: 6 }}>
          {note}
        </div>
      </div>
      <button
        type="button"
        onClick={onLock}
        aria-label="Locked — contact admin to update"
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "var(--gold-soft)",
          color: "var(--ink-mute)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: 0,
          padding: 0,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <Lock width={14} height={14} aria-hidden />
      </button>
    </div>
  )
}
