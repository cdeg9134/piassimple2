import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";

interface AdminUnlockModalProps {
  isOpen: boolean;
  onUnlocked: (password: string) => void;
}

export function AdminUnlockModal({ isOpen, onUnlocked }: AdminUnlockModalProps) {
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();
  const { settings } = useSettings();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setChecking(true);
    try {
      if (settings?.adminPassword && password === settings.adminPassword) {
        onUnlocked(password);
        setPassword("");
      } else {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Incorrect management password.",
        });
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Management Access Required</DialogTitle>
          <DialogDescription>
            Please enter the management password to access shop settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUnlock} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password">Management Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!password || checking}>
              {checking ? "Checking..." : "Unlock Settings"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
