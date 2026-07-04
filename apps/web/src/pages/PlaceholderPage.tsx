import { Card } from "../components/ui/Card";

interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <Card>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-brown/70">Ez a funkcio később készül el.</p>
    </Card>
  );
}

