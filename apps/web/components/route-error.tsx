'use client';

export function RouteError({ reset }: { reset: () => void }) {
  return (
    <div className="container py-20 text-center">
      <p className="eyebrow">Ошибка соединения</p>
      <h1 className="mt-3 text-3xl font-black">Данные временно недоступны</h1>
      <p className="muted mx-auto mt-3 max-w-lg">
        Не удалось получить подтверждённые данные из Arena API.
      </p>
      <button
        className="focus-ring mt-6 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-[#0b1016]"
        onClick={reset}
        type="button"
      >
        Повторить
      </button>
    </div>
  );
}
