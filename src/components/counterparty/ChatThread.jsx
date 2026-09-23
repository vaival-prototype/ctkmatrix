import { forwardRef } from "react";

const ChatThread = forwardRef(function ChatThread({ messages }, ref) {
  return (
    <div ref={ref} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-muted/30">
      {messages.map((m) => {
        if (m.author === "system") {
          return (
            <div key={m.id} className="text-center">
              <span className="inline-block text-[11px] text-muted-foreground bg-background border rounded-full px-3 py-1">
                {m.text}
              </span>
            </div>
          );
        }
        const mine = m.author === "me";
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className="text-[11px] text-muted-foreground">
                {m.name}{m.org ? ` · ${m.org}` : ""} · {m.time}
              </div>
              <div
                className={`rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                  mine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-background border rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default ChatThread;
