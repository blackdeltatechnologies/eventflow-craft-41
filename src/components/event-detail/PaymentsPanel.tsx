import { useMemo, useState } from "react";
import { ArrowDownLeft, Clock, CreditCard, AlertCircle, Search, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { formatMoney, summarizePayments } from "@/lib/paymentSummary";
import { detectMobileNetwork, formatTanzaniaPhone } from "@/lib/mobileMoney";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  COMPLETED: "bg-success/10 text-success", INITIATED: "bg-warning/10 text-foreground", PENDING: "bg-warning/10 text-foreground", PROCESSING: "bg-warning/10 text-foreground",
  FAILED: "bg-destructive/10 text-destructive", CANCELLED: "bg-muted text-muted-foreground", EXPIRED: "bg-muted text-muted-foreground",
};
const PAGE_SIZE = 10;

export default function PaymentsPanel({ eventId }: { eventId?: string }) {
  const { data: payments = [], isLoading, error, refetch, isFetching } = usePayments(eventId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const summary = useMemo(() => summarizePayments(payments), [payments]);
  const filtered = payments.filter(p => (status === "all" || p.state === status) && [p.payer_phone, p.merchant_reference, p.easypay_reference, p.events?.name, p.registrations?.ticket_tier].some(value => value?.toLowerCase().includes(search.toLowerCase())));
  const maxPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, maxPage);
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error) return <div role="alert" className="py-6 space-y-3"><p className="text-destructive">Payments could not be loaded.</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>;
  return (
    <section className="space-y-6 min-w-0" aria-label="Payments and revenue">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Payments & revenue</h2>
        <Button variant="ghost" size="icon" aria-label="Refresh payments" title="Refresh payments" disabled={isFetching} onClick={() => refetch()}><RefreshCw className={isFetching ? "animate-spin" : ""} /></Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { title: "Collected", value: formatMoney(summary.collected), icon: ArrowDownLeft },
          { title: "Pending", value: formatMoney(summary.pending), icon: Clock },
          { title: "Completed payments", value: summary.completedCount, icon: CreditCard },
          { title: "Failed / closed", value: summary.failedCount, icon: AlertCircle },
        ].map(item => <div key={item.title} className="bg-card rounded-lg p-5 space-y-3"><div className="flex items-center justify-between text-muted-foreground text-sm"><span>{item.title}</span><item.icon className="h-4 w-4" /></div><p className="font-display text-xl font-bold break-words">{item.value}</p></div>)}
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        {[{ title: "Revenue by ticket tier", rows: summary.byTier }, { title: "Revenue by network (estimated)", rows: summary.byNetwork }].map(group => <div key={group.title} className="space-y-4">
          <h3 className="font-display font-semibold">{group.title}</h3>
          {group.rows.length ? group.rows.map(row => <div key={row.name} className="space-y-1"><div className="flex justify-between gap-4 text-sm"><span className="break-words min-w-0">{row.name}</span><span className="shrink-0 font-medium">{formatMoney(row.amount)}</span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><svg className="w-full h-2 text-primary" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 8"><rect width={summary.collected ? row.amount / summary.collected * 100 : 0} height="8" rx="4" fill="currentColor" /></svg></div></div>) : <p className="text-sm text-muted-foreground">No completed payments yet.</p>}
        </div>)}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search payments" placeholder="Phone, reference or ticket tier…" className="pl-10 bg-card" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
        <Select value={status} onValueChange={value => { setStatus(value); setPage(0); }}><SelectTrigger className="sm:w-48 bg-card" aria-label="Payment status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All payment statuses</SelectItem>{[...new Set(payments.map(p => p.state))].sort().map(state => <SelectItem key={state} value={state}>{state.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="overflow-x-auto bg-card rounded-lg">
        <Table>
          <TableHeader><TableRow><TableHead>Payment</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Phone / network</TableHead><TableHead>Ticket tier</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map(p => <TableRow key={p.id}>
            <TableCell className="min-w-48"><p className="font-medium">{p.events?.name || "Event"}</p><p className="text-xs text-muted-foreground break-all">{p.easypay_reference || p.merchant_reference}</p></TableCell>
            <TableCell className="whitespace-nowrap font-medium">{p.currency} {Number(p.amount).toLocaleString("en-US")}</TableCell>
            <TableCell><Badge className={`border-0 whitespace-nowrap ${statusColors[p.state] || "bg-muted text-muted-foreground"}`}>{p.state.replace(/_/g, " ")}</Badge>{p.failure_reason && <p className="text-xs text-muted-foreground max-w-48 mt-1 break-words">{p.failure_reason}</p>}</TableCell>
            <TableCell className="whitespace-nowrap"><p>{formatTanzaniaPhone(p.payer_phone)}</p><p className="text-xs text-muted-foreground">{detectMobileNetwork(p.payer_phone) || "Unknown"}</p></TableCell>
            <TableCell>{p.registrations?.ticket_tier || "—"}</TableCell><TableCell className="whitespace-nowrap text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy HH:mm")}</TableCell>
          </TableRow>)}{!filtered.length && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">{payments.length ? "No matching payments." : "No payments yet."}</TableCell></TableRow>}</TableBody>
        </Table>
      </div>
      {filtered.length > PAGE_SIZE && <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</p><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Previous payments" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Next payments" disabled={currentPage === maxPage} onClick={() => setPage(currentPage + 1)}><ChevronRight /></Button></div></div>}
    </section>
  );
}