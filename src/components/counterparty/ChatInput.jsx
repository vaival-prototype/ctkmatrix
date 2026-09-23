import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send } from "lucide-react";

const ChatInput = forwardRef(function ChatInput({ value, onChange, onSubmit, placeholder }, ref) {
  return (
    <form onSubmit={onSubmit} className="border-t bg-background p-3 flex items-center gap-2">
      <Button type="button" variant="ghost" size="icon" aria-label="Attach file">
        <Paperclip className="h-4 w-4" />
      </Button>
      <Input
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={!value.trim()} aria-label="Send message">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
});

export default ChatInput;
