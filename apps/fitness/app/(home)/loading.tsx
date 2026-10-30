export default function Loading() {
  return (
    <div role="status" aria-label="กำลังโหลด" className="flex flex-col gap-4">
      <div className="h-14 w-64 animate-pulse rounded-xl bg-surface" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface" />)}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}
