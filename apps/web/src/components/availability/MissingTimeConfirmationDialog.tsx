import type { MissingTimeBoundary } from "../../utils/availability-time-defaults";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface MissingTimeConfirmationDialogProps {
  boundary: MissingTimeBoundary;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MissingTimeConfirmationDialog({
  boundary,
  onConfirm,
  onCancel
}: MissingTimeConfirmationDialogProps) {
  const isMissingStart = boundary === "start";
  const title = isMissingStart
    ? "Hiányzó kezdő időpont"
    : "Hiányzó záró időpont";
  const description = isMissingStart
    ? "Nem adott meg kezdő időpontot. A rendszer úgy fogja értelmezni, hogy 07:00-tól ér rá."
    : "Nem adott meg záró időpontot. A rendszer úgy fogja értelmezni, hogy 01:00-ig ér rá.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brown/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="missing-time-title"
      aria-describedby="missing-time-description"
    >
      <Card className="w-full max-w-md space-y-4 bg-white shadow-xl">
        <div>
          <h3 id="missing-time-title" className="text-xl font-bold">
            {title}
          </h3>
          <p id="missing-time-description" className="mt-2 text-sm leading-6 text-brown/75">
            {description}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={onConfirm}>Mentés</Button>
          <Button variant="ghost" onClick={onCancel}>
            Mégse
          </Button>
        </div>
      </Card>
    </div>
  );
}
