import EmbeddedOriginPanel from "@/components/shared/EmbeddedOriginPanel";

export default function ComplianceMatrixEntry() {
  return (
    <EmbeddedOriginPanel
      appLabel="Compliance"
      sourceApp="AI for Compliance"
      backTo="/dashboard"
      matrixId="CM-2406-0155"
      matrixTitle="Statutory demand review - Coastal Freight Partners"
      matterFields={[
        ["Matter reference", "COMP-2026-0092"],
        ["Company", "Northbridge Insurance"],
        ["Matter type", "Statutory / regulatory demand"],
        ["Opened", "Sep 10, 2026"],
        ["Jurisdiction", "Washington"],
        ["Statute cited", "RCW 48.30.015"],
      ]}
      participantsSummary={[
        ["Initiator", "Northbridge Insurance · Priya Natarajan"],
        ["Receivers", "Meridian Claims Group"],
        ["Open items", "Statutory response deadline"],
        ["Next action", "Review counterparty position"],
      ]}
    />
  );
}
