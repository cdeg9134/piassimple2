import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useTicketMutations } from "@/hooks/use-tickets";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateTicketBody, CreateTicketBodyServiceType } from "@workspace/api-client-react/src/generated/api.schemas";

export default function NewTicket() {
  const [, setLocation] = useLocation();
  const { createTicket, isCreating } = useTicketMutations();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<CreateTicketBody>>({
    serviceType: "ski_full",
    customerName: "",
    customerPhone: "",
    willCall: false,
    services: [],
    customServices: [],
    expressService: false,
    taxExempt: false,
    dropoffDate: new Date().toISOString().split("T")[0],
  });

  const handleCreate = async () => {
    if (!formData.serviceType) return;
    
    try {
      const ticket = await createTicket({
        data: {
          ...(formData as CreateTicketBody),
          serviceType: formData.serviceType as CreateTicketBodyServiceType,
        }
      });
      toast({ title: "Ticket created", description: `Ticket #${ticket.ticketNumber} created successfully.` });
      setLocation(`/tickets/${ticket.id}`);
    } catch (err) {
      toast({ title: "Error", description: "Failed to create ticket.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background pb-24">
      <header className="border-b bg-card text-card-foreground sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold tracking-tight">New Ticket</h1>
          </div>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Ticket"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-4xl mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Initial Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select 
                  value={formData.serviceType} 
                  onValueChange={(val: any) => setFormData({...formData, serviceType: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Service Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ski_full">Ski Full Tune</SelectItem>
                    <SelectItem value="ski_service">Ski Service (Simplified)</SelectItem>
                    <SelectItem value="snowboard_service">Snowboard Service (Simplified)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dropoff Date</Label>
                <Input 
                  type="date" 
                  value={formData.dropoffDate} 
                  onChange={(e) => setFormData({...formData, dropoffDate: e.target.value})} 
                />
              </div>

              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input 
                  placeholder="John Doe"
                  value={formData.customerName || ""} 
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})} 
                />
              </div>

              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input 
                  placeholder="555-0199"
                  value={formData.customerPhone || ""} 
                  onChange={(e) => setFormData({...formData, customerPhone: e.target.value})} 
                />
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              More details (equipment, signatures, pricing) can be filled out after creation.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
