import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuditEvents } from "@/hooks/useAuditEvents";
import { Search, Download, ShieldCheck, Sparkles } from "lucide-react";

const LIMIT = 25;

export default function Audit() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const { data, meta, loading, error } = useAuditEvents(null, { page, limit: LIMIT });

  const events = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = data ?? [];
    if (!q) return items;
    return items.filter((e) =>
      [e.actor, e.actorCompany, e.action, e.target, e.matrixCode].some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [data, query]);
  const total = meta?.total ?? (data ?? []).length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <PageHeader
        title="Audit Trail"
        subtitle="Every action on every claim — visible to the Admin and Approvers only"
        actions={
          <>
            <Button variant="outline" size="sm" disabled title="CSV export isn't available yet">
              <Download className="h-4 w-4" /> Export CSV <StatusBadge variant="warning"><Sparkles className="h-3 w-3" /> Coming soon</StatusBadge>
            </Button>
            <Button variant="outline" size="sm" disabled title="Integrity verification isn't available yet">
              <ShieldCheck className="h-4 w-4" /> Verify integrity <StatusBadge variant="warning"><Sparkles className="h-3 w-3" /> Coming soon</StatusBadge>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter this page by person, claim or action…"
            className="pl-9 bg-card"
            aria-label="Filter audit events"
          />
        </div>
      </div>

      <Card className="shadow-card border-accent/50 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <Spinner />
          ) : error ? (
            <div className="p-6 text-sm text-destructive">Failed to load audit trail: {error.message}</div>
          ) : events.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title={query ? "No events match" : "No audit events"}
                body={query ? "Try a different name, claim or action." : "Activity is recorded here as it happens."}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 w-56">Timestamp</th>
                  <th className="text-left px-5 py-3">Actor</th>
                  <th className="text-left px-5 py-3">Action</th>
                  <th className="text-left px-5 py-3">Target</th>
                  <th className="text-left px-5 py-3">{`Old → New`}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/40 align-top">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium">{e.actor}</div>
                      {e.actorCompany && <div className="text-xs text-muted-foreground">{e.actorCompany}</div>}
                    </td>
                    <td className="px-5 py-3"><StatusBadge variant="info">{e.action}</StatusBadge></td>
                    <td className="px-5 py-3 text-xs">
                      {e.matrixCode ? <Link to={`/claims/${e.matrixCode}`} className="font-mono text-accent hover:underline">{e.matrixCode}</Link> : null}
                      {e.target && e.target !== e.matrixCode && <div className="text-muted-foreground">{e.target}</div>}
                    </td>
                    <td className="px-5 py-3">
                      {e.oldValue && <div className="text-xs text-muted-foreground line-through">{e.oldValue}</div>}
                      <div className="font-medium">{e.newValue ?? "—"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && !error && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Page {page} of {totalPages} · {total} events</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Audit events are append-only and cryptographically chained. Records are retained per
        Claim Toolkit organization policy and exportable for compliance review.
      </p>
    </>
  );
}
