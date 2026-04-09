import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Shield } from "lucide-react";

interface StoreEntry {
  id: number;
  name: string;
  username: string;
  createdAt: string;
}

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("ski_store_token")}`, "Content-Type": "application/json" };
}

export default function AdminStoresPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [stores, setStores] = useState<StoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StoreEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreEntry | null>(null);

  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [saving, setSaving] = useState(false);

  async function loadStores() {
    setLoading(true);
    try {
      const res = await fetch("/api/stores", { headers: authHeader() });
      const data = await res.json();
      setStores(data);
    } catch {
      toast({ title: "Failed to load stores", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStores(); }, []);

  const openAdd = () => {
    setForm({ name: "", username: "", password: "" });
    setAddOpen(true);
  };

  const openEdit = (store: StoreEntry) => {
    setForm({ name: store.name, username: store.username, password: "" });
    setEditTarget(store);
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ name: form.name, username: form.username, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add store");
      toast({ title: "Store added" });
      setAddOpen(false);
      loadStores();
    } catch (err: any) {
      toast({ title: err.message ?? "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { name: form.name, username: form.username };
      if (form.password) body.password = form.password;
      const res = await fetch(`/api/stores/${editTarget.id}`, {
        method: "PUT",
        headers: authHeader(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update store");
      toast({ title: "Store updated" });
      setEditTarget(null);
      loadStores();
    } catch (err: any) {
      toast({ title: err.message ?? "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete store");
      toast({ title: "Store deleted" });
      setDeleteTarget(null);
      loadStores();
    } catch (err: any) {
      toast({ title: err.message ?? "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background">
      <header className="border-b bg-card text-card-foreground">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 rounded-md bg-gray-900 flex items-center justify-center text-white">
              <Shield className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Manage Stores</h1>
          </div>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Store
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4">
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3">Store Name</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : stores.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No stores found.</td>
                  </tr>
                ) : (
                  stores.map(store => (
                    <tr key={store.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{store.name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{store.username}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(store.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(store)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(store)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Store Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Store</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Store Name</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mountain Ski Shop" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="store1" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Adding..." : "Add Store"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Store Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Store</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Store Name</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Password <span className="text-muted-foreground font-normal">(leave blank to keep current)</span></label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Store?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will delete <strong>{deleteTarget?.name}</strong> and cannot be undone. All tickets for this store will remain in the database.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting..." : "Delete Store"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
