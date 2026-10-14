import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DEMO_PASSWORD, TOUR, installDemoStorage, setDemoMinutes } from "@/lib/demo";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Demo - High School Class Sign-In" }] }),
  component: DemoLayout,
});

// The real app, running on in-memory data with sample sign-ins. Nothing is saved.
function DemoLayout() {
  const [ready, setReady] = useState(false);
  // Index into TOUR while the guided walk through a day is running; null for the real clock.
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    const restore = installDemoStorage();
    setReady(true);
    return () => {
      restore();
      setDemoMinutes(null);
    };
  }, []);

  useEffect(() => {
    setDemoMinutes(step === null ? null : TOUR[step]!.minutes);
  }, [step]);

  const btn = "rounded-md border border-background px-3 py-1 text-xs font-bold";
  const touring = step !== null;
  return (
    <div
      className={
        touring
          ? "[--app-h:calc(100dvh-7rem)] sm:[--app-h:calc(100dvh-4.5rem)]"
          : "[--app-h:calc(100dvh-3.5rem)] sm:[--app-h:calc(100dvh-2.25rem)]"
      }
    >
      {ready && <Outlet />}
      <div
        className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 overflow-hidden bg-foreground px-3 py-1 text-xs font-semibold text-background ${
          touring ? "h-28 sm:h-[4.5rem]" : "h-14 sm:h-9"
        }`}
      >
        {step === null ? (
          <>
            <span>DEMO: nothing is saved. Admin password: {DEMO_PASSWORD}</span>
            <button onClick={() => setStep(0)} className={btn}>
              Start demo: walk through a day
            </button>
          </>
        ) : (
          <>
            <span className="max-w-2xl text-center text-sm">
              {step + 1}/{TOUR.length} · {TOUR[step]!.text}
            </span>
            <span className="flex gap-2">
              <button
                onClick={() => setStep(step - 1)}
                disabled={step === 0}
                className={`${btn} disabled:opacity-40`}
              >
                Back
              </button>
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === TOUR.length - 1}
                className={`${btn} disabled:opacity-40`}
              >
                Next
              </button>
              <button onClick={() => setStep(null)} className={btn}>
                End demo
              </button>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
