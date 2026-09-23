import { Bell } from "lucide-react";

export default function NotificationBell() {
  return (
    <button className="relative rounded-md p-2 hover:bg-primary-foreground/10">
      <Bell className="h-5 w-5 text-primary-foreground/75" />
      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
    </button>
  );
}
