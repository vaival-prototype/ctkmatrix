import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { resetDemoData } from "@/services/demoService";

/** Confirms, wipes every demo change, signs out and returns to sign-in. */
export default function ResetDemoDialog({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuth();
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      await resetDemoData();
      if (isAuthenticated) await logout();
      toast.success("Demo data reset");
      onOpenChange(false);
      navigate("/signin");
    } catch (err) {
      toast.error(err.message || "Couldn't reset the demo data");
    } finally {
      setResetting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
          <AlertDialogDescription>
            Every claim, invitation, request and email created during the demo is deleted and the starting data comes
            back. You'll be signed out.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleReset();
            }}
            disabled={resetting}
          >
            {resetting ? "Resetting…" : "Reset demo data"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
