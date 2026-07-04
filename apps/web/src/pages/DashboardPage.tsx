interface DashboardPageProps {
  role: string;
  title: string;
}

const placeholderStats = [
  { label: "Aktív műszakok", value: "0" },
  { label: "Szabadságkérelmek", value: "0" },
  { label: "Elbiralasra var", value: "0" }
];

export function DashboardPage({ role, title }: DashboardPageProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-lg bg-white p-5 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-green">
          {role}
        </p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-brown/70 sm:text-base">
          Ez egy későbbi funkciokhoz előkészített dashboard placeholder. A jogosultság,
          adatbetöltés es szerepkör szerinti widgetek a következő iteracioban kerülhetnek
          ide.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {placeholderStats.map((stat) => (
          <article key={stat.label} className="rounded-lg bg-white p-5 shadow-soft">
            <p className="text-sm font-medium text-brown/65">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-brown">{stat.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

