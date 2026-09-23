import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PresenceDot from "@/components/shared/PresenceDot";

const rolodexContacts = [
  { name: "John Smith", org: "Northbridge Insurance", role: "Senior Adjuster · Initiator", phone: "(412) 555-0148", email: "john.smith@northbridge.com", status: "online", tag: "Initiator" },
  { name: "Maria Chen", org: "Atlas Mutual", role: "Claims Supervisor · Receiver", phone: "(312) 555-0192", email: "maria.chen@atlasmutual.com", status: "online", tag: "Receiver" },
  { name: "Daniel Wu", org: "Pioneer Casualty", role: "Supervisor · Receiver", phone: "(206) 555-0170", email: "daniel.wu@pioneercas.com", status: "away", tag: "Receiver" },
  { name: "Lena Ortiz", org: "Harbor External", role: "External Adjuster", phone: "(415) 555-0133", email: "lena.ortiz@harborext.com", status: "offline", tag: "External" },
  { name: "James Rivera", org: "Northbridge insured", role: "Driver", phone: "(412) 555-2210", email: "j.rivera@example.com", status: "online", tag: "Involved party" },
  { name: "Marcus Trent", org: "Atlas Mutual insured", role: "Driver", phone: "(312) 555-4402", email: "m.trent@example.com", status: "online", tag: "Involved party" },
  { name: "Sofia Alvarez", org: "Passenger", role: "Passenger (Northbridge veh.)", phone: "(412) 555-8891", email: "sofia.a@example.com", status: "away", tag: "Involved party" },
  { name: "Officer B. Hayes", org: "Seattle PD", role: "Responding officer", phone: "(206) 555-0100", email: "b.hayes@seattle.gov", status: "offline", tag: "Police" },
  { name: "Ellen Park", org: "Witness", role: "Bystander witness", phone: "(206) 555-7788", email: "ellen.p@example.com", status: "offline", tag: "Witness" },
];

export default function CollaborationChat() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const contact = rolodexContacts[index];
  const initials = contact.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const available = contact.status === "online";

  const go = (dir) => {
    setIndex((i) =>
      Math.max(0, Math.min(rolodexContacts.length - 1, i + dir))
    );
  };

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        title="Contact rolodex"
        aria-label="Open contact rolodex"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex w-20 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-primary-foreground hover:bg-primary-foreground/10 lg:right-4"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-accent text-accent-foreground shadow-lg ring-1 ring-primary-foreground/15">
          <MessageSquare className="h-6 w-6" />
        </span>
        <span className="text-center text-[10px] font-semibold leading-tight text-primary-foreground">
          Chat
        </span>
      </button>

      {/* Rolodex panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-md border border-primary/30 bg-card shadow-2xl lg:right-28">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-primary px-3 py-2.5 text-primary-foreground">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">Contact Rolodex</div>
                <div className="truncate text-[11px] text-primary-foreground/70">
                  {index + 1} of {rolodexContacts.length} &middot; Participants
                  &amp; Involved Parties
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close rolodex"
              onClick={() => setOpen(false)}
              className="rounded-sm p-1.5 text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {contact.tag}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Previous contact"
                  disabled={index === 0}
                  onClick={() => go(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Next contact"
                  disabled={index === rolodexContacts.length - 1}
                  onClick={() => go(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Contact card */}
            <div className="relative rounded-md border bg-background p-3">
              <span
                className={cn(
                  "absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                  available
                    ? "bg-emerald-500"
                    : contact.status === "away"
                      ? "bg-warning"
                      : "bg-red-500"
                )}
                aria-hidden
              />
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium leading-tight">
                    {contact.name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground leading-tight">
                    {contact.org}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground leading-tight">
                    {contact.role}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {available ? "click to chat" : "message"}
                </span>
                <div className="flex items-center gap-2">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
                      className="text-muted-foreground hover:text-accent"
                      title={contact.phone}
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-muted-foreground hover:text-accent"
                      title={contact.email}
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
