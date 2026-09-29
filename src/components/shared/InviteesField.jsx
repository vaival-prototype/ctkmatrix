import { useState } from "react";
import { Plus, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import StatusBadge from "@/components/shared/StatusBadge";
import { emptyInvitee, isValidEmail } from "@/utils/invitees";
import { lookupInvitee } from "@/utils/inviteeLookup";

/**
 * Invite list used when starting a Matrix and from a claim's "Invite people"
 * dialog. Each email is looked up: an existing account joins at its own
 * level; an unknown email needs "company user" (Level 1) or "person in the
 * claim" (Level 4) and a name. `onChange` must accept an updater function
 * (pass a React state setter).
 */
export default function InviteesField({ value, onChange, errors = {}, showErrors }) {
  const [checking, setChecking] = useState({});

  function update(key, patch) {
    onChange(value.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function checkEmail(row) {
    if (!isValidEmail(row.email)) return;
    setChecking((c) => ({ ...c, [row.key]: true }));
    const lookup = await lookupInvitee(row.email);
    // Updater form: other rows may have changed while this lookup was running.
    onChange((rows) => rows.map((r) => (r.key === row.key ? { ...r, lookup, name: lookup.known ? lookup.name : r.name } : r)));
    setChecking((c) => ({ ...c, [row.key]: false }));
  }

  return (
    <div className="space-y-3">
      {value.map((row, index) => {
        const lookup = row.lookup;
        const error = showErrors ? errors[row.key] : null;
        return (
          <div key={row.key} className="space-y-3 rounded-md border bg-background p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`invitee-${row.key}`} className="text-xs">
                  Email {value.length > 1 ? index + 1 : ""}
                </Label>
                <Input
                  id={`invitee-${row.key}`}
                  type="email"
                  placeholder="name@company.com"
                  value={row.email}
                  onChange={(e) => update(row.key, { email: e.target.value, lookup: null })}
                  onBlur={() => checkEmail(row)}
                  aria-invalid={!!error}
                  aria-describedby={error ? `invitee-${row.key}-error` : undefined}
                />
              </div>
              {value.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${row.email || "this person"}`}
                  onClick={() => onChange(value.filter((r) => r.key !== row.key))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {checking[row.key] && <p className="text-xs text-muted-foreground">Checking…</p>}

            {lookup?.known && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <UserCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="font-medium">{lookup.name}</span>
                <span className="text-muted-foreground">{lookup.company ?? "Individual"}</span>
                <StatusBadge variant="success">{lookup.tierLabel}</StatusBadge>
                <span className="text-xs text-muted-foreground">
                  {lookup.isCtk ? "Claim Toolkit user — joins straight away" : "Existing Matrix account — joins straight away"}
                </span>
              </div>
            )}

            {lookup && !lookup.known && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">New to Claim Matrix. Who are they?</p>
                <RadioGroup
                  value={row.type}
                  onValueChange={(type) => update(row.key, { type })}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  aria-label="Account type for this person"
                >
                  <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 hover:border-accent">
                    <RadioGroupItem value="company-user" className="mt-0.5" />
                    <span className="text-sm">
                      <span className="font-medium">Company user · Level 1</span>
                      <span className="block text-xs text-muted-foreground">Requests access; an Admin approves</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 hover:border-accent">
                    <RadioGroupItem value="claim-party" className="mt-0.5" />
                    <span className="text-sm">
                      <span className="font-medium">Person in the claim · Level 4</span>
                      <span className="block text-xs text-muted-foreground">Sets a password and views the claim</span>
                    </span>
                  </label>
                </RadioGroup>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`invitee-name-${row.key}`} className="text-xs">
                      Name
                    </Label>
                    <Input
                      id={`invitee-name-${row.key}`}
                      value={row.name}
                      onChange={(e) => update(row.key, { name: e.target.value })}
                    />
                  </div>
                  {row.type === "company-user" && (
                    <div className="space-y-1.5">
                      <Label htmlFor={`invitee-company-${row.key}`} className="text-xs">
                        Company (optional)
                      </Label>
                      <Input
                        id={`invitee-company-${row.key}`}
                        value={row.company}
                        onChange={(e) => update(row.key, { company: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p id={`invitee-${row.key}-error`} className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        );
      })}

      {showErrors && errors.list && (
        <p className="text-xs text-destructive" role="alert">
          {errors.list}
        </p>
      )}

      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, emptyInvitee()])}>
        <Plus className="h-4 w-4" /> Add another person
      </Button>
      <p className="text-xs text-muted-foreground">
        Access is per person: only the people you add can open this claim. Invitations expire after 7 days.
      </p>
    </div>
  );
}
