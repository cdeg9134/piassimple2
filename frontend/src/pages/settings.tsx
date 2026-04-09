import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/use-settings";
import { AdminUnlockModal } from "@/components/settings/admin-unlock-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";

export default function SettingsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const { settings, isLoading, updateSettings, isUpdating } = useSettings();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    taxRate: 0,
    shopName: "",
    waiverUrl: "",
    autoLockMinutes: 0,
    staffPassword: "",
    adminPassword: "",
    customServices: [] as { name: string; defaultPrice: number }[]
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        taxRate: settings.taxRate,
        shopName: settings.shopName,
        waiverUrl: settings.waiverUrl,
        autoLockMinutes: settings.autoLockMinutes,
        staffPassword: settings.staffPassword,
        adminPassword: settings.adminPassword,
        customServices: settings.customServices || [],
      });
    }
  }, [settings]);

  if (!unlocked) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <AdminUnlockModal
          isOpen={!unlocked}
          onUnlocked={(pw) => {
            setAdminPassword(pw);
            setUnlocked(true);
          }}
        />
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await updateSettings({
        data: {
          ...formData,
          password: adminPassword,
        }
      });
      toast({ title: "Settings saved successfully" });
    } catch (err) {
      toast({ title: "Error saving settings", variant: "destructive" });
    }
  };

  const addCustomService = () => {
    setFormData({
      ...formData,
      customServices: [...formData.customServices, { name: "New Service", defaultPrice: 20 }]
    });
  };

  const removeCustomService = (index: number) => {
    const newServices = [...formData.customServices];
    newServices.splice(index, 1);
    setFormData({ ...formData, customServices: newServices });
  };

  const updateCustomService = (index: number, field: "name" | "defaultPrice", value: any) => {
    const newServices = [...formData.customServices];
    newServices[index] = { ...newServices[index], [field]: value };
    setFormData({ ...formData, customServices: newServices });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="min-h-[100dvh] w-full bg-background pb-24">
      <header className="border-b bg-card text-card-foreground sticky top-0 z-10">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          </div>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-4xl space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Shop Information</CardTitle>
            <CardDescription>General details used on tickets and prints.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Shop Name</Label>
              <Input 
                value={formData.shopName} 
                onChange={(e) => setFormData({...formData, shopName: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Waiver URL</Label>
              <Input 
                value={formData.waiverUrl} 
                onChange={(e) => setFormData({...formData, waiverUrl: e.target.value})} 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Tax</CardTitle>
            <CardDescription>Configure tax rates applied to services.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Tax Rate (%)</Label>
                <span className="text-sm font-medium">{formData.taxRate}%</span>
              </div>
              <Slider 
                value={[formData.taxRate]} 
                min={0} 
                max={20} 
                step={0.1}
                onValueChange={(vals) => setFormData({...formData, taxRate: vals[0]})} 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage access passwords and lock settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Staff Password</Label>
                <Input 
                  type="password" 
                  value={formData.staffPassword} 
                  onChange={(e) => setFormData({...formData, staffPassword: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Management Password</Label>
                <Input 
                  type="password" 
                  value={formData.adminPassword} 
                  onChange={(e) => setFormData({...formData, adminPassword: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Label>Auto-lock Tickets After (Minutes)</Label>
              <Input 
                type="number" 
                value={formData.autoLockMinutes} 
                onChange={(e) => setFormData({...formData, autoLockMinutes: parseInt(e.target.value) || 0})} 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Custom Services</CardTitle>
              <CardDescription>Add custom services available for selection.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addCustomService}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.customServices.map((service, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input 
                  className="flex-1"
                  placeholder="Service Name"
                  value={service.name}
                  onChange={(e) => updateCustomService(index, "name", e.target.value)}
                />
                <Input 
                  className="w-32"
                  type="number"
                  placeholder="Price"
                  value={service.defaultPrice}
                  onChange={(e) => updateCustomService(index, "defaultPrice", parseFloat(e.target.value) || 0)}
                />
                <Button variant="ghost" size="icon" onClick={() => removeCustomService(index)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {formData.customServices.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No custom services defined.</p>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
