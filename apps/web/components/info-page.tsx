import type { ReactNode } from 'react';

export function InfoPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="container py-10 md:py-16">
      <header className="max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-.045em] md:text-6xl">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-[var(--text-2)]">{intro}</p>
      </header>
      <div className="mt-10 grid max-w-5xl gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

export function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface p-6 md:p-7">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-2)]">{children}</div>
    </section>
  );
}
