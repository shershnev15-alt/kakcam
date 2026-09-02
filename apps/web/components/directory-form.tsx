export function DirectoryForm({
  action,
  values,
}: {
  action: string;
  values: {
    q?: string | undefined;
    country?: string | undefined;
    sort?: string | undefined;
  };
}) {
  return (
    <form
      className="surface mb-6 grid gap-3 p-4 md:grid-cols-[1fr_180px_180px_auto]"
      action={action}
    >
      <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
        Поиск
        <input
          className="focus-ring h-11 border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--text-1)]"
          defaultValue={values.q}
          name="q"
          placeholder="Никнейм или название"
        />
      </label>
      <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
        Страна
        <select
          className="focus-ring h-11 border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--text-1)]"
          defaultValue={values.country ?? ''}
          name="country"
        >
          <option value="">Все страны</option>
          <option value="RU">Россия</option>
          <option value="KZ">Казахстан</option>
          <option value="BY">Беларусь</option>
          <option value="AM">Армения</option>
          <option value="UZ">Узбекистан</option>
          <option value="KG">Кыргызстан</option>
        </select>
      </label>
      <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
        Сортировка
        <select
          className="focus-ring h-11 border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--text-1)]"
          defaultValue={values.sort ?? 'rating'}
          name="sort"
        >
          <option value="rating">По рейтингу</option>
          <option value="name">По имени</option>
          <option value="verified">По проверке</option>
        </select>
      </label>
      <button
        className="focus-ring h-11 self-end bg-[var(--accent)] px-5 text-sm font-black text-[#0b1016]"
        type="submit"
      >
        Применить
      </button>
    </form>
  );
}
