import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Inbox, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useDemoEmails } from "@/hooks/useDemoEmails";

function formatTime(iso) {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
}

/**
 * Prototype-only: every email the demo "sends" (invites, set-password links,
 * decisions) lands here, so the whole flow can be clicked through without a
 * real mailbox. "Open as recipient" signs out whoever is signed in first,
 * then follows the link the way the recipient would.
 */
export default function DemoInbox() {
  const navigate = useNavigate();
  const { user, logout, ssoLogin } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [openingId, setOpeningId] = useState(null);
  const { data, loading, error } = useDemoEmails(refreshKey);

  const emails = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = data ?? [];
    if (!q) return items;
    return items.filter((e) =>
      [e.to, e.toName, e.subject].some((field) => String(field ?? "").toLowerCase().includes(q))
    );
  }, [data, query]);

  async function openAsRecipient(email) {
    const { cta } = email;
    setOpeningId(email.id);
    try {
      if (cta.openAs === "sso") {
        await ssoLogin(cta.email ?? email.to);
      } else if (user) {
        await logout();
      }
      navigate(cta.path);
    } catch (err) {
      toast.error(err.message || "Couldn't open this link");
      setOpeningId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b-4 border-accent bg-primary text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
            CM
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold">Demo inbox</h1>
            <p className="truncate text-xs text-primary-foreground/70">Simulated emails — the prototype never sends real email</p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link to={user ? "/dashboard" : "/signin"}>
              <ArrowLeft className="h-4 w-4" /> {user ? "Back to Matrix" : "Sign in"}
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by recipient or subject"
              className="bg-card pl-9"
              aria-label="Filter emails"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <EmptyState title="Couldn't load the inbox" body={error.message} />
        ) : emails.length === 0 ? (
          <EmptyState
            title={query ? "No emails match" : "No emails yet"}
            body={query ? "Try a different name or subject." : "Emails appear here when someone is invited, approved or rejected."}
          />
        ) : (
          <ul className="space-y-3">
            {emails.map((email) => (
              <li key={email.id}>
                <Card className="shadow-card">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
                          To {email.toName} &lt;{email.to}&gt;
                        </div>
                        <h2 className="mt-1 font-semibold">{email.subject}</h2>
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground" dateTime={email.sentAt}>
                        {formatTime(email.sentAt)}
                      </time>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{email.body}</p>
                    {email.cta && (
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <Button size="sm" variant="success" disabled={openingId !== null} onClick={() => openAsRecipient(email)}>
                          {openingId === email.id ? "Opening…" : `${email.cta.label} as ${email.toName}`}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        {user && email.cta.openAs !== "sso" && (
                          <span className="text-xs text-muted-foreground">Signs out {user.name} first.</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
