import { useState } from "react";
import { Bot, Mic, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function assistantContext(pathname) {
  if (pathname.startsWith("/claims/")) {
    return {
      scope: "Matrix-aware support",
      title: "Ask CTK can help explain the case record.",
      description:
        "Structured assistant only: summaries, missing facts, methodology checks, and evidence references. It does not make claim decisions.",
      cards: [
        [
          "What changed?",
          "Atlas proposed $24,500 and the liability discussion moved toward a 60/40 position.",
        ],
        [
          "What should I review?",
          "Accident type, right-of-way, speed, lookout, avoidance, physical evidence, and cited statutes.",
        ],
        [
          "What is uncertain?",
          "Sudden stop and reduced visibility are contested facts; adjuster review is required.",
        ],
      ],
      prompts: [
        "Summarize facts",
        "Check methodology",
        "Find missing evidence",
        "Explain statute",
      ],
      input: "Summarize the facts and uncertain issues",
    };
  }
  if (pathname.startsWith("/companies/onboarding")) {
    return {
      scope: "Company enablement support",
      title: "Ask CTK can help configure this company.",
      description:
        "Ask about activation, trust review, billing, notifications, audit visibility, or Claim Matrix extensions.",
      cards: [
        [
          "What is missing?",
          "Trust review, notification contacts, billing owner, and lifecycle decision should be confirmed.",
        ],
        [
          "Can this company collaborate?",
          "Limited collaboration can be enabled while full subscription setup remains pending.",
        ],
        [
          "What stays in Claim Toolkit?",
          "Company ownership and source identity remain mastered by Claim Toolkit.",
        ],
      ],
      prompts: [
        "Review readiness",
        "Explain lifecycle",
        "Check billing setup",
        "Draft approval note",
      ],
      input: "What must be completed before activation?",
    };
  }
  if (pathname.startsWith("/admin")) {
    return {
      scope: "Admin support",
      title: "Ask CTK can help with admin configuration.",
      description:
        "Ask about company enablement, user mapping, approvals, permissions, or sync status.",
      cards: [
        [
          "Which companies need work?",
          "Pioneer Casualty is pending activation and Harbor Legal is under external review.",
        ],
        [
          "What should admin verify?",
          "Agreement status, trust approval, notification contacts, and billing configuration.",
        ],
        [
          "Any identity risk?",
          "Claim Toolkit users are mapped proactively; local users remain separate until linked.",
        ],
      ],
      prompts: [
        "List pending approvals",
        "Check user sync",
        "Review companies",
        "Explain permissions",
      ],
      input: "Show pending admin actions",
    };
  }
  if (pathname.startsWith("/documents")) {
    return {
      scope: "Document support",
      title: "Ask CTK can help with shared evidence.",
      description:
        "Ask about document visibility, missing files, evidence status, or participant access.",
      cards: [
        [
          "Any missing evidence?",
          "Dashcam evidence is requested but not yet uploaded.",
        ],
        [
          "Visibility reminder",
          "Internal Claim Toolkit notes should not be shared unless explicitly scoped.",
        ],
        [
          "Review priority",
          "Police report and settlement worksheet are the key documents for the current dispute.",
        ],
      ],
      prompts: [
        "Find missing docs",
        "Check visibility",
        "Summarize evidence",
        "Draft request",
      ],
      input: "Which documents should I review first?",
    };
  }
  return {
    scope: "Claim Matrix support",
    title: "Ask CTK can help with this Claim Matrix workspace.",
    description:
      "Ask about shared matrixs, Auto package review, companies, notifications, or demo flow.",
    cards: [
      [
        "Where should I start?",
        "Find Matrix shows matrixs created from Claim Toolkit Auto packages.",
      ],
      [
        "What is Claim Matrix for?",
        "Inter-company collaboration, scoped documents, structured responses, settlement, and audit.",
      ],
      [
        "What is phase one?",
        "Redirect from Auto into Claim Matrix, support two-party collaboration, and keep data multi-party-ready.",
      ],
    ],
    prompts: [
      "Guide demo",
      "Explain workflow",
      "Find open items",
      "Summarize roadmap",
    ],
    input: "What should I show next in the demo?",
  };
}

export default function CTKAssistant({ pathname }) {
  const [open, setOpen] = useState(false);
  const context = assistantContext(pathname);

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        title="Ask CTK"
        aria-label="Open Ask CTK"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-4 z-40 flex w-20 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-primary-foreground hover:bg-primary-foreground/10 lg:right-4"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-accent text-accent-foreground shadow-lg ring-1 ring-primary-foreground/15">
          <Bot className="h-6 w-6" />
        </span>
        <span className="text-center text-[10px] font-semibold leading-tight text-primary-foreground">
          Ask CTK
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-4 top-20 z-40 w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-md border border-accent/50 bg-card shadow-2xl lg:right-32">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">Ask CTK</div>
                <div className="text-[11px] text-primary-foreground/70">
                  {context.scope}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close Ask CTK"
              onClick={() => setOpen(false)}
              className="rounded-sm p-1.5 text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex h-[calc(100%-57px)] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="rounded-md border bg-background p-3 text-sm">
                <div className="font-medium">{context.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {context.description}
                </div>
              </div>
              {context.cards.map(([q, a]) => (
                <div
                  key={q}
                  className="rounded-md border bg-background p-3"
                >
                  <div className="text-sm font-medium">{q}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {a}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer input */}
            <div className="border-t bg-muted/25 p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {context.prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:border-accent hover:text-accent"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  defaultValue={context.input}
                  className="bg-background"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Voice input"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="success"
                  size="icon"
                  title="Send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-center text-[10px] italic text-muted-foreground">
                Ask CTK is AI. AI can make mistakes.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
