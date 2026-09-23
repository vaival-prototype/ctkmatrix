import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LockKeyhole } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-card border-accent/50">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-xl font-semibold">You do not have access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This shared claim matrix is outside your organization membership or invitation scope.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild><Link to="/dashboard">Go to dashboard</Link></Button>
            <Button asChild variant="outline"><Link to="/invitations">View invitations</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
