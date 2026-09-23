import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { markAllNotificationsRead } from "@/services/notificationService";
import { Bell, Handshake, FileText, MessageSquare, UserPlus, AlertCircle, RefreshCw } from "lucide-react";

// The API provides a `kind` (or falls back to tone) that we map to an icon.
function iconFor(n) {
  const key = (n.kind || n.tone || "").toLowerCase();
  if (key.includes("settle")) return Handshake;
  if (key.includes("liab") || key.includes("warning")) return AlertCircle;
  if (key.includes("doc")) return FileText;
  if (key.includes("invit")) return UserPlus;
  if (key.includes("comment")) return MessageSquare;
  if (key.includes("matrix") || key.includes("update")) return RefreshCw;
  return Bell;
}

function toneClass(tone) {
  return tone === "success" ? "bg-accent/15 text-accent"
    : tone === "warning" ? "bg-warning/20 text-warning-foreground"
    : tone === "info" ? "bg-info/15 text-info"
    : "bg-muted text-muted-foreground";
}

export default function Notifications() {
  const { data, loading, error } = useNotifications();
  const [readAll, setReadAll] = useState(false);

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      setReadAll(true);
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error(err.message || "Failed to mark notifications read");
    }
  }

  const items = (data ?? []).map((n) => (readAll ? { ...n, unread: false } : n));

  // Group by an optional `group` label, preserving arrival order.
  const groups = [];
  for (const item of items) {
    const label = item.group ?? "Recent";
    let group = groups.find((g) => g.label === label);
    if (!group) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  const filters = [
    { l: "All", c: items.length, on: true },
    { l: "Settlements" },
    { l: "Liability changes" },
    { l: "Documents" },
    { l: "Invitations" },
    { l: "Comments" },
  ];

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Cross-organization activity affecting your claim matrixs"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleMarkAll}>Mark all as read</Button>
            <Button asChild variant="outline" size="sm"><Link to="/settings/notifications">Notification settings</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <Card className="lg:col-span-1 shadow-card border-accent/50 h-fit">
          <CardContent className="p-3">
            {filters.map((f) => (
              <button key={f.l} className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${f.on ? "bg-accent text-accent-foreground" : "hover:bg-muted text-foreground"}`}>
                <span>{f.l}</span>
                {f.c != null && <span className={`text-xs ${f.on ? "opacity-80" : "text-muted-foreground"}`}>{f.c}</span>}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-card border-accent/50">
          <CardContent className="p-0">
            {loading ? (
              <Spinner />
            ) : error ? (
              <div className="p-6 text-sm text-destructive">Failed to load notifications: {error.message}</div>
            ) : items.length === 0 ? (
              <div className="p-6"><EmptyState title="You're all caught up" body="New cross-organization activity will show up here." /></div>
            ) : (
              groups.map((g) => (
                <div key={g.label}>
                  <div className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-y">
                    {g.label}
                  </div>
                  <div className="divide-y">
                    {g.items.map((n, i) => {
                      const Icon = iconFor(n);
                      return (
                        <div key={n.id ?? i} className={`px-5 py-4 flex gap-3 hover:bg-muted/30 ${n.unread ? "bg-accent/[0.03]" : ""}`}>
                          <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${toneClass(n.tone)}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-sm">{n.title}</div>
                              {n.unread && <StatusBadge variant="success">New</StatusBadge>}
                            </div>
                            <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0">{n.time}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
