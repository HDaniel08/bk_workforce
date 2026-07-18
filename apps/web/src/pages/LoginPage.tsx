import { isAxiosError } from "axios";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login } from "../api/auth";
import { authStore } from "../store/auth-store";
import { AuthCard } from "../ui/AuthCard";
import { getDashboardPath } from "../utils/auth-redirect";

function getLoginErrorMessage(error: unknown) {
  if (isAxiosError(error) && error.response?.data?.message === "INACTIVE_USER") {
    return "Inaktív felhasználó";
  }

  return "Hibás email vagy jelszó";
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    searchParams.get("reason") === "session-expired"
      ? "A munkameneted lejárt, kérjük, jelentkezz be újra."
      : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      const authResponse = await login(email, password);
      authStore.setAuth(authResponse);

      navigate(
        authResponse.user.mustChangePassword
          ? "/change-password"
          : getDashboardPath(authResponse.user),
        { replace: true }
      );
    } catch (submitError) {
      setError(getLoginErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Bejelentkezés"
      subtitle=""
      submitLabel="Belépés"
      email={email}
      password={password}
      isSubmitting={isSubmitting}
      error={error}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  );
}
