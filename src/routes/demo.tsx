import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DEMO_PASSWORD, installDemoStorage, setDemoWhen, type DemoWhen } from "@/lib/demo";
import { PERIODS } from "@/lib/frames";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Demo - High School Class Sign-In" }] }),
  component: DemoLayout,
});

// The real app, running on in-memory data with sample sign-ins. Nothing is saved.
function DemoLayout() {
  const [ready, setReady] = useState(false);
  const [period, setPeriod] = useState("");
  const [arrival, setArrival] = useState<"early" | "ontime" | "late">("early");

  useEffect(() => {
    const restore = installDemoStorage();
    setReady(true);
    return () => {
      restore();
      setDemoWhen(null);
    };
  }, []);

  useEffect(() => {
    setDemoWhen(period ? ({ periodId: period, arrival } as DemoWhen) : null);
  }, [period, arrival]);

  const sel = "rounded-md border border-border bg-background px-2 py-1 text-foreground";
  return (
    <>
      {ready && <Outlet />}
      <div className="fixed inset-x-0 bottom-0 z-[100] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-foreground px-3 py-2 text-xs font-semibold text-background">
        <span>DEMO: nothing is saved. Admin password: {DEMO_PASSWORD}</span>
        <label className="flex items-center gap-1">
          Clock
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={sel}>
            <option value="">Real time</option>
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.frame}
              </option>
            ))}
          </select>
        </label>
        {period && (
          <select
            aria-label="Arrival"
            value={arrival}
            onChange={(e) => setArrival(e.target.value as typeof arrival)}
            className={sel}
          >
            <option value="early">Early</option>
            <option value="ontime">On time</option>
            <option value="late">Late</option>
          </select>
        )}
      </div>
    </>
  );
}
