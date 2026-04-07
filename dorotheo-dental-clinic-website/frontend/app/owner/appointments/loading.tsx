export default function Loading() {
  return (
    <div className="space-y-5 lg:space-y-6">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-background)]" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded bg-[var(--color-background)]" />
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
              <div className="h-3 w-16 animate-pulse rounded bg-white/70" />
              <div className="mt-2 h-5 w-10 animate-pulse rounded bg-white/70" />
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <div className="h-4 w-36 animate-pulse rounded bg-[var(--color-background)]" />
        <div className="mt-3 h-10 w-full animate-pulse rounded-lg bg-[var(--color-background)]" />
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-3">
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-9 w-24 animate-pulse rounded-lg bg-[var(--color-background)]" />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
        <div className="h-4 w-56 animate-pulse rounded bg-[var(--color-background)]" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 w-full animate-pulse rounded-lg bg-[var(--color-background)]" />
          ))}
        </div>
      </div>
    </div>
  )
}
