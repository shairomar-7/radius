import RadiusApp from "./RadiusApp";
import { NEIGHBORHOOD_NAMES } from "@/lib/neighborhoods";

export default async function DemoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const hood = sp.hood && NEIGHBORHOOD_NAMES.has(sp.hood) ? sp.hood : "Williamsburg";
  const embedded = sp.embed === "1";
  return (
    <div className={embedded ? "embedded-root" : undefined}>
      <RadiusAppShell hood={hood} embedded={embedded} />
    </div>
  );
}

function RadiusAppShell({ hood, embedded }: { hood: string; embedded: boolean }) {
  return <RadiusApp initialHood={hood} embedded={embedded} />;
}
