import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/hooks/useUsers";
import { useCompanies } from "@/hooks/useCompanies";
import { useRbacPolicy } from "@/hooks/useRbacPolicy";
import { usePermissions } from "@/hooks/usePermissions";
import { useMembershipHistory } from "@/hooks/useMembershipHistory";
import { updateUser, getUserMemberships } from "@/services/userService";
import { updateRbacPolicy } from "@/services/adminService";
import { pickData } from "@/services/api";
import { toast } from "sonner";
import { ArrowRightLeft, Building2, History, KeyRound, Plus, RefreshCcw, Search, ShieldCheck, UserPlus, UsersRound, X } from "lucide-react";

const identityModelCards = [
  { title: "Claim Toolkit mapping", body: "Claim Toolkit users are synchronized into Claim Matrix using persistent identity references.", icon: KeyRound },
  { title: "Local identities", body: "External and Claim Matrix-only users can exist without being provisioned into Claim Toolkit.", icon: UserPlus },
  { title: "Multi-company membership", body: "The same person can belong to multiple companies and switch active context.", icon: Building2 },
  { title: "Historical audit safety", body: "Actions remain tied to the company membership active at the time of action.", icon: History },
];

function PermissionValue({ value }) {
  const variant = value === "yes" ? "success" : value === "maybe" ? "warning" : "muted";
  const label = value === "yes" ? "Yes" : value === "maybe" ? "Maybe" : "No";
  return <StatusBadge variant={variant}>{label}</StatusBadge>;
}

