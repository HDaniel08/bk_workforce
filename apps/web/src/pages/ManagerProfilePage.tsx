import { useEffect, useState } from "react";
import { getManagerProfile, transferManagerScheduleOwner, type ManagerProfile } from "../api/manager-schedules";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";

export function ManagerProfilePage() {
  const [profile, setProfile] = useState<ManagerProfile | null>(null);
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { getManagerProfile().then(setProfile).catch(() => setError("A profil nem tölthető be.")); }, []);

  async function transfer() {
    if (!targetId || targetId === profile?.ownerId) return;
    setError("");
    try {
      await transferManagerScheduleOwner(targetId);
      setProfile(await getManagerProfile());
      setMessage("A beosztásírói jogosultság átadva.");
    } catch { setError("A jogosultság átadása nem sikerült."); }
  }

  const owner = profile?.managers.find((person) => person.id === profile.ownerId);
  return <section className="space-y-5">
    <Card className="space-y-3">
      <h2 className="text-2xl font-bold">Profil</h2>
      <p>Managerbeosztás felelőse: <strong>{owner ? `${owner.lastName} ${owner.firstName}` : "nincs kijelölve"}</strong></p>
      {profile?.isOwner ? <div className="max-w-md space-y-3">
        <p className="text-sm text-brown/70">A jogosultság átadásakor az új felelős azonnal szerkesztheti a piszkozatokat.</p>
        <Select label="Átadás másik managernek" value={targetId} onChange={(event) => setTargetId(event.target.value)} options={[
          { value: "", label: "Válassz managert" },
          ...profile.managers.filter((person) => person.id !== profile.ownerId).map((person) => ({ value: person.id, label: `${person.lastName} ${person.firstName}` }))
        ]} />
        <Button disabled={!targetId} onClick={transfer}>Jogosultság átadása</Button>
      </div> : null}
      {message ? <p className="text-sm text-green">{message}</p> : null}
      {error ? <p className="text-sm text-red">{error}</p> : null}
    </Card>
  </section>;
}
