interface AuthCardProps {
  title: string;
  subtitle: string;
  submitLabel: string;
  email: string;
  password: string;
  isSubmitting: boolean;
  error: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  tone?: "default" | "admin";
}

export function AuthCard({
  title,
  subtitle,
  submitLabel,
  email,
  password,
  isSubmitting,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  tone = "default"
}: AuthCardProps) {
  const accentClass = tone === "admin" ? "bg-red" : "bg-green";

  return (
    <section className="flex min-h-screen items-center justify-center bg-cream px-4 py-8 text-brown">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft sm:p-7">
        <div className={`h-2 w-20 rounded-full ${accentClass}`} />
        <h1 className="mt-5 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-brown/70">{subtitle}</p>

        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="block text-sm font-semibold" htmlFor="email">
            Email
          </label>
          <input
            className="mt-2 w-full rounded-md border border-brown/20 bg-cream/40 px-3 py-3 outline-none transition focus:border-red focus:ring-2 focus:ring-red/20"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nev@ceg.hu"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
          />

          <label className="mt-4 block text-sm font-semibold" htmlFor="password">
            Jelszó
          </label>
          <input
            className="mt-2 w-full rounded-md border border-brown/20 bg-cream/40 px-3 py-3 outline-none transition focus:border-red focus:ring-2 focus:ring-red/20"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="********"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />

          <a
            className="mt-3 inline-block text-sm font-semibold text-red hover:text-brown"
            href="#forgot-password"
            onClick={(event) => event.preventDefault()}
          >
            Elfelejtett jelszó
          </a>

          {error ? (
            <p className="mt-4 rounded-md border border-red/20 bg-red/10 px-3 py-2 text-sm font-semibold text-red">
              {error}
            </p>
          ) : null}

          <button
            className="mt-6 w-full rounded-md bg-red px-4 py-3 font-bold text-cream transition hover:bg-brown disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Bejelentkezés..." : submitLabel}
          </button>
        </form>
      </div>
    </section>
  );
}

