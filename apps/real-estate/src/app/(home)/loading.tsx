export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-7"><div role="status" aria-label="กำลังโหลด" className="flex flex-col gap-4">
      <div className="h-14 w-64 animate-pulse rounded-xl bg-cream" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-cream" />)}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-cream" />
    </div></main>
  );
}
