import { useEffect } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocuments } from "@/hooks/useDocuments";
import { getDocumentDownloadUrl } from "@/services/documentService";
import { FileText, Download, Eye, Upload, Sparkles } from "lucide-react";

function tone(s = "") {
  const v = s.toLowerCase();
  if (v.includes("ack") || v.includes("granted") || v.includes("approved")) return "success";
  if (v.includes("review") || v.includes("pending")) return "warning";
  if (v.includes("restrict") || v.includes("denied")) return "danger";
  if (v.includes("shared")) return "muted";
  return "info";
}

export default function Documents() {
  const { data, loading, error } = useDocuments();

  useEffect(() => {
    document.title = "Documents — Claim Matrix";
  }, []);

  const docs = data ?? [];

  return (
    <>
      <PageHeader
        title="Documents & Metadata"
        subtitle="Evidence, statements and structured claim metadata across companies"
        actions={
          <>
            <Button variant="outline" size="sm" disabled title="Filtering isn't available yet">
              <Sparkles className="h-4 w-4" /> Filter <StatusBadge variant="warning">Coming soon</StatusBadge>
            </Button>
            <Button asChild size="sm"><Link to="/documents/upload"><Upload className="h-4 w-4" /> Upload</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <Spinner />
            ) : error ? (
              <div className="p-6 text-sm text-destructive">Failed to load documents: {error.message}</div>
            ) : docs.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Data not found"
                  body="No documents are available yet. Uploaded evidence and structured metadata will appear here."
                  action={<Button asChild size="sm"><Link to="/documents/upload">Upload document</Link></Button>}
                />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3">Document</th>
                    <th className="text-left px-5 py-3">Type</th>
                    <th className="text-left px-5 py-3">Uploaded by</th>
                    <th className="text-left px-5 py-3">Version</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {docs.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <Link to={`/documents/${d.id}`} className="flex items-center gap-3 hover:text-accent">
                          <div className="h-8 w-8 rounded-md bg-primary/5 text-primary flex items-center justify-center">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="font-medium">{d.name}</div>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{d.type}</td>
                      <td className="px-5 py-3">
                        <div>{d.uploadedBy}</div>
                        <div className="text-xs text-muted-foreground">{d.owner}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{d.version}</td>
                      <td className="px-5 py-3"><StatusBadge variant={tone(d.status)}>{d.status}</StatusBadge></td>
                      <td className="px-5 py-3 text-muted-foreground">{d.uploadedAt}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button asChild size="icon" variant="ghost"><Link to={`/documents/${d.id}`}><Eye className="h-4 w-4" /></Link></Button>
                          <Button asChild size="icon" variant="ghost">
                            <a href={getDocumentDownloadUrl(d.id)}><Download className="h-4 w-4" /></a>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b">
              <div className="text-xs text-muted-foreground">Preview</div>
              <div className="font-medium">{docs[0]?.name ?? "No document selected"}</div>
            </div>
            <div className="aspect-[3/4] bg-muted/40 border-b flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto opacity-50" />
                <div className="text-xs mt-2">PDF preview</div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Structured metadata
              </div>
              {(docs[0]?.metadata ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">Data not found</div>
              ) : (
                (docs[0]?.metadata ?? []).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 text-sm border-b last:border-0 pb-2">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-right">{v}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
