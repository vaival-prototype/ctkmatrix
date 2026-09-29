import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NoAccess({
  title = "You don't have access to this page",
  body = "Your account type doesn't include this. If you think it should, ask your Claim Matrix Admin.",
}) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center" role="alert">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ShieldAlert className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Button asChild variant="outline" size="sm" className="mt-5">
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
