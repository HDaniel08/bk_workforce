import { useState } from "react";
import { sendTestEmail } from "../api/mail";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function ManagerTestEmailPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("BK Workforce teszt email");
  const [message, setMessage] = useState(
    "Ez egy teszt email a BK Workforce manager feluleterol."
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setStatus(null);
    setError(null);
    setIsSubmitting(true);

    try {
      await sendTestEmail({ to, subject, message });
      setStatus("Teszt email elkuldve.");
    } catch {
      setError("Nem sikerult elkuldeni a teszt emailt.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-bold">Teszt email</h1>
      <p className="mt-2 text-sm text-brown/70">
        Ideiglenes fejlesztoi felulet Resend kiprobalasahoz.
      </p>

      <form
        className="mt-6 max-w-xl space-y-4 rounded-lg bg-white p-5 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <Input
          label="Cimzett"
          name="to"
          type="email"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder="teszt@example.com"
        />

        <Input
          label="Targy"
          name="subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />

        <label className="block text-sm font-semibold text-brown" htmlFor="message">
          Uzenet
          <textarea
            id="message"
            className="mt-2 min-h-32 w-full rounded-md border border-brown/20 bg-cream/40 px-3 py-3 outline-none transition focus:border-red focus:ring-2 focus:ring-red/20"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>

        {status ? (
          <p className="rounded-md border border-green/20 bg-green/10 px-3 py-2 text-sm font-semibold text-green">
            {status}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-md border border-red/20 bg-red/10 px-3 py-2 text-sm font-semibold text-red">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kuldes..." : "Teszt email kuldese"}
        </Button>
      </form>
    </section>
  );
}
