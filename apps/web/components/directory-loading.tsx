export function DirectoryLoading() {
  return (
    <div className="container animate-pulse py-12" aria-busy="true" aria-label="Загрузка данных">
      <div className="h-4 w-24 rounded bg-[var(--surface-3)]" />
      <div className="mt-4 h-12 max-w-lg rounded bg-[var(--surface-2)]" />
      <div className="mt-8 h-24 rounded-xl bg-[var(--surface-1)]" />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="h-24 rounded-xl bg-[var(--surface-1)]" key={index} />
        ))}
      </div>
    </div>
  );
}
