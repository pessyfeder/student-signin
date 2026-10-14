import { createFileRoute } from "@tanstack/react-router";
import { Admin } from "./admin";

export const Route = createFileRoute("/demo/admin")({
  component: () => <Admin backTo="/demo" />,
});
