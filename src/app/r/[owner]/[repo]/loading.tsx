export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2 md:flex-row">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card flex-1 p-4">
            <span className="skeleton block h-3 w-24" />
            <span className="skeleton mt-3 block h-6 w-20" />
            <span className="skeleton mt-3 block h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="card p-5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-(--line) py-3 last:border-0" style={{ opacity: 1 - i * 0.13 }}>
            <span className="skeleton h-9 w-9 rounded-full!" />
            <div className="flex flex-1 flex-col gap-2">
              <span className="skeleton h-4 w-40" />
              <span className="skeleton h-3 w-64 max-w-full" />
            </div>
            <span className="skeleton hidden h-4 w-24 md:block" />
            <div className="hidden gap-2 lg:flex">
              <span className="skeleton h-7 w-36 rounded-lg!" />
              <span className="skeleton h-7 w-36 rounded-lg!" />
              <span className="skeleton h-7 w-36 rounded-lg!" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
