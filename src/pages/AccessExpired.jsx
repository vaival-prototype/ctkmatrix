import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClockAlert } from "lucide-react";

export default function AccessExpired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-card border-accent/50">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-warning/20 text-warning-foreground">
            <ClockAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-xl font-semibold">Invitation access expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Invitations are valid for 7 days and this one has run out. Ask the person who invited you to send a new
            invitation.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild><Link to="/signin">Sign in</Link></Button>
            <Button asChild variant="outline"><Link to="/request-access">Request access instead</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
