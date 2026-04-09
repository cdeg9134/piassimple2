import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTicketMutations } from "@/hooks/use-tickets";
import { useToast } from "@/hooks/use-toast";

interface UnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: number;
  section: string;
  onUnlocked: (role?: string) => void;
}

export function UnlockModal({ isOpen, onClose, ticketId, section, onUnlocked }: UnlockModalProps) {
  const [password, setPassword] = useState("");
  const { unlockTicket, isUnlocking } = useTicketMutations();
  const { toast } = useToast();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await unlockTicket({ id: ticketId, data: { password, section } });
      if (res.success) {
        toast({
          title: "Section unlocked",
          description: `Unlocked with ${res.role} privileges.`,
        });
        onUnlocked(res.role);
        onClose();
        setPassword("");
      } else {
        toast({
          variant: "destructive",
          title: "Unlock failed",
          description: "Incorrect password.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unlock section.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock Section</DialogTitle>
          <DialogDescription>
            Enter your staff or admin password to unlock this section for editing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUnlocking || !password}>
              {isUnlocking ? "Unlocking..." : "Unlock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
