import { lazy, Suspense, type ComponentProps, type ComponentType } from 'react'
import type * as Impl from './impl'

// The chart library is the largest dependency, so charts load on first use rather than with the app.
// Each export has the same props as the real chart and shows a same-height placeholder while loading.
const load = () => import('./impl')

function lazyChart<K extends keyof typeof Impl>(name: K, defaultHeight: number) {
  const Chart = lazy(() => load().then((m) => ({ default: m[name] as ComponentType<object> })))
  const Lazy = (props: ComponentProps<(typeof Impl)[K]>) => (
    <Suspense fallback={<div aria-hidden className="animate-pulse rounded-xl bg-surface-2/60" style={{ height: (props as { height?: number }).height ?? defaultHeight }} />}>
      <Chart {...(props as object)} />
    </Suspense>
  )
  return Lazy as unknown as (typeof Impl)[K]
}

export const ExpenseBars = lazyChart('ExpenseBars', 260)
export const Donut = lazyChart('Donut', 220)
export const TrendLine = lazyChart('TrendLine', 220)
export const SimpleBars = lazyChart('SimpleBars', 220)
export const PairBars = lazyChart('PairBars', 240)
