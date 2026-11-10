import type { Metadata } from "next";
import EngineeringReviewDashboard from "@/components/EngineeringReviewDashboard";

export const metadata: Metadata = {
  title: "Flood-Control Verification Workspace | Dam Right",
  description:
    "Compare approved flood-control plans with documented as-built conditions and review transparent engineering checks.",
};

export default function WorkspacePage() {
  return <EngineeringReviewDashboard />;
}
