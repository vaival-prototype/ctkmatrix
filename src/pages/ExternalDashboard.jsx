import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useClaims } from "@/hooks/useClaims";
import { FileText, MessageSquare, Upload } from "lucide-react";

export default function ExternalDashboard() {
  const { data, loading, error } = useClaims();
  const matrixs = data ?? [];

  return (
    <>
      <PageHeader
        title="External Workspace"
        subtitle="Limited access to invited Matrixes"
        actions={<StatusBadge variant="warning">Scoped external access</StatusBadge>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6"><Spinner /></div>
            ) : error || matrixs.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Data not found"
                  body={error ? error.message : "No invited matrixs are available yet."}
                />
              </div>
            ) : (
              <div className="divide-y">
                {matrixs.map((matrix) => (
                  <Link key={matrix.id} to={`/claims/${matrix.id}`} className="block p-5 hover:bg-muted/40">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{matrix.id}</span>
                      {matrix.status && (
                        <StatusBadge variant={matrix.status === "under-review" ? "warning" : "info"}>{matrix.status}</StatusBadge>
                      )}
                    </div>
                    <div className="mt-1 font-medium">{matrix.title ?? "—"}</div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {matrix.documents ?? 0} documents</span>
                      <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {matrix.comments ?? 0} messages</span>
                      <span>Access: comment, respond, upload supporting files</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="shadow-card border-accent/50">
            <CardContent className="p-5 space-y-3">
              <div className="font-medium">Allowed actions</div>
              {["View invited matrixs", "Download permitted documents", "Submit structured responses", "Upload supporting evidence"].map((item) => (
                <div key={item} className="text-sm text-muted-foreground">{item}</div>
              ))}
              <Button asChild className="w-full"><Link to="/documents/upload"><Upload className="h-4 w-4" /> Upload evidence</Link></Button>
            </CardContent>
          </Card>
          <EmptyState
            title="No company workspace yet"
            body="External users only see invited matrixs until their company is approved for broader Claim Matrix access."
          />
        </div>
      </div>
    </>
  );
}
