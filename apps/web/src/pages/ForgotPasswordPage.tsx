import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await forgotPassword(email);
      setMessage(
        "Ha van aktiv fiok ezzel az email cimmel, elkuldtuk a jelszo-visszaallito linket."
      );
    } catch {
      setError("Nem sikerult elkuldeni a jelszo-visszaallito emailt.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-cream px-4 py-8 text-brown">
      <form
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft sm:p-7"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className="h-2 w-20 rounded-full bg-green" />
        <h1 className="mt-5 text-2xl font-bold sm:text-3xl">
          Elfelejtett jelszo
        </h1>
        <p className="mt-2 text-sm leading-6 text-brown/70">
          Add meg az email cimed, es kuldunk egy egyszer hasznalhato reset linket.
        </p>

        <label className="mt-6 block text-sm font-semibold" htmlFor="email">
          Email
        </label>
        <input
          className="mt-2 w-full rounded-md border border-brown/20 bg-cream/40 px-3 py-3 outline-none transition focus:border-red focus:ring-2 focus:ring-red/20"
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {message ? (
          <p className="mt-4 rounded-md border border-green/20 bg-green/10 px-3 py-2 text-sm font-semibold text-green">
            {message}
          </p>
        ) : null}

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
          {isSubmitting ? "Kuldes..." : "Reset link kuldese"}
        </button>

        <Link
          className="mt-4 inline-block text-sm font-semibold text-red hover:text-brown"
          to="/login"
        >
          Vissza a belepeshez
        </Link>
      </form>
    </section>
  );
}
