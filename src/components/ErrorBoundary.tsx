import { Component, type ReactNode } from 'react'

interface State {
  error?: Error
}

/** Keeps one broken screen from taking down the app; data in storage is untouched. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = {}
  static getDerivedStateFromError(error: Error): State {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error(error)
  }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: undefined })
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="mx-auto max-w-md py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">This screen hit a problem</h1>
        <p className="mt-2 text-sm text-muted">Your data is safe. Reload to try again, or go back to the overview. If it keeps happening, download a backup from Settings.</p>
        <p className="mt-3 font-mono text-xs break-words text-faint">{this.state.error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button className="h-10 rounded-xl bg-fg px-4 text-sm font-semibold text-bg" onClick={() => location.reload()}>
            Reload
          </button>
          <a className="flex h-10 items-center rounded-xl border border-line px-4 text-sm font-semibold" href="#/overview" onClick={() => this.setState({ error: undefined })}>
            Go to overview
          </a>
        </div>
      </div>
    )
  }
}
