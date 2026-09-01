"use client"

import { Component, type ReactNode } from "react"

type Props = {
  children: ReactNode
  /** Optional friendly label shown in the fallback ("the customer app",
   *  "the admin app", etc.). */
  scope?: string
}

type State = {
  error: Error | null
}

/**
 * Catches uncaught render errors below this point and shows a friendly
 * fallback. Reports to console in dev, ready for Sentry wiring later.
 *
 * Plain class component because Next.js App Router supports the same
 * componentDidCatch contract and we don't pull in a hooks-style lib for
 * one boundary.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // eslint-disable-next-line no-console
    console.error("[error-boundary]", error, info.componentStack)
    // Sentry.captureException(error, { contexts: { react: info } })
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center text-slate-900">
        <div className="max-w-md space-y-3">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-600">
            {this.props.scope ? `${this.props.scope} ` : "This page "}
            hit an unexpected error. Try refreshing, if it happens again,
            sign out and back in.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <pre className="overflow-auto rounded-lg bg-slate-100 p-3 text-left text-[11px] text-rose-700">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={this.reset}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }
}
