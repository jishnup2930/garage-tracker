import { motion, useReducedMotion } from 'framer-motion'

/**
 * Number rendered as rolling odometer drums. Each digit spins into place;
 * screen readers get the plain formatted string.
 */
export function Odometer({ value, className }: { value: string; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <span className={className} aria-label={value} role="text">
      <span aria-hidden className="tabular inline-flex overflow-hidden leading-none">
        {[...value].map((ch, i) =>
          /\d/.test(ch) ? (
            <span key={`${value.length}-${i}`} className="relative inline-block h-[1em] overflow-hidden" style={{ width: '0.62em' }}>
              <motion.span
                className="absolute inset-x-0 top-0 flex flex-col"
                initial={reduce ? false : { y: '0em' }}
                animate={{ y: `-${Number(ch)}em` }}
                transition={{ type: 'spring', stiffness: 70, damping: 16, delay: reduce ? 0 : i * 0.04 }}
              >
                {Array.from({ length: 10 }, (_, d) => (
                  <span key={d} className="block h-[1em] text-center">
                    {d}
                  </span>
                ))}
              </motion.span>
            </span>
          ) : (
            <span key={`${value.length}-${i}`} className="inline-block">
              {ch === ' ' ? ' ' : ch}
            </span>
          ),
        )}
      </span>
    </span>
  )
}
