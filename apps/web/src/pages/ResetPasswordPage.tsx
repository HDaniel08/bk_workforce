import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Hibas vagy hianyzo reset link.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Az uj jelszo es a megerosites nem egyezik.");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess("Jelszo sikeresen modositva.");
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch {
      setError("A reset link ervenytelen vagy lejart.");
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
          Uj jelszo beallitasa
        </h1>
        <p className="mt-2 text-sm leading-6 text-brown/70">
          Add meg az uj jelszavad. A reset link egyszer hasznalhato.
        </p>

        <label className="mt-6 block text-sm font-semibold" htmlFor="newPassword">
          Uj jelszo
        </label>
        <input
          className="mt-2 w-full rounded-md border border-brown/20 bg-cream/40 px-3 py-3 outline-none transition focus:border-red focus:ring-2 focus:ring-red/20"
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />

        <label
          className="mt-4 block text-sm font-semibold"
          htmlFor="confirmPassword"
        >
          Uj jelszo megerositese
        </label>
        <input
          className="mt-2 w-full rounded-md border border-brown/20 bg-cream/40 px-3 py-3 outline-none transition focus:border-red focus:ring-2 focus:ring-red/20"
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {success ? (
          <p className="mt-4 rounded-md border border-green/20 bg-green/10 px-3 py-2 text-sm font-semibold text-green">
            {success}
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
          {isSubmitting ? "Mentes..." : "Jelszo mentese"}
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
