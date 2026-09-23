import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Stepper from "@/components/shared/Stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClaims } from "@/hooks/useClaims";
import { usePermissions } from "@/hooks/usePermissions";
import { uploadDocument } from "@/services/documentService";
import { ArrowLeft, CheckCircle2, FileUp, Upload, X } from "lucide-react";

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

export default function DocumentUpload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Preselected when arriving from a specific claim's Evidence/Documents tab (see
  // ClaimDetail.jsx) — without this, the matrix select silently defaulted to whichever
  // claim happened to load first, so evidence could land on the wrong case.
  const preselectedMatrixId = searchParams.get("matrixId") || "";
  const { data: claims } = useClaims();
  const { can } = usePermissions();
  const canUpload = can("upload-documents");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const claimOptions = claims ?? [];
  const [uploadPath, setUploadPath] = useState("compliance");
  const [matrixId, setMatrixId] = useState(preselectedMatrixId);
  const [docType, setDocType] = useState("evidence");
  const [displayName, setDisplayName] = useState("");
  const [accessLevel, setAccessLevel] = useState("participants");
  const [notes, setNotes] = useState(
    "Supporting frame referenced in the liability dispute response. Timestamp aligns with weather and police report timeline."
  );

  useEffect(() => {
    document.title = "Upload Document - Claim Matrix";
  }, []);

  useEffect(() => {
    if (!matrixId && !preselectedMatrixId && claimOptions.length) setMatrixId(claimOptions[0].id);
  }, [claimOptions, matrixId, preselectedMatrixId]);

  const handleUpload = async () => {
    if (!file || !canUpload) return;
    setUploading(true);
    try {
      const res = await uploadDocument({
        file,
        matrixId,
        type: docType,
        displayName: displayName || file.name,
        accessLevel,
        uploadPath,
        notes,
      });
      toast.success("Document uploaded");
      navigate(res?.data?.id ? `/documents/${res.data.id}` : "/documents");
    } catch (err) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Upload Supporting Document"
        subtitle="Attach evidence to a shared claim matrix with metadata and access controls"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/documents"><ArrowLeft className="h-4 w-4" /> Back to documents</Link>
          </Button>
        }
      />

      <div className="mb-6">
        <Stepper steps={["File", "Metadata", "Access", "Review"]} current={1} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardHeader><CardTitle className="text-base">Document metadata</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-md border border-accent/40 bg-accent/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Upload path</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Auto users choose existing claim data. Compliance users upload items first, then authorize what gets sent to Matrix.
                  </div>
                </div>
                <Select value={uploadPath} onValueChange={setUploadPath}>
                  <SelectTrigger className="w-[220px] bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto - choose existing claim items</SelectItem>
                    <SelectItem value="compliance">Compliance - upload items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="block rounded-lg border border-dashed bg-muted/30 p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors">
              {file ? (
                <>
                  <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
                  <div className="mt-3 font-medium">{file.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB · {file.type || "unknown"}
                  </div>
                </>
              ) : (
                <>
                  <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                  <div className="mt-3 font-medium">Drop files here or select from device</div>
                  <div className="text-sm text-muted-foreground">PDF, images, video, and supporting archives</div>
                </>
              )}
              <input
                type="file"
                className="sr-only"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) setFile(selected);
                }}
              />
              <span className="mt-4 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                <Upload className="h-4 w-4" /> {file ? "Replace file" : "Choose file"}
              </span>
              {file && (
                <button
                  type="button"
                  className="ml-2 mt-4 inline-flex items-center gap-1 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-destructive/10"
                  onClick={(e) => {
                    e.preventDefault();
                    setFile(null);
                  }}
                >
                  <X className="h-4 w-4" /> Remove
                </button>
              )}
            </label>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Shared claim matrix">
                <Select value={matrixId} onValueChange={setMatrixId}>
                  <SelectTrigger><SelectValue placeholder="Select a matrix" /></SelectTrigger>
                  <SelectContent>
                    {claimOptions.map((matrix) => (
                      <SelectItem key={matrix.id} value={matrix.id}>{matrix.id} - {matrix.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Document type">
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evidence">Evidence</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="statement">Statement</SelectItem>
                    <SelectItem value="scene">Scene diagram</SelectItem>
                    <SelectItem value="legal">State legal summary</SelectItem>
                    <SelectItem value="offer">Settlement offer</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Display name">
                <Input value={displayName} placeholder={file?.name ?? "Document name"} onChange={(e) => setDisplayName(e.target.value)} />
              </Field>
              <Field label="Access level">
                <Select value={accessLevel} onValueChange={setAccessLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="participants">All matrix participants</SelectItem>
                    <SelectItem value="initiator">Initiating company only</SelectItem>
                    <SelectItem value="selected">Selected companies</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Evidence notes">
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                ["Authorized by", "Uploading company / user"],
                ["Matrix use", "Evidence, methodology, or offer support"],
                ["Audit", "upload.authorized + visibility scope"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border bg-background p-3 text-sm">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 font-medium">{value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50 h-fit">
          <CardHeader><CardTitle className="text-base">Upload review</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <StatusBadge variant="info">Version v1</StatusBadge>
            <div className="rounded-lg border bg-background p-4 text-sm">
              This file will be visible to all current matrix participants and included in the audit trail.
            </div>
            {!canUpload && (
              <div className="rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                Your role does not have permission to upload documents.
              </div>
            )}
            <Button className="w-full" onClick={handleUpload} disabled={!file || uploading || !canUpload}>
              <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload document"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
