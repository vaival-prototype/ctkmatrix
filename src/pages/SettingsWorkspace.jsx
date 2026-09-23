import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { updateUser } from "@/services/userService";
import { getCurrentUser } from "@/services/authService";
import { pickData } from "@/services/api";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function SettingsWorkspace() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    if (!user?.id || !fullName.trim()) return;
    setSaving(true);
    try {
      await updateUser(user.id, { fullName: fullName.trim() });
      const refreshed = pickData(await getCurrentUser());
      setUser(refreshed ?? { ...user, name: fullName.trim() });
      toast.success("Workspace profile saved");
    } catch (err) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Workspace Settings"
        subtitle="Your display name, organization, and regional preferences"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/settings"><ArrowLeft className="h-4 w-4" /> Back to settings</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={handleSave}>
              <div className="space-y-1.5">
                <Label htmlFor="workspace-name">Display name</Label>
                <Input id="workspace-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{user?.email ?? "—"}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Default organization</Label>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{user?.company ?? "—"}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{user?.role ?? "—"}</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Account source</Label>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{user?.source ?? "—"}</div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving || !fullName.trim()}>{saving ? "Saving…" : "Save changes"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50 h-fit">
          <CardHeader><CardTitle className="text-base">Regional settings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <StatusBadge variant="warning"><Sparkles className="h-3 w-3" /> Coming soon</StatusBadge>
            <p className="text-sm text-muted-foreground">
              Timezone and locale preferences aren't configurable yet. The workspace currently
              displays all dates and times in your browser's local timezone.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
