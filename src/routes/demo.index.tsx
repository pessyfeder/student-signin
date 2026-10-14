import { createFileRoute } from "@tanstack/react-router";
import { demoNow } from "@/lib/demo";
import { SignInPage } from "./index";

export const Route = createFileRoute("/demo/")({
  component: () => <SignInPage adminTo="/demo/admin" getNow={demoNow} />,
});
