import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../api/auth";
import { authStore } from "../store/auth-store";
import { getDashboardPath } from "../utils/auth-redirect";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Az új jelszó es a megerősítés nem egyezik");
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword(currentPassword, newPassword);
      authStore.markPasswordChanged();

      const user = authStore.getUser();
      setSuccess("Jelszó sikeresen módosítva");

      if (user) {
        navigate(getDashboardPath(user), { replace: true });
      }
    } catch {
      setError("JelszÃ³csere hiba");
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
        <h1 className="mt-5 text-2xl font-bold sm:text-3xl">Jelszócsere</h1>
        <p className="mt-2 text-sm leading-6 text-brown/70">
          Első belépéskor új jelszót kell megadni.
        </p>

        <label className="mt-6 block text-sm font-semibold" htmlFor="currentPassword">
          Jelenlegi jelszó
        </label>
        <input
          className="mt-2 w-full rounded-md border border-brown/20 bg-cream/40 px-3 py-3 outline-none transition focus:border-red focus:ring-2 focus:ring-red/20"
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />

        <label className="mt-4 block text-sm font-semibold" htmlFor="newPassword">
          Új jelszó
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
          Új jelszó megerősítése
        </label>
        <input
          className="mt-2 w-full rounded-md border border-brown/20 bg-cream/40 px-3 py-3 outline-none transition focus:border-red focus:ring-2 focus:ring-red/20"
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {error ? (
          <p className="mt-4 rounded-md border border-red/20 bg-red/10 px-3 py-2 text-sm font-semibold text-red">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mt-4 rounded-md border border-green/20 bg-green/10 px-3 py-2 text-sm font-semibold text-green">
            {success}
          </p>
        ) : null}

        <button
          className="mt-6 w-full rounded-md bg-red px-4 py-3 font-bold text-cream transition hover:bg-brown disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Mentés..." : "Jelszó módosítása"}
        </button>
      </form>
    </section>
  );
}

