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
            <ClockAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-xl font-semibold">Invitation access expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invitation link is no longer active. Request a new invitation from the initiating adjuster or company admin.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild><Link to="/">Sign in</Link></Button>
            <Button asChild variant="outline"><Link to="/invitations/inv-0148-harbor">Request new access</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
