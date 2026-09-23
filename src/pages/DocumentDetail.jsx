import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import DetailRow from "@/components/shared/DetailRow";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDocumentDetail } from "@/hooks/useDocumentDetail";
import { getDocumentDownloadUrl } from "@/services/documentService";
import { ArrowLeft, Download, Eye, FileText } from "lucide-react";

export default function DocumentDetail() {
  const { documentId } = useParams();
  const { data: doc, loading, error } = useDocumentDetail(documentId);

  useEffect(() => {
    document.title = `${documentId} - Claim Matrix`;
  }, [documentId]);

  if (loading) return <Spinner />;

  if (error || !doc) {
    return (
      <>
        <PageHeader
          title="Document"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/documents"><ArrowLeft className="h-4 w-4" /> Back to documents</Link>
            </Button>
          }
        />
        <EmptyState
          title="Document not found"
          body={error?.message || "This document may have been removed or you may not have access."}
          action={<Button asChild size="sm"><Link to="/documents">Back to documents</Link></Button>}
        />
      </>
    );
  }

  const metadata = doc.metadata ?? [];
  const access = doc.access ?? [];

  return (
    <>
      <PageHeader
        title={doc.name}
        subtitle={`${doc.matrixId} - ${doc.type} - ${doc.version}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/documents"><ArrowLeft className="h-4 w-4" /> Back to documents</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardContent className="p-0">
            <div className="flex aspect-[16/10] items-center justify-center border-b bg-muted/30">
              <div className="text-center text-muted-foreground">
                <FileText className="mx-auto h-16 w-16 opacity-50" />
                <div className="mt-3 text-sm">High-fidelity document preview placeholder</div>
                <div className="text-xs">PDF/image/video viewer would render here</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              <Button asChild><Link to={`/documents/${documentId}`}><Eye className="h-4 w-4" /> Open preview</Link></Button>
              <Button asChild variant="outline">
                <a href={getDocumentDownloadUrl(documentId)}>
                  <Download className="h-4 w-4" /> Download
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="shadow-card border-accent/50">
            <CardHeader><CardTitle className="text-base">Document details</CardTitle></CardHeader>
            <CardContent>
              <DetailRow label="Status" value={<StatusBadge variant={doc.status === "Acknowledged" ? "success" : "warning"}>{doc.status}</StatusBadge>} />
              <DetailRow label="Owner" value={doc.owner} />
              <DetailRow label="Uploaded by" value={doc.uploadedBy} />
              <DetailRow label="Uploaded at" value={doc.uploadedAt} />
              <DetailRow label="Version" value={doc.version} />
            </CardContent>
          </Card>

          <Card className="shadow-card border-accent/50">
            <CardHeader><CardTitle className="text-base">Structured metadata</CardTitle></CardHeader>
            <CardContent>
              {metadata.map(([label, value]) => (
                <DetailRow key={label} label={label} value={value} />
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-card border-accent/50">
            <CardHeader><CardTitle className="text-base">Access list</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {access.map((company) => (
                <div key={company} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  {company}
                  <StatusBadge variant="success">Granted</StatusBadge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
