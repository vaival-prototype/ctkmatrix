import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import { MessageSquare, ShieldCheck } from "lucide-react";
import ChatThread from "./ChatThread";
import ChatInput from "./ChatInput";

const counterpartyByClaim = {
  "CM-2406-0148": { name: "Maria Chen", org: "Atlas Mutual", role: "Supervisor", phone: "(415) 555-0148", email: "maria.chen@atlasmutual.com" },
  "CM-2406-0142": { name: "Lena Ortiz", org: "Harbor Re", role: "External Adjuster", phone: "(312) 555-0142", email: "lena.ortiz@harborre.com" },
  "CM-2406-0140": { name: "Owen Reyes", org: "Continental", role: "Adjuster", phone: "(214) 555-0140", email: "owen.reyes@continental.com" },
  "CM-2406-0139": { name: "Priya Shah", org: "Sentinel", role: "Adjuster", phone: "(646) 555-0139", email: "priya.shah@sentinel.com" },
  "CM-2406-0131": { name: "Maria Chen", org: "Atlas Mutual", role: "Supervisor", phone: "(415) 555-0148", email: "maria.chen@atlasmutual.com" },
  "CM-2406-0128": { name: "Rafael Gomez", org: "BuildSafe", role: "Adjuster", phone: "(702) 555-0128", email: "rafael.gomez@buildsafe.com" },
};

const availabilityByClaim = {
  "CM-2406-0148": true,
  "CM-2406-0142": false,
  "CM-2406-0139": false,
  "CM-2406-0131": false,
  "CM-2406-0140": false,
  "CM-2406-0128": true,
};

const seedThread = (claimId, party) => [
  { id: "s1", author: "system", text: `Secure Claim Matrix channel opened for ${claimId}. All messages are logged to the audit trail.`, time: "Today 09:02" },
  { id: "m1", author: "them", name: party.name, org: party.org, text: "Morning — reviewed your revised liability split. Want to talk through the witness statement before we counter?", time: "Today 09:14" },
  { id: "m2", author: "me", name: "You", org: "Northbridge Insurance", text: "Yes — the dashcam still corroborates Ortiz's statement on lane position. Happy to walk through it.", time: "Today 09:17" },
];

export function CounterpartyChat({ open, onOpenChange, claimId, subject, party: partyOverride }) {
  const party = partyOverride ?? counterpartyByClaim[claimId] ?? { name: "Counterparty Adjuster", org: "Counterparty", phone: "", email: "" };
  const [messages, setMessages] = useState(() => seedThread(claimId, party));
  const [input, setInput] = useState("");
  const scrollerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setMessages(seedThread(claimId, party));
    setInput("");
  }, [claimId, party.name, party.org]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open, messages.length]);

  const initials = useMemo(
    () => party.name.split(" ").map((p) => p[0]).slice(0, 2).join(""),
    [party.name]
  );

  const handleSend = (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = `Today ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    setMessages((prev) => [...prev, { id: `me-${prev.length}`, author: "me", name: "You", org: "Northbridge Insurance", text, time }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `them-${prev.length}`,
          author: "them",
          name: party.name,
          org: party.org,
          text: "Got it — let me pull up the file and circle back in a few minutes.",
          time: `Today ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        },
      ]);
    }, 900);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base flex items-center gap-2">
                {party.name}
                <StatusBadge variant={availabilityByClaim[claimId] ? "success" : "danger"}>
                  {availabilityByClaim[claimId] ? "Available" : "Unavailable"}
                </StatusBadge>
              </SheetTitle>
              <SheetDescription className="text-xs">
                {party.org}{party.role ? ` · ${party.role}` : ""} · Matrix <span className="font-mono">{claimId}</span>
              </SheetDescription>
              {subject ? <div className="mt-1 text-xs text-muted-foreground truncate">{subject}</div> : null}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            End-to-end logged · Visible to matrix participants · Audit trail enabled
          </div>
        </SheetHeader>

        <ChatThread ref={scrollerRef} messages={messages} />

        <ChatInput
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSubmit={handleSend}
          placeholder={`Message ${party.name.split(" ")[0]}\u2026`}
        />
      </SheetContent>
    </Sheet>
  );
}

export function ChatButton({ claimId, subject, variant = "ghost", size = "icon", label }) {
  const [open, setOpen] = useState(false);
  const party = counterpartyByClaim[claimId];
  const available = availabilityByClaim[claimId] ?? false;

  if (!label) {
    return (
      <>
        <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)} aria-label="Open counterparty chat" className="relative">
          <MessageSquare className="h-4 w-4" />
          {available && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />}
        </Button>
        <CounterpartyChat open={open} onOpenChange={setOpen} claimId={claimId} subject={subject} />
      </>
    );
  }

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)} className="relative">
        <MessageSquare className="h-4 w-4" />
        {label}
        {available && <span className="ml-1.5 h-2 w-2 rounded-full bg-green-500 inline-block" />}
      </Button>
      <CounterpartyChat open={open} onOpenChange={setOpen} claimId={claimId} subject={subject} party={party} />
    </>
  );
}

export default CounterpartyChat;