function PermissionSelect({ value, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 min-w-[92px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="yes">Yes</SelectItem>
        <SelectItem value="no">No</SelectItem>
        <SelectItem value="maybe">Maybe</SelectItem>
      </SelectContent>
    </Select>
  );
}

function UserField({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function UserDetailsDialog({ user, onClose, onSaved, companies, roles, canManage }) {
  const [memberships, setMemberships] = useState([]);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  const [addCompany, setAddCompany] = useState("");
  const [addRole, setAddRole] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      return;
    }
    setLoadingMemberships(true);
    getUserMemberships(user.id)
      .then((res) => setMemberships((pickData(res) ?? []).map((m) => ({ company: m.company, role: m.role ?? "", isPrimary: m.isPrimary }))))
      .catch(() => setMemberships([]))
      .finally(() => setLoadingMemberships(false));
  }, [user]);

  if (!user) return null;

  const availableCompanies = (companies ?? []).filter((c) => !memberships.some((m) => m.company === c.name));

  const removeMembership = (company) =>
    setMemberships((c) => {
      const next = c.filter((m) => m.company !== company);
      // If the removed membership was primary, promote the next remaining one so the
      // primary company shown in the users table doesn't silently go stale.
      if (next.length > 0 && !next.some((m) => m.isPrimary)) next[0] = { ...next[0], isPrimary: true };
      return next;
    });
  const setMembershipRole = (company, role) => setMemberships((c) => c.map((m) => (m.company === company ? { ...m, role } : m)));
  const setPrimary = (company) => setMemberships((c) => c.map((m) => ({ ...m, isPrimary: m.company === company })));

  const addMembership = () => {
    const companyName = addCompany || availableCompanies[0]?.name;
    if (!companyName) return;
    setMemberships((c) => [...c, { company: companyName, role: addRole || roles?.[0]?.name || "", isPrimary: c.length === 0 }]);
    setAddCompany("");
    setAddRole("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    payload.memberships = memberships.map((m) => ({ company: m.company, role: m.role || null, isPrimary: m.isPrimary }));
    setSaving(true);
    try {
      await updateUser(user.id, payload);
      toast.success("User profile saved.");
      onSaved();
    } catch (err) {
      toast.error(err.message || "Could not save the user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
          <DialogDescription>Form-style view of the Claim Matrix identity, Claim Toolkit mapping, memberships, and access state.</DialogDescription>
        </DialogHeader>
        <form id="user-details-form" onSubmit={handleSave}>
          <div className="grid max-h-[72vh] grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
            <UserField label="Full name"><Input name="fullName" placeholder="Jane Doe" defaultValue={user.name} /></UserField>
            <UserField label="Work email"><Input name="email" type="email" placeholder="name@company.com" defaultValue={user.email} /></UserField>
            <UserField label="Claim Matrix user id"><Input name="cmUserId" defaultValue={user.id} disabled /></UserField>
            <UserField label="Identity source">
              <Select name="source" defaultValue={user.source}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Claim Toolkit">Claim Toolkit</SelectItem><SelectItem value="Claim Matrix">Claim Matrix</SelectItem></SelectContent>
              </Select>
            </UserField>
            <UserField label="Primary role">
              <Select name="role" defaultValue={user.role}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(roles ?? []).map((r) => <SelectItem key={r.key} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </UserField>
            <UserField label="Status">
              <Select name="status" defaultValue={user.status}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Active","Invited","Suspended","Deactivated"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </UserField>
            <UserField label="Last seen"><Input defaultValue={user.lastSeen} disabled /></UserField>
            <div className="md:col-span-2">
              <UserField label="Company memberships">
                <div className="rounded-md border bg-background p-3">
                  {loadingMemberships ? (
                    <div className="py-3"><Spinner /></div>
                  ) : memberships.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No company memberships yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {memberships.map((m) => (
                        <div key={m.company} className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/25 px-3 py-2">
                          <div className="flex-1 min-w-[140px] text-sm font-medium">{m.company}</div>
                          <Select value={m.role || ""} onValueChange={(v) => setMembershipRole(m.company, v)}>
                            <SelectTrigger className="h-8 w-[160px]"><SelectValue placeholder="Role" /></SelectTrigger>
                            <SelectContent>
                              {(roles ?? []).map((r) => <SelectItem key={r.key} value={r.name}>{r.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            onClick={() => setPrimary(m.company)}
                            className={`rounded-full border px-2 py-0.5 text-[11px] ${m.isPrimary ? "border-accent bg-accent text-accent-foreground" : "hover:border-accent"}`}
                          >
                            {m.isPrimary ? "Primary" : "Make primary"}
                          </button>
                          <button type="button" className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground" aria-label={`Remove ${m.company}`} onClick={() => removeMembership(m.company)}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto]">
                    <Select value={addCompany} onValueChange={setAddCompany}>
                      <SelectTrigger><SelectValue placeholder={availableCompanies.length ? "Add company" : "No more companies"} /></SelectTrigger>
                      <SelectContent>
                        {availableCompanies.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={addRole} onValueChange={setAddRole}>
                      <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                      <SelectContent>
                        {(roles ?? []).map((r) => <SelectItem key={r.key} value={r.name}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={addMembership} disabled={availableCompanies.length === 0}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                </div>
              </UserField>
            </div>
            <div className="md:col-span-2">
              <UserField label="Notes"><Textarea name="notes" rows={3} placeholder="Any context worth flagging for this user — access exceptions, follow-ups, support history…" defaultValue={user.note ?? ""} /></UserField>
            </div>
          </div>
        </form>
        {!canManage && (
          <div className="rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
            Your role does not have permission to manage company users. This form is read-only.
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="user-details-form" variant="success" disabled={saving || !canManage}>{saving ? "Saving…" : "Save user"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRbacDialog({ open, onOpenChange, policy, onSaved }) {
  const [matrix, setMatrix] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMatrix((policy?.matrix ?? []).map((row) => ({ ...row, roles: { ...row.roles } })));
      setSaved(false);
    }
  }, [open, policy]);

  const roles = policy?.roles ?? [];
  const setCell = (functionKey, roleKey, value) =>
    setMatrix((rows) => rows.map((r) => (r.functionKey === functionKey ? { ...r, roles: { ...r.roles, [roleKey]: value } } : r)));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { matrix: Object.fromEntries(matrix.map((row) => [row.functionKey, { ...row.roles }])) };
      await updateRbacPolicy(payload);
      setSaved(true);
      toast.success("RBAC policy saved.");
      onSaved?.();
    } catch (err) {
      toast.error(err.message || "Could not save the RBAC policy.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-120xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Edit RBAC policy</DialogTitle>
          <DialogDescription>Policy editor for role permissions. "Maybe" means the action depends on company or matrix configuration.</DialogDescription>
        </DialogHeader>
        {saved && (
          <div className="flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
            <ShieldCheck className="h-4 w-4" /> RBAC policy saved.
          </div>
        )}
        <div className="max-h-[68vh] overflow-auto rounded-md border">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Function</th>
                {roles.map((role) => <th key={role.key} className="px-3 py-3 text-left">{role.name}</th>)}
                <th className="px-4 py-3 text-left">Conditional note</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-background">
              {matrix.map((row) => (
                <tr key={row.functionKey}>
                  <td className="px-4 py-3 font-medium align-top">{row.function}</td>
                  {roles.map((role) => (
                    <td key={role.key} className="px-3 py-3 align-top">
                      <PermissionSelect value={row.roles[role.key] ?? "no"} onChange={(v) => setCell(row.functionKey, role.key, v)} />
                    </td>
                  ))}
                  <td className="px-4 py-3 align-top text-xs text-muted-foreground">{row.note ?? "Standard role permission."}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-md border bg-muted/35 p-3 text-xs text-muted-foreground">"Maybe" means the action depends on company configuration, matrix state, supervisor approval, or invitation policy.</div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" variant="success" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save RBAC policy"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsers() {
  const location = useLocation();
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditingRbac, setIsEditingRbac] = useState(false);
  const [usersRefreshKey, setUsersRefreshKey] = useState(0);
  const { data: users, loading, error } = useUsers(usersRefreshKey);
  const { data: companies } = useCompanies();
  const { data: rbacPolicy, refresh: refreshRbac } = useRbacPolicy();
  const { data: membershipHistory, loading: historyLoading } = useMembershipHistory(usersRefreshKey);
  const { can } = usePermissions();
  const canManageUsers = can("manage-company-users");

  const handleUserSaved = () => {
    setSelectedUser(null);
    setUsersRefreshKey((k) => k + 1);
  };

  if (location.pathname !== "/admin/users") {
    return <Outlet />;
  }

  const rows = users ?? [];
  const roles = rbacPolicy?.roles ?? [];

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Mapped Claim Toolkit users, local Claim Matrix users, and company memberships"
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/admin/users/sync"><RefreshCcw className="h-4 w-4" /> Sync Claim Toolkit Users</Link></Button>
            {canManageUsers && (
              <Button asChild size="sm"><Link to="/admin/users/new"><UserPlus className="h-4 w-4" /> Add local user</Link></Button>
            )}
          </div>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search users, email, company or role..." className="pl-9 bg-card" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-5">
        {identityModelCards.map((card) => (
          <Card key={card.title} className="shadow-card border-accent/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><card.icon className="h-4 w-4 text-accent" />{card.title}</div>
              <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.body}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card border-accent/50 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <Spinner />
          ) : error ? (
            <div className="p-6 text-sm text-destructive">{error.message}</div>
          ) : rows.length === 0 ? (
            <div className="p-6"><EmptyState title="Data not found" body="No Claim Matrix users are available yet." /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3">User</th>
                  <th className="text-left px-5 py-3">Source</th>
                  <th className="text-left px-5 py-3">Company</th>
                  <th className="text-left px-5 py-3">Role</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Last seen</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((user) => (
                  <tr key={user.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedUser(user)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedUser(user); }}>
                    <td className="px-5 py-4">
                      <button type="button" className="font-medium hover:text-accent" onClick={() => setSelectedUser(user)}>{user.name}</button>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </td>
                    <td className="px-5 py-4"><StatusBadge variant={user.source === "Claim Toolkit" ? "info" : "muted"}>{user.source}</StatusBadge></td>
                    <td className="px-5 py-4">{user.company}</td>
                    <td className="px-5 py-4">{user.role}</td>
                    <td className="px-5 py-4"><StatusBadge variant={user.status === "Active" ? "success" : "warning"}>{user.status}</StatusBadge></td>
                    <td className="px-5 py-4 text-muted-foreground">{user.lastSeen}</td>
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" disabled title="Edit memberships from the user details dialog">
                        <ArrowRightLeft className="h-4 w-4" /> Memberships
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
        <Card className="shadow-card border-accent/50 xl:col-span-2">
          <CardContent className="p-0">
            <div className="border-b px-5 py-4 font-medium">Company membership history</div>
            {historyLoading ? (
              <div className="p-6"><Spinner /></div>
            ) : !membershipHistory || membershipHistory.length === 0 ? (
              <div className="p-6"><EmptyState title="No membership changes yet" body="Membership activity will appear here as users are added to or removed from companies." /></div>
            ) : (
              <ul className="divide-y">
                {membershipHistory.map((h, i) => (
                  <li key={i} className="flex items-start gap-3 px-5 py-3 text-sm">
                    <UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div className="flex-1">
                      <div>
                        <span className="font-medium">{h.userName}</span>{" "}
                        {h.action === "Added" ? "was added to" : "was removed from"}{" "}
                        <span className="font-medium">{h.company}</span>
                        {h.role ? ` as ${h.role}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(h.changedAt).toLocaleString()}{h.changedBy ? ` · by ${h.changedBy}` : ""}
                      </div>
                    </div>
                    <StatusBadge variant={h.action === "Added" ? "success" : "warning"}>{h.action}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-card border-accent/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-accent" /> Supported user types</div>
            {["Claim Toolkit mapped users", "Claim Matrix-only local users", "External adjusters by email", "Supervisors and company admins", "Claim Matrix super admins", "Customer service/admin support"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{item}</div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card border-accent/50 mt-5 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div><div className="font-medium">Role-based access control matrix</div><div className="text-xs text-muted-foreground">Policy surface for functional permissions by role.</div></div>
            <div className="flex items-center gap-2">
              <StatusBadge variant="success">RBAC enabled</StatusBadge>
              <Button type="button" size="sm" variant="outline" onClick={() => setIsEditingRbac(true)}><ShieldCheck className="h-4 w-4" /> Edit RBAC</Button>
            </div>
          </div>
          {!rbacPolicy ? (
            <div className="p-6"><Spinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="px-5 py-3 text-left">Function</th>{roles.map((role) => <th key={role.key} className="px-4 py-3 text-center">{role.name}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {rbacPolicy.matrix.map((row) => (
                    <tr key={row.functionKey} className="hover:bg-muted/35">
                      <td className="px-5 py-3 font-medium">{row.function}</td>
                      {roles.map((role) => <td key={role.key} className="px-4 py-3 text-center"><PermissionValue value={row.roles[role.key] ?? "no"} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserDetailsDialog user={selectedUser} onClose={() => setSelectedUser(null)} onSaved={handleUserSaved} companies={companies} roles={roles} canManage={canManageUsers} />
      <EditRbacDialog open={isEditingRbac} onOpenChange={setIsEditingRbac} policy={rbacPolicy} onSaved={refreshRbac} />
    </>
  );
}
