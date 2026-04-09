import { useParams, Link, useLocation } from "wouter";
import { useTicket, useTicketMutations } from "@/hooks/use-tickets";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Tag, Lock, Unlock, Plus, X, Trash2 } from "lucide-react";
import { StatusBadge, ServiceTypeBadge } from "@/components/tickets/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignaturePad } from "@/components/ui/signature-pad";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TICKET_SERVICES, SERVICE_LIST_PRICES, calculateSubtotal, calculateTotal } from "@/lib/pricing";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { UnlockModal } from "@/components/tickets/unlock-modal";

type LocalData = Record<string, any>;

function PickupTagDialog({ ticket, open, onClose }: { ticket: any; open: boolean; onClose: () => void }) {
  const handlePrint = () => {
    const printContent = document.getElementById("pickup-tag-content");
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const customerName = ticket.customerName?.trim() || "Unknown";
    win.document.write(`<html><head><title>Pickup Tag #${ticket.ticketNumber} - ${customerName}</title>
      <style>
        body { font-family: monospace; font-size: 13px; padding: 20px; max-width: 400px; }
        h2 { font-size: 22px; margin: 0 0 4px; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 2px; }
        .value { font-size: 14px; font-weight: bold; margin-bottom: 12px; }
        .status { display: inline-block; padding: 4px 12px; border: 2px solid #000; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
        hr { margin: 12px 0; border: 1px solid #ccc; }
        @media print { button { display: none; } }
      </style>
    </head><body>${printContent.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const serviceTypeLabel = ticket.serviceType === "ski_full"
    ? "Ski Full Adjustment"
    : ticket.serviceType === "ski_service"
    ? "Ski Service"
    : "Snowboard Service";

  const equipDesc = ticket.serviceType === "ski_full"
    ? [ticket.skiBrand, ticket.skiModel, ticket.skiColor].filter(Boolean).join(" ") ||
      [ticket.snowboardBrand, ticket.snowboardModel, ticket.snowboardColor].filter(Boolean).join(" ") ||
      "—"
    : ticket.equipmentDescription || "—";

  const servicesList = ticket.services && ticket.services.length > 0
    ? ticket.services.join(", ")
    : "—";

  const promiseLine = ticket.willCall
    ? "WILL CALL"
    : ticket.promiseDate
    ? ticket.promiseDate
    : "—";

  const statusLabel: Record<string, string> = {
    received: "RECEIVED",
    in_progress: "IN PROGRESS",
    ready_for_pickup: "READY FOR PICKUP",
    completed: "COMPLETED",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pickup Tag</DialogTitle>
        </DialogHeader>
        <div id="pickup-tag-content" className="border rounded-md p-5 font-mono text-sm space-y-3 bg-white text-black">
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500">Ticket</div>
            <div className="text-2xl font-extrabold">#{ticket.ticketNumber}</div>
          </div>
          <hr />
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500">Service Type</div>
            <div className="font-bold">{serviceTypeLabel}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500">Equipment</div>
            <div className="font-bold">{equipDesc}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500">Services</div>
            <div className="font-bold">{servicesList}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500">Promise Date</div>
            <div className="font-bold">{promiseLine}</div>
          </div>
          <hr />
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500">Status</div>
            <div className="inline-block border-2 border-black px-3 py-1 font-extrabold uppercase rounded">
              {statusLabel[ticket.status] || ticket.status}
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handlePrint} className="w-full">
            <Printer className="w-4 h-4 mr-2" /> Print Tag
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { ticket, isLoading, refetch } = useTicket(Number(id));
  const { updateTicket, isUpdating, deleteTicket, isDeleting } = useTicketMutations();
  const { toast } = useToast();

  const [localData, setLocalData] = useState<LocalData>({});
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState("");
  const [tagOpen, setTagOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [newCustomService, setNewCustomService] = useState({ name: "", price: "" });

  useEffect(() => {
    if (ticket) {
      setLocalData({ ...ticket });
    }
  }, [ticket]);

  useEffect(() => {
    if (!ticket) return;
    const name = ticket.customerName?.trim() || "Unknown";
    const safeName = name.replace(/[^a-zA-Z0-9 \-]/g, "").trim();
    const prev = document.title;
    document.title = `Ticket #${ticket.ticketNumber} - ${safeName}`;
    return () => { document.title = prev; };
  }, [ticket?.ticketNumber, ticket?.customerName]);

  const handleChange = useCallback((field: string, value: any) => {
    setLocalData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    if (localData.customerSignature && !localData.customerWaiverAccepted) {
      toast({ title: "Waiver required", description: "Customer must accept the waiver before their signature can be saved.", variant: "destructive" });
      return;
    }
    if (localData.pickupSignature && !localData.pickupWaiverAccepted) {
      toast({ title: "Waiver required", description: "Customer must accept the pickup waiver before the pickup signature can be saved.", variant: "destructive" });
      return;
    }
    try {
      await updateTicket({ id: Number(id), data: localData });
      toast({ title: "Ticket saved" });
      refetch();
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    const prev = document.title;
    const name = ticket.customerName?.trim() || "Unknown";
    const safeName = name.replace(/[^a-zA-Z0-9 \-]/g, "").trim();
    document.title = `Ticket #${ticket.ticketNumber} - ${safeName}`;
    window.print();
    document.title = prev;
  };

  const handleDelete = async () => {
    if (!deletePassword) return;
    try {
      await deleteTicket({ id: Number(id), data: { password: deletePassword } });
      toast({ title: "Ticket deleted" });
      setLocation("/");
    } catch {
      toast({ title: "Invalid admin password", variant: "destructive" });
      setDeletePassword("");
    }
  };

  const isLocked = (section: string) => ticket?.lockedSections?.includes(section) ?? false;

  const handleUnlockRequest = (section: string) => {
    setUnlockTarget(section);
    setUnlockModalOpen(true);
  };

  const handleUnlocked = (section: string) => {
    setLocalData((prev) => ({
      ...prev,
      lockedSections: (prev.lockedSections || []).filter((s: string) => s !== section),
    }));
    refetch();
  };

  const addCustomService = () => {
    if (!newCustomService.name) return;
    const price = parseFloat(newCustomService.price) || 0;
    const updated = [...(localData.customServices || []), { name: newCustomService.name, price }];
    handleChange("customServices", updated);
    setNewCustomService({ name: "", price: "" });
  };

  const removeCustomService = (idx: number) => {
    const updated = (localData.customServices || []).filter((_: any, i: number) => i !== idx);
    handleChange("customServices", updated);
  };

  if (isLoading || !ticket) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const isFull = ticket.serviceType === "ski_full";
  const isSnowboard = ticket.serviceType === "snowboard_service";
  const equipmentSubtotal = isFull ? ((localData.skiPrice || 0) + (localData.bootPrice || 0)) : 0;
  const servicesSubtotal = isFull ? calculateSubtotal(
    localData.services || [],
    localData.customServices || [],
    localData.skiOwnership,
    false,
    localData.ptexPrice,
    localData.expressService,
    localData.serviceAdjustments || {},
  ) : 0;
  const grandSubtotal = equipmentSubtotal + servicesSubtotal;
  const taxRate = localData.taxRate ?? ticket.taxRate ?? 5;
  const total = calculateTotal(grandSubtotal, taxRate, localData.taxExempt);

  return (
    <div className="min-h-screen bg-background pb-32 print:pb-0">
      <header className="border-b bg-card text-card-foreground sticky top-0 z-20 shadow-sm print:static print:shadow-none">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="print:hidden">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold font-mono tracking-tight text-primary">#{ticket.ticketNumber}</h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={ticket.status} />
                <ServiceTypeBadge type={ticket.serviceType} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => setTagOpen(true)}>
              <Tag className="w-4 h-4 mr-2" /> Pickup Tag
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setDeletePassword(""); setDeleteDialogOpen(true); }}
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-5xl mt-6 space-y-6">

        {/* Status & Dates */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Status &amp; Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={localData.status || "received"} onValueChange={(val) => handleChange("status", val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employee Initials</Label>
                <Input
                  value={localData.employeeInitials || ""}
                  onChange={(e) => handleChange("employeeInitials", e.target.value)}
                  maxLength={4}
                  placeholder="e.g. JD"
                />
              </div>
              <div className="space-y-2">
                <Label>Dropoff Date</Label>
                <Input
                  type="date"
                  value={localData.dropoffDate || ""}
                  onChange={(e) => handleChange("dropoffDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Promise Date</Label>
                <Input
                  type="date"
                  value={localData.promiseDate || ""}
                  onChange={(e) => handleChange("promiseDate", e.target.value)}
                  disabled={localData.willCall}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="willCall"
                  checked={!!localData.willCall}
                  onCheckedChange={(val) => handleChange("willCall", !!val)}
                />
                <Label htmlFor="willCall">Will Call</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Section */}
        <SectionCard
          title="Customer Info"
          isLocked={isLocked("customer")}
          onUnlock={() => handleUnlockRequest("customer")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={localData.customerName || ""}
                onChange={(e) => handleChange("customerName", e.target.value)}
                disabled={isLocked("customer")}
                placeholder="Customer full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={localData.customerPhone || ""}
                onChange={(e) => handleChange("customerPhone", e.target.value)}
                disabled={isLocked("customer")}
                placeholder="e.g. 555-0199"
              />
            </div>
            {isFull && (
              <>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={localData.customerAddress || ""}
                    onChange={(e) => handleChange("customerAddress", e.target.value)}
                    disabled={isLocked("customer")}
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={localData.customerCity || ""}
                    onChange={(e) => handleChange("customerCity", e.target.value)}
                    disabled={isLocked("customer")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Province</Label>
                    <Input
                      value={localData.customerProvince || ""}
                      onChange={(e) => handleChange("customerProvince", e.target.value)}
                      disabled={isLocked("customer")}
                      placeholder="e.g. BC"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input
                      value={localData.customerPostal || ""}
                      onChange={(e) => handleChange("customerPostal", e.target.value)}
                      disabled={isLocked("customer")}
                      placeholder="e.g. V1A 2B3"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Weight</Label>
                  <WeightInput
                    value={localData.customerWeight || ""}
                    onChange={(v) => handleChange("customerWeight", v)}
                    disabled={isLocked("customer")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height</Label>
                  <HeightInput
                    value={localData.customerHeight || ""}
                    onChange={(v) => handleChange("customerHeight", v)}
                    disabled={isLocked("customer")}
                  />
                </div>
              </>
            )}

            {/* Waiver & Signature */}
            <div className="md:col-span-2 border rounded-md p-4 bg-muted/10 space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="customerWaiver"
                  checked={!!localData.customerWaiverAccepted}
                  onCheckedChange={(val) => handleChange("customerWaiverAccepted", !!val)}
                  disabled={isLocked("customer")}
                />
                <Label htmlFor="customerWaiver" className="text-sm font-normal leading-snug cursor-pointer">
                  I have read and agree to the shop waiver and terms of service.{" "}
                  <a href="#" className="text-primary underline" onClick={(e) => e.preventDefault()}>View Waiver</a>
                </Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Signer Role</Label>
                  <Select
                    value={localData.customerSignatureRole || "Skier"}
                    onValueChange={(val) => handleChange("customerSignatureRole", val)}
                    disabled={isLocked("customer")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Skier">Skier / Owner</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Guardian">Guardian</SelectItem>
                      <SelectItem value="Agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                  {localData.customerSignatureTimestamp && (
                    <p className="text-xs text-muted-foreground">
                      Signed: {new Date(localData.customerSignatureTimestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Customer Signature</Label>
                {!isLocked("customer") && !localData.customerWaiverAccepted && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
                    <span>⚠️</span>
                    <span>You must accept the waiver above before signing.</span>
                  </div>
                )}
                <SignaturePad
                  initialSignature={localData.customerSignature}
                  disabled={isLocked("customer") || !localData.customerWaiverAccepted}
                  onSign={(sig) => {
                    handleChange("customerSignature", sig);
                    handleChange("customerSignatureTimestamp", new Date().toISOString());
                  }}
                />
                <p className="text-xs text-muted-foreground">Saving with a signature will lock this section.</p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Equipment */}
        <SectionCard
          title="Equipment"
          isLocked={isLocked("equipment")}
          onUnlock={() => handleUnlockRequest("equipment")}
        >
          {!isFull ? (
            <div className="space-y-2">
              <Label>Equipment Description</Label>
              <Textarea
                placeholder="Brand, model, color..."
                value={localData.equipmentDescription || ""}
                onChange={(e) => handleChange("equipmentDescription", e.target.value)}
                disabled={isLocked("equipment")}
                rows={3}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Skis */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Skis</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Brand</Label>
                      <Input
                        value={localData.skiBrand || ""}
                        onChange={(e) => handleChange("skiBrand", e.target.value)}
                        disabled={isLocked("equipment")}
                        placeholder="Rossignol"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Model</Label>
                      <Input
                        value={localData.skiModel || ""}
                        onChange={(e) => handleChange("skiModel", e.target.value)}
                        disabled={isLocked("equipment")}
                        placeholder="Experience 88"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <Input
                        value={localData.skiColor || ""}
                        onChange={(e) => handleChange("skiColor", e.target.value)}
                        disabled={isLocked("equipment")}
                        placeholder="Red/White"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ownership</Label>
                    <Select
                      value={localData.skiOwnership || "customer-owned"}
                      onValueChange={(val) => handleChange("skiOwnership", val)}
                      disabled={isLocked("equipment")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer-owned">Customer Owned</SelectItem>
                        <SelectItem value="store-owned">Store Owned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Boots */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Boots</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Brand</Label>
                      <Input
                        value={localData.bootBrand || ""}
                        onChange={(e) => handleChange("bootBrand", e.target.value)}
                        disabled={isLocked("equipment")}
                        placeholder="Salomon"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Model</Label>
                      <Input
                        value={localData.bootModel || ""}
                        onChange={(e) => handleChange("bootModel", e.target.value)}
                        disabled={isLocked("equipment")}
                        placeholder="S/Pro 110"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <Input
                        value={localData.bootColor || ""}
                        onChange={(e) => handleChange("bootColor", e.target.value)}
                        disabled={isLocked("equipment")}
                        placeholder="Black"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Outsole (mm)</Label>
                      <Input
                        value={localData.bootOutsoleLength || ""}
                        onChange={(e) => handleChange("bootOutsoleLength", e.target.value)}
                        disabled={isLocked("equipment")}
                        placeholder="315"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Boot Ownership</Label>
                    <Select
                      value={localData.bootOwnership || "customer-owned"}
                      onValueChange={(val) => handleChange("bootOwnership", val)}
                      disabled={isLocked("equipment")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer-owned">Customer Owned</SelectItem>
                        <SelectItem value="store-owned">Store Owned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Snowboard (if applicable) */}
                {isSnowboard && (
                  <div className="space-y-4 md:col-span-2">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Snowboard</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Brand</Label>
                        <Input
                          value={localData.snowboardBrand || ""}
                          onChange={(e) => handleChange("snowboardBrand", e.target.value)}
                          disabled={isLocked("equipment")}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Model</Label>
                        <Input
                          value={localData.snowboardModel || ""}
                          onChange={(e) => handleChange("snowboardModel", e.target.value)}
                          disabled={isLocked("equipment")}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Color</Label>
                        <Input
                          value={localData.snowboardColor || ""}
                          onChange={(e) => handleChange("snowboardColor", e.target.value)}
                          disabled={isLocked("equipment")}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Equipment description for full ticket too */}
              <div className="space-y-1">
                <Label className="text-xs">Brief Equipment Notes</Label>
                <Textarea
                  value={localData.equipmentDescription || ""}
                  onChange={(e) => handleChange("equipmentDescription", e.target.value)}
                  disabled={isLocked("equipment")}
                  rows={2}
                  placeholder="Any additional notes about the equipment..."
                />
              </div>
            </div>
          )}
        </SectionCard>

        {/* Services */}
        <SectionCard
          title="Services"
          isLocked={isLocked("services")}
          onUnlock={() => handleUnlockRequest("services")}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {TICKET_SERVICES.map((service) => {
                const isChecked = (localData.services || []).includes(service);
                const adjValue = (localData.serviceAdjustments || {})[service] ?? 0;
                return (
                  <div key={service} className={`rounded-md border p-2 transition-colors ${isChecked ? "bg-primary/5 border-primary/30" : "border-transparent"}`}>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`srv-${service}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const s = new Set(localData.services || []);
                          if (checked) s.add(service);
                          else s.delete(service);
                          handleChange("services", Array.from(s));
                        }}
                        disabled={isLocked("services")}
                      />
                      <Label htmlFor={`srv-${service}`} className="font-normal cursor-pointer flex-1 text-sm">{service}</Label>
                      <span className="text-xs font-mono text-muted-foreground">${SERVICE_LIST_PRICES[service]}</span>
                    </div>
                    {isChecked && !isLocked("services") && (
                      <div className="mt-1.5 ml-6 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Adjust:</span>
                        <Select
                          value={String(adjValue)}
                          onValueChange={(val) => {
                            const adjs = { ...(localData.serviceAdjustments || {}), [service]: Number(val) };
                            handleChange("serviceAdjustments", adjs);
                          }}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[-25, -20, -15, -10, -5].map(v => (
                              <SelectItem key={v} value={String(v)} className="text-xs text-red-600">{v > 0 ? `+$${v}` : `-$${Math.abs(v)}`}</SelectItem>
                            ))}
                            <SelectItem value="0" className="text-xs font-medium">Standard</SelectItem>
                            {[5, 10, 15, 20].map(v => (
                              <SelectItem key={v} value={String(v)} className="text-xs text-green-600">+${v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {adjValue !== 0 && (
                          <span className={`text-xs font-mono ${adjValue > 0 ? "text-green-600" : "text-red-600"}`}>
                            {adjValue > 0 ? `+$${adjValue}` : `-$${Math.abs(adjValue)}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom services */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Custom Services</Label>
              <div className="space-y-2">
                {(localData.customServices || []).map((cs: { name: string; price: number }, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 bg-muted/30 px-3 py-1.5 rounded">{cs.name}</span>
                    <span className="font-mono w-16 text-right">${cs.price.toFixed(2)}</span>
                    {!isLocked("services") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeCustomService(idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {!isLocked("services") && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Service Name</Label>
                    <Input
                      value={newCustomService.name}
                      onChange={(e) => setNewCustomService((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Edge Bevel"
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newCustomService.price}
                      onChange={(e) => setNewCustomService((p) => ({ ...p, price: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={addCustomService}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              )}
            </div>

            {/* PTEX */}
            {isFull && (
              <div className="space-y-1">
                <Label>PTEX Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={localData.ptexPrice || ""}
                  onChange={(e) => handleChange("ptexPrice", e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={isLocked("services")}
                  placeholder="Manual PTEX price"
                  className="w-32"
                />
              </div>
            )}

            {/* Express */}
            <div className={`flex items-center space-x-2 p-3 rounded-md border ${localData.expressService ? "bg-amber-50 border-amber-400 dark:bg-amber-900/20" : "bg-muted/20"}`}>
              <Checkbox
                id="express"
                checked={!!localData.expressService}
                onCheckedChange={(val) => handleChange("expressService", !!val)}
                disabled={isLocked("services")}
              />
              <Label htmlFor="express" className="font-bold cursor-pointer">
                Express Service — doubles total price
              </Label>
            </div>
          </div>
        </SectionCard>

        {/* Pricing (Full Ski Only) */}
        {isFull && (
          <Card className="print:break-inside-avoid">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Pricing Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm max-w-sm">
                {/* Equipment prices */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipment</p>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs w-12">Ski ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={localData.skiPrice || ""}
                      onChange={(e) => handleChange("skiPrice", e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-28 h-8"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs w-12">Boot ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={localData.bootPrice || ""}
                      onChange={(e) => handleChange("bootPrice", e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-28 h-8"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Breakdown */}
                <div className="border-t pt-3 space-y-2">
                  {equipmentSubtotal > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Equipment Subtotal</span>
                      <span className="font-mono">${equipmentSubtotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Services Subtotal</span>
                    <span className="font-mono">${servicesSubtotal.toFixed(2)}</span>
                  </div>
                  {equipmentSubtotal > 0 && (
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Subtotal</span>
                      <span className="font-mono">${grandSubtotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="taxExempt"
                      checked={!!localData.taxExempt}
                      onCheckedChange={(val) => handleChange("taxExempt", !!val)}
                    />
                    <Label htmlFor="taxExempt" className="font-normal cursor-pointer text-xs">Tax Exempt</Label>
                    {!localData.taxExempt && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Rate:</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={taxRate}
                          onChange={(e) => handleChange("taxRate", parseFloat(e.target.value))}
                          className="w-16 h-6 text-xs"
                        />
                        <span className="text-xs">%</span>
                      </div>
                    )}
                  </div>
                  {!localData.taxExempt && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax ({taxRate}%)</span>
                      <span className="font-mono">${(total - grandSubtotal).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-bold text-base">
                    <span>Total</span>
                    <span className="font-mono text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ski Tech Section (Full Only) */}
        {isFull && (
          <SectionCard
            title="Ski Technician"
            isLocked={isLocked("tech")}
            onUnlock={() => handleUnlockRequest("tech")}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Skier Classification</Label>
                  <Select
                    value={localData.skiClassification || ""}
                    onValueChange={(val) => handleChange("skiClassification", val)}
                    disabled={isLocked("tech")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="A – P" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 16 }, (_, i) => String.fromCharCode(65 + i)).map((l) => (
                        <SelectItem key={l} value={l}>
                          Type {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tech Initials</Label>
                  <Input
                    value={localData.techInitials || ""}
                    onChange={(e) => handleChange("techInitials", e.target.value)}
                    disabled={isLocked("tech")}
                    maxLength={4}
                    placeholder="e.g. JD"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Binding Brand</Label>
                  <Input
                    value={localData.bindingBrand || ""}
                    onChange={(e) => handleChange("bindingBrand", e.target.value)}
                    disabled={isLocked("tech")}
                    placeholder="Look"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Binding Model</Label>
                  <Input
                    value={localData.bindingModel || ""}
                    onChange={(e) => handleChange("bindingModel", e.target.value)}
                    disabled={isLocked("tech")}
                    placeholder="Pivot 15"
                  />
                </div>
              </div>

              {/* DIN Settings */}
              <div className="space-y-3">
                <Label className="font-semibold">DIN Settings</Label>
                <p className="text-xs text-muted-foreground">Scroll or type to select — values in 0.25 increments (0–20)</p>
                <datalist id="din-values">
                  {Array.from({ length: 81 }, (_, i) => (i * 0.25).toFixed(2)).map(v => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Left Ski</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="w-12 text-xs">Front</Label>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          list="din-values"
                          value={localData.dinFrontLeft ?? ""}
                          onChange={(e) => handleChange("dinFrontLeft", e.target.value ? parseFloat(e.target.value) : null)}
                          onWheel={(e) => {
                            e.preventDefault();
                            const cur = localData.dinFrontLeft ?? 0;
                            const delta = e.deltaY < 0 ? 0.25 : -0.25;
                            const next = Math.min(20, Math.max(0, Math.round((cur + delta) * 4) / 4));
                            handleChange("dinFrontLeft", next);
                          }}
                          disabled={isLocked("tech")}
                          className="w-24"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="w-12 text-xs">Rear</Label>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          list="din-values"
                          value={localData.dinRearLeft ?? ""}
                          onChange={(e) => handleChange("dinRearLeft", e.target.value ? parseFloat(e.target.value) : null)}
                          onWheel={(e) => {
                            e.preventDefault();
                            const cur = localData.dinRearLeft ?? 0;
                            const delta = e.deltaY < 0 ? 0.25 : -0.25;
                            const next = Math.min(20, Math.max(0, Math.round((cur + delta) * 4) / 4));
                            handleChange("dinRearLeft", next);
                          }}
                          disabled={isLocked("tech")}
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Right Ski</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="w-12 text-xs">Front</Label>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          list="din-values"
                          value={localData.dinFrontRight ?? ""}
                          onChange={(e) => handleChange("dinFrontRight", e.target.value ? parseFloat(e.target.value) : null)}
                          onWheel={(e) => {
                            e.preventDefault();
                            const cur = localData.dinFrontRight ?? 0;
                            const delta = e.deltaY < 0 ? 0.25 : -0.25;
                            const next = Math.min(20, Math.max(0, Math.round((cur + delta) * 4) / 4));
                            handleChange("dinFrontRight", next);
                          }}
                          disabled={isLocked("tech")}
                          className="w-24"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="w-12 text-xs">Rear</Label>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          list="din-values"
                          value={localData.dinRearRight ?? ""}
                          onChange={(e) => handleChange("dinRearRight", e.target.value ? parseFloat(e.target.value) : null)}
                          onWheel={(e) => {
                            e.preventDefault();
                            const cur = localData.dinRearRight ?? 0;
                            const delta = e.deltaY < 0 ? 0.25 : -0.25;
                            const next = Math.min(20, Math.max(0, Math.round((cur + delta) * 4) / 4));
                            handleChange("dinRearRight", next);
                          }}
                          disabled={isLocked("tech")}
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Completion Date</Label>
                <Input
                  type="date"
                  value={localData.techCompletionDate || ""}
                  onChange={(e) => handleChange("techCompletionDate", e.target.value)}
                  disabled={isLocked("tech")}
                  className="w-48"
                />
              </div>

              <div className="space-y-2">
                <Label>Technician Notes</Label>
                <Textarea
                  value={localData.techNotes || ""}
                  onChange={(e) => handleChange("techNotes", e.target.value)}
                  disabled={isLocked("tech")}
                  rows={3}
                  placeholder="Internal notes..."
                />
              </div>

              <div className="pt-4 border-t space-y-2">
                <Label>Technician Signature</Label>
                <p className="text-xs text-muted-foreground">Signing will lock this section. Admin password required to edit after signing.</p>
                <SignaturePad
                  initialSignature={localData.techSignature}
                  disabled={isLocked("tech")}
                  onSign={(sig) => {
                    handleChange("techSignature", sig);
                    handleChange("techSignatureTimestamp", new Date().toISOString());
                  }}
                />
                {localData.techSignatureTimestamp && (
                  <p className="text-xs text-muted-foreground">
                    Signed: {new Date(localData.techSignatureTimestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Pickup & Completion */}
        <SectionCard
          title="Pickup & Completion"
          isLocked={isLocked("pickup")}
          onUnlock={() => handleUnlockRequest("pickup")}
        >
          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="pickupWaiver"
                checked={!!localData.pickupWaiverAccepted}
                onCheckedChange={(val) => handleChange("pickupWaiverAccepted", !!val)}
                disabled={isLocked("pickup")}
              />
              <Label htmlFor="pickupWaiver" className="font-normal text-sm leading-snug cursor-pointer">
                Customer accepts the condition of equipment and releases the shop from liability.{" "}
                <a href="#" className="text-primary underline" onClick={(e) => e.preventDefault()}>View Waiver</a>
              </Label>
            </div>
            <div className="space-y-2">
              <Label>Pickup Role</Label>
              <Select
                value={localData.pickupSignatureRole || "Skier"}
                onValueChange={(val) => handleChange("pickupSignatureRole", val)}
                disabled={isLocked("pickup")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Skier">Skier / Owner</SelectItem>
                  <SelectItem value="Parent">Parent</SelectItem>
                  <SelectItem value="Guardian">Guardian</SelectItem>
                  <SelectItem value="Agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pickup Signature</Label>
              <p className="text-xs text-muted-foreground">Signing completes and locks the ticket.</p>
              {!isLocked("pickup") && !localData.pickupWaiverAccepted && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
                  <span>⚠️</span>
                  <span>You must accept the waiver above before signing.</span>
                </div>
              )}
              <SignaturePad
                initialSignature={localData.pickupSignature}
                disabled={isLocked("pickup") || !localData.pickupWaiverAccepted}
                onSign={(sig) => {
                  handleChange("pickupSignature", sig);
                  handleChange("pickupSignatureTimestamp", new Date().toISOString());
                  handleChange("status", "completed");
                }}
              />
              {localData.pickupSignatureTimestamp && (
                <p className="text-xs text-muted-foreground">
                  Signed: {new Date(localData.pickupSignatureTimestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Customer Contact */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>Customer Contact</span>
              {localData.contactStatus === "needs_contact" && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-100">
                  Action Required
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Contact Status</Label>
                <Select
                  value={localData.contactStatus || "none"}
                  onValueChange={(val) => handleChange("contactStatus", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="needs_contact">Needs Contact</SelectItem>
                    <SelectItem value="called_no_answer">Called – No Answer</SelectItem>
                    <SelectItem value="called_waiting">Called – Waiting</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Last Contact Attempt</Label>
                <Input
                  value={localData.lastContactAttempt
                    ? new Date(localData.lastContactAttempt).toLocaleString()
                    : "—"}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">Auto-updated when contact status changes</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Contact Notes</Label>
                <Textarea
                  value={localData.contactNotes || ""}
                  onChange={(e) => handleChange("contactNotes", e.target.value)}
                  placeholder="Notes about contact attempts, messages left, etc."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <UnlockModal
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        ticketId={Number(id)}
        section={unlockTarget}
        onUnlocked={() => handleUnlocked(unlockTarget)}
      />

      <PickupTagDialog
        ticket={{ ...ticket, ...localData }}
        open={tagOpen}
        onClose={() => setTagOpen(false)}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Ticket #{ticket.ticketNumber}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. Enter your admin password to confirm.</p>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Admin password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDelete()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={isDeleting || !deletePassword}
              >
                {isDeleting ? "Deleting..." : "Delete Ticket"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WeightInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [unit, setUnit] = useState<"lbs" | "kg">("lbs");
  const [num, setNum] = useState("");

  useEffect(() => {
    if (value) {
      if (value.toLowerCase().includes("kg")) {
        setUnit("kg");
        setNum(value.toLowerCase().replace("kg", "").trim());
      } else {
        setUnit("lbs");
        setNum(value.toLowerCase().replace("lbs", "").trim());
      }
    }
  }, []);

  const handleNumChange = (v: string) => {
    setNum(v);
    onChange(v ? `${v} ${unit}` : "");
  };

  const handleUnitChange = (u: "lbs" | "kg") => {
    setUnit(u);
    onChange(num ? `${num} ${u}` : "");
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={num}
        onChange={(e) => handleNumChange(e.target.value)}
        disabled={disabled}
        placeholder="e.g. 180"
        type="number"
        min="0"
        className="w-28"
      />
      <div className="flex rounded-md border overflow-hidden">
        <button
          type="button"
          className={`px-3 py-2 text-xs font-medium transition-colors ${unit === "lbs" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          onClick={() => handleUnitChange("lbs")}
          disabled={disabled}
        >
          lbs
        </button>
        <button
          type="button"
          className={`px-3 py-2 text-xs font-medium transition-colors ${unit === "kg" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          onClick={() => handleUnitChange("kg")}
          disabled={disabled}
        >
          kg
        </button>
      </div>
    </div>
  );
}

function HeightInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [unit, setUnit] = useState<"imperial" | "metric">("imperial");
  const [ft, setFt] = useState("");
  const [inch, setInch] = useState("");
  const [m, setM] = useState("");

  useEffect(() => {
    if (value) {
      if (value.includes("m") && !value.includes("'")) {
        setUnit("metric");
        setM(value.replace("m", "").trim());
      } else {
        setUnit("imperial");
        const match = value.match(/(\d+)'\s*(\d+)?/);
        if (match) {
          setFt(match[1] || "");
          setInch(match[2] || "");
        }
      }
    }
  }, []);

  const handleFtChange = (v: string) => {
    setFt(v);
    onChange(`${v}' ${inch || "0"}"`);
  };

  const handleInchChange = (v: string) => {
    setInch(v);
    onChange(`${ft || "0"}' ${v}"`);
  };

  const handleMChange = (v: string) => {
    setM(v);
    onChange(`${v} m`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <button
          type="button"
          className={`text-xs px-2 py-0.5 rounded border ${unit === "imperial" ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground text-muted-foreground"}`}
          onClick={() => setUnit("imperial")}
        >
          ft / in
        </button>
        <button
          type="button"
          className={`text-xs px-2 py-0.5 rounded border ${unit === "metric" ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground text-muted-foreground"}`}
          onClick={() => setUnit("metric")}
        >
          m
        </button>
      </div>
      {unit === "imperial" ? (
        <div className="flex items-center gap-2">
          <Input
            value={ft}
            onChange={(e) => handleFtChange(e.target.value)}
            disabled={disabled}
            placeholder="5"
            className="w-16"
            type="number"
            min="0"
            max="8"
          />
          <span className="text-muted-foreground text-sm">ft</span>
          <Input
            value={inch}
            onChange={(e) => handleInchChange(e.target.value)}
            disabled={disabled}
            placeholder="10"
            className="w-16"
            type="number"
            min="0"
            max="11"
          />
          <span className="text-muted-foreground text-sm">in</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            value={m}
            onChange={(e) => handleMChange(e.target.value)}
            disabled={disabled}
            placeholder="1.78"
            className="w-24"
            type="number"
            step="0.01"
            min="0"
          />
          <span className="text-muted-foreground text-sm">m</span>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  children,
  isLocked,
  onUnlock,
}: {
  title: string;
  children: React.ReactNode;
  isLocked?: boolean;
  onUnlock: () => void;
}) {
  return (
    <Card className={`transition-all print:break-inside-avoid ${isLocked ? "opacity-80 border-muted" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
          <CardTitle className={`text-lg ${isLocked ? "text-muted-foreground" : ""}`}>{title}</CardTitle>
        </div>
        {isLocked && (
          <Button variant="ghost" size="sm" onClick={onUnlock} className="h-8 text-xs">
            <Unlock className="w-3 h-3 mr-1" /> Unlock
          </Button>
        )}
      </CardHeader>
      <CardContent className={isLocked ? "pointer-events-none select-none" : ""}>{children}</CardContent>
    </Card>
  );
}
