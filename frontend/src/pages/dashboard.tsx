import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTickets, useTicketStats, useTicketMutations } from "@/hooks/use-tickets";
import { StatusBadge, ServiceTypeBadge } from "@/components/tickets/badges";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Plus, Search, Settings, Eye, Printer, Trash2, PhoneCall, LogOut, Shield, Store, ChevronLeft, ChevronRight, CheckCircle2, ArrowLeft } from "lucide-react";
import { clearAuth, getStoreInfo, isAdminSession } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const CONTACT_STATUS_LABELS: Record<string, string> = {
  none: "—",
  needs_contact: "Needs Contact",
  called_no_answer: "Called – No Answer",
  called_waiting: "Called – Waiting",
  resolved: "Resolved",
};

interface StoreOption { id: number; name: string; username: string; }

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<"active" | "completed">("active");

  // Active view state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contactFilter, setContactFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  // Completed view state
  const [completedSearch, setCompletedSearch] = useState("");
  const [completedPageSize, setCompletedPageSize] = useState(5);
  const [completedPage, setCompletedPage] = useState(1);

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isAdmin = isAdminSession();

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/stores", {
        headers: { Authorization: `Bearer ${localStorage.getItem("ski_store_token")}` },
      })
        .then(r => r.json())
        .then(setStores)
        .catch(() => {});
    }
  }, [isAdmin]);

  const ticketQuery: Record<string, string | undefined> = {
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    contactStatus: contactFilter === "all" ? undefined : contactFilter,
  };
  if (isAdmin && storeFilter !== "all") ticketQuery.storeId = storeFilter;

  const { tickets, isLoading } = useTickets(ticketQuery as Parameters<typeof useTickets>[0]);
  const { stats } = useTicketStats();
  const { deleteTicket, isDeleting } = useTicketMutations();

  const activeTickets = tickets?.filter(t => t.status !== "completed") ?? [];
  const allCompleted = tickets?.filter(t => t.status === "completed") ?? [];
  const completedTickets = completedSearch
    ? allCompleted.filter(t =>
        t.customerName?.toLowerCase().includes(completedSearch.toLowerCase()) ||
        String(t.ticketNumber).includes(completedSearch)
      )
    : allCompleted;

  const totalActive = activeTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalActive / pageSize));
  const pagedActive = activeTickets.slice((page - 1) * pageSize, page * pageSize);

  const completedTotalPages = Math.max(1, Math.ceil(completedTickets.length / completedPageSize));
  const pagedCompleted = completedTickets.slice((completedPage - 1) * completedPageSize, completedPage * completedPageSize);

  useEffect(() => { setPage(1); }, [search, statusFilter, contactFilter, storeFilter, pageSize]);
  useEffect(() => { setCompletedPage(1); }, [completedSearch, completedPageSize]);

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  const openDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(id);
    setDeletePassword("");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!isAdmin && !deletePassword) return;
    try {
      await deleteTicket({ id: deleteTarget, data: { password: deletePassword || "ADMIN_BYPASS" } });
      toast({ title: "Ticket deleted" });
      setDeleteTarget(null);
    } catch {
      toast({ title: "Invalid admin password", variant: "destructive" });
      setDeletePassword("");
    }
  };

  const handlePrint = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const win = window.open(`/tickets/${id}`, "_blank");
    if (win) win.addEventListener("load", () => setTimeout(() => win.print(), 800));
  };

  const storeInfo = getStoreInfo();

  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background">
      <header className="border-b bg-card text-card-foreground">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="w-8 h-8 rounded-md bg-gray-900 flex items-center justify-center text-white">
                <Shield className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
                {storeInfo?.storeName?.[0]?.toUpperCase() ?? "S"}
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {isAdmin ? "Master Admin" : (storeInfo?.storeName ?? "Ski Shop")}
              </h1>
              {isAdmin && <span className="text-xs text-muted-foreground">All stores visible</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" title="Sign out" onClick={() => { clearAuth(); setAuthTokenGetter(null); setLocation("/login"); }}>
              <LogOut className="w-4 h-4" />
            </Button>
            {isAdmin ? (
              <Button variant="outline" onClick={() => setLocation("/admin/stores")}>
                <Store className="w-4 h-4 mr-2" />
                Manage Stores
              </Button>
            ) : (
              <>
                <Button variant="outline" size="icon" onClick={() => setLocation("/settings")}>
                  <Settings className="w-4 h-4" />
                </Button>
                <Button onClick={() => setLocation("/tickets/new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Ticket
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 flex flex-col gap-6">

        {viewMode === "active" ? (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard title="Total Active" value={stats?.total ?? "-"} />
              <StatCard title="Received" value={stats?.received ?? "-"} />
              <StatCard title="In Progress" value={stats?.inProgress ?? "-"} />
              <StatCard title="Ready" value={stats?.readyForPickup ?? "-"} />
              <StatCard title="Today" value={stats?.todayCount ?? "-"} />
            </div>

            {/* Filters + Completed button */}
            <div className="flex flex-col md:flex-row gap-3 items-center flex-wrap">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets, names, phones..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {isAdmin && stores.length > 0 && (
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="All Stores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                </SelectContent>
              </Select>
              <Select value={contactFilter} onValueChange={setContactFilter}>
                <SelectTrigger className="w-full md:w-[190px]">
                  <SelectValue placeholder="Contact Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contact Status</SelectItem>
                  <SelectItem value="needs_contact">Needs Contact</SelectItem>
                  <SelectItem value="called_no_answer">Called – No Answer</SelectItem>
                  <SelectItem value="called_waiting">Called – Waiting</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              {contactFilter !== "all" && (
                <Button variant="ghost" size="sm" onClick={() => setContactFilter("all")} className="text-muted-foreground">
                  Clear
                </Button>
              )}
              <div className="md:ml-auto">
                <Button
                  variant="outline"
                  onClick={() => setViewMode("completed")}
                  className="gap-2 text-muted-foreground"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Completed
                  {!isLoading && allCompleted.length > 0 && (
                    <span className="ml-1 bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full">
                      {allCompleted.length}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Active Tickets Table */}
            <div className="border rounded-lg bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  {isLoading ? "Loading..." : `${totalActive} ticket${totalActive !== 1 ? "s" : ""}`}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Per page:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="h-7 w-[70px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3">Ticket</th>
                      <th className="px-4 py-3">Customer</th>
                      {isAdmin && <th className="px-4 py-3">Store</th>}
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Dropoff</th>
                      <th className="px-4 py-3">Promise Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                          {isAdmin && <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>}
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        </tr>
                      ))
                    ) : pagedActive.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-muted-foreground">
                          No tickets found.
                        </td>
                      </tr>
                    ) : (
                      pagedActive.map((ticket) => {
                        const needsContact = (ticket as any).contactStatus === "needs_contact";
                        return (
                          <tr
                            key={ticket.id}
                            className={`border-b cursor-pointer transition-colors ${
                              needsContact
                                ? "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() => setLocation(`/tickets/${ticket.id}`)}
                          >
                            <td className="px-4 py-3 font-mono font-medium text-primary">
                              #{ticket.ticketNumber}
                              {needsContact && <PhoneCall className="inline ml-1.5 w-3 h-3 text-amber-600 dark:text-amber-400" />}
                            </td>
                            <td className="px-4 py-3 font-medium">{ticket.customerName || "—"}</td>
                            {isAdmin && (
                              <td className="px-4 py-3">
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                  {(ticket as any).storeName ?? `Store ${(ticket as any).storeId}`}
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-3"><ServiceTypeBadge type={ticket.serviceType} /></td>
                            <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                            <td className="px-4 py-3">
                              {(ticket as any).contactStatus && (ticket as any).contactStatus !== "none" ? (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  needsContact
                                    ? "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-100"
                                    : (ticket as any).contactStatus === "resolved"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                                }`}>
                                  {CONTACT_STATUS_LABELS[(ticket as any).contactStatus] ?? (ticket as any).contactStatus}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">{ticket.dropoffDate ? format(new Date(ticket.dropoffDate), "MMM d, yyyy") : "—"}</td>
                            <td className="px-4 py-3 font-medium">
                              {ticket.willCall ? (
                                <span className="text-amber-600 dark:text-amber-400">Will Call</span>
                              ) : ticket.promiseDate ? (
                                format(new Date(ticket.promiseDate), "MMM d, yyyy")
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setLocation(`/tickets/${ticket.id}`)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => handlePrint(ticket.id, e)}>
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => openDelete(ticket.id, e)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
                  <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Completed view header */}
            <div className="flex flex-col md:flex-row gap-3 items-center flex-wrap">
              <Button variant="ghost" size="sm" className="gap-2 self-start" onClick={() => setViewMode("active")}>
                <ArrowLeft className="w-4 h-4" />
                Back to Active
              </Button>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                Completed Tickets
              </h2>
            </div>

            {/* Completed search + per-page */}
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ticket #..."
                  className="pl-9"
                  value={completedSearch}
                  onChange={(e) => setCompletedSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 md:ml-auto">
                <span className="text-xs text-muted-foreground">Per page:</span>
                <Select value={String(completedPageSize)} onValueChange={(v) => setCompletedPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[70px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Completed Tickets Table */}
            <div className="border rounded-lg bg-card overflow-hidden">
              <div className="flex items-center px-4 py-2 border-b bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  {isLoading ? "Loading..." : `${completedTickets.length} completed ticket${completedTickets.length !== 1 ? "s" : ""}`}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3">Ticket</th>
                      <th className="px-4 py-3">Customer</th>
                      {isAdmin && <th className="px-4 py-3">Store</th>}
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Dropoff</th>
                      <th className="px-4 py-3">Promise Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                          {isAdmin && <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>}
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        </tr>
                      ))
                    ) : pagedCompleted.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">
                          No completed tickets found.
                        </td>
                      </tr>
                    ) : (
                      pagedCompleted.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="border-b cursor-pointer hover:bg-muted/50 transition-colors opacity-80"
                          onClick={() => setLocation(`/tickets/${ticket.id}`)}
                        >
                          <td className="px-4 py-3 font-mono font-medium text-primary">#{ticket.ticketNumber}</td>
                          <td className="px-4 py-3 font-medium">{ticket.customerName || "—"}</td>
                          {isAdmin && (
                            <td className="px-4 py-3">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                {(ticket as any).storeName ?? `Store ${(ticket as any).storeId}`}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3"><ServiceTypeBadge type={ticket.serviceType} /></td>
                          <td className="px-4 py-3">{ticket.dropoffDate ? format(new Date(ticket.dropoffDate), "MMM d, yyyy") : "—"}</td>
                          <td className="px-4 py-3">{ticket.promiseDate ? format(new Date(ticket.promiseDate), "MMM d, yyyy") : "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setLocation(`/tickets/${ticket.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => handlePrint(ticket.id, e)}>
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => openDelete(ticket.id, e)}>
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
              {completedTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
                  <span className="text-xs text-muted-foreground">Page {completedPage} of {completedTotalPages}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCompletedPage(p => Math.max(1, p - 1))} disabled={completedPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCompletedPage(p => Math.min(completedTotalPages, p + 1))} disabled={completedPage === completedTotalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Ticket?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.{isAdmin ? "" : " Enter your admin password to confirm."}</p>
          <div className="space-y-3">
            {!isAdmin && (
              <Input
                type="password"
                placeholder="Admin password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDelete()}
                autoFocus
              />
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={isDeleting || (!isAdmin && !deletePassword)}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="p-4 rounded-xl border bg-card text-card-foreground flex flex-col gap-1 shadow-sm">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}
