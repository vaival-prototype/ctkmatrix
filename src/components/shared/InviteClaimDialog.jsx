import { useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import InviteesField from "@/components/shared/InviteesField";
import { useAuth } from "@/context/AuthContext";
import { inviteToClaim } from "@/services/claimService";
import { emptyInvitee, toInviteePayload, validateInvitees } from "@/utils/invitees";
import { resolveLookups } from "@/utils/inviteeLookup";

/** "Invite people" on a shared claim — Admin, Level 3 and Level 2 only. */
export default function InviteClaimDialog({ claimId, claimTitle, onInvited }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [invitees, setInvitees] = useState(() => [emptyInvitee()]);
  const [message, setMessage] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);

  function reset() {
    setInvitees([emptyInvitee()]);
    setMessage("");
    setShowErrors(false);
  }

  async function handleSend() {
    setSending(true);
    const resolved = await resolveLookups(invitees);
    setInvitees(resolved);
    setShowErrors(true);
    if (Object.keys(validateInvitees(resolved, user?.email)).length) {
      setSending(false);
      return;
    }
    try {
      await inviteToClaim(claimId, { invitees: toInviteePayload(resolved), message: message.trim() });
      toast.success("Invitations sent — see the Participants tab");
      setOpen(false);
      reset();
      onInvited?.();
    } catch (err) {
      toast.error(err.message || "Couldn't send the invitations");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4" /> Invite people
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>Add people to “{claimTitle}”. They're emailed an invitation.</DialogDescription>
        </DialogHeader>
        <InviteesField
          value={invitees}
          onChange={setInvitees}
          errors={validateInvitees(invitees, user?.email)}
          showErrors={showErrors}
        />
        <div className="space-y-1.5">
          <Label htmlFor="invite-message" className="text-xs">
            Message (optional)
          </Label>
          <Textarea id="invite-message" rows={2} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "Sending…" : "Send invitations"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
