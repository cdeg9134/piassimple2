import { Badge } from "@/components/ui/badge";

type TicketStatus = "received" | "in_progress" | "ready_for_pickup" | "completed";

export function StatusBadge({ status }: { status: TicketStatus | string }) {
  switch (status) {
    case "received":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Received</Badge>;
    case "in_progress":
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">In Progress</Badge>;
    case "ready_for_pickup":
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Ready for Pickup</Badge>;
    case "completed":
      return <Badge variant="secondary" className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">Completed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ServiceTypeBadge({ type }: { type: string }) {
  switch (type) {
    case "ski_full":
      return <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400">Ski Full Tune</Badge>;
    case "ski_service":
      return <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400">Ski Service</Badge>;
    case "snowboard_service":
      return <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400">Snowboard Service</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}
