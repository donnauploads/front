"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, User } from "lucide-react"
import { Logo } from "@/components/ui/Logo"
import { Button } from "@/components/ui/Button"
import { NavDrawer } from "./NavDrawer"
import { cn } from "@/lib/utils"

type Theme = "dark" | "light"

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [theme, setTheme] = useState<Theme>("dark")
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 8)

      // Pick the topmost [data-nav-theme] section whose top has passed under
      // the header, and inherit its declared theme.
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-nav-theme]"),
      )
      const navH =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--nav-h",
          ),
        ) || 64
      const probe = navH + 4
      let active: Theme = "dark"
      for (const el of sections) {
        const rect = el.getBoundingClientRect()
        if (rect.top <= probe && rect.bottom > probe) {
          active = (el.dataset.navTheme as Theme) ?? "dark"
        }
      }
      setTheme(active)
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  const isLight = theme === "light"
  const textColor = isLight ? "text-kale" : "text-white"
  const hoverBg = isLight ? "hover:bg-kale/5" : "hover:bg-white/5"

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-200",
        scrolled
          ? isLight
            ? "bg-white"
            : "bg-flush/10 backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 md:px-8 md:py-3">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "hidden h-10 w-10 place-items-center rounded-xl transition active:scale-95 md:grid",
              textColor,
              hoverBg,
            )}
          >
            <Menu size={22} />
          </button>
          <Logo theme={theme} />
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="primary" size="sm" className="!rounded-lg">
            <Link href="/get-started">Get started</Link>
          </Button>
          <Link
            href="/login"
            className={cn(
              "hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-[0.97] md:inline-flex",
              textColor,
              hoverBg,
            )}
            aria-label="Log in"
          >
            <User size={16} />
            <span>Log in</span>
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl transition active:scale-95 md:hidden",
              textColor,
              hoverBg,
            )}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  )
}
