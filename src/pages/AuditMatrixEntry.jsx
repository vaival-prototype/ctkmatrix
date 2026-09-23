import EmbeddedOriginPanel from "@/components/shared/EmbeddedOriginPanel";

export default function AuditMatrixEntry() {
  return (
    <EmbeddedOriginPanel
      appLabel="Audit"
      sourceApp="Claim Audit"
      backTo="/dashboard"
      matrixId="CM-2406-0161"
      matrixTitle="Audit finding dispute - comparative negligence reassessment"
      matterFields={[
        ["Audit reference", "AUD-2026-0417"],
        ["Company", "Northbridge Insurance"],
        ["Matter type", "Audit finding dispute"],
        ["Opened", "Sep 12, 2026"],
        ["Finding", "Comparative negligence split questioned"],
        ["Reviewer", "Marcus Bell"],
      ]}
      participantsSummary={[
        ["Initiator", "Northbridge Insurance · Marcus Bell"],
        ["Receivers", "Atlas Mutual"],
        ["Open items", "Re-assessment of negligence split"],
        ["Next action", "Await Atlas Mutual response"],
      ]}
    />
  );
}
