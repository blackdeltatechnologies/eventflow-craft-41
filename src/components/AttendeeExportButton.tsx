import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { buildAttendeeCsv, buildAttendeeXlsx } from "@/lib/attendeeExport";
import { deliverFile, safeFilename } from "@/lib/ticket";
import type { Registration } from "@/hooks/useRegistrations";

export default function AttendeeExportButton({ registrations, eventName = "", disabled = false }: { registrations: Registration[]; eventName?: string; disabled?: boolean }) {
  const [excel, setExcel] = useState<Blob | null>(null);
  const [excelError, setExcelError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setExcel(null);
    setExcelError(false);
    if (registrations.length) buildAttendeeXlsx(registrations, eventName).then(blob => {
      if (!cancelled) setExcel(blob);
    }).catch(() => { if (!cancelled) setExcelError(true); });
    return () => { cancelled = true; };
  }, [registrations, eventName]);
  const filename = `${safeFilename(eventName || "all-events")}-attendees`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-card shrink-0" disabled={disabled || !registrations.length} aria-label="Export attendees">
          <Download /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => deliverFile(new Blob([buildAttendeeCsv(registrations, eventName)], { type: "text/csv;charset=utf-8" }), `${filename}.csv`)}>Download CSV</DropdownMenuItem>
        <DropdownMenuItem disabled={!excel} onSelect={() => excel && deliverFile(excel, `${filename}.xlsx`)}>
          {!excel && !excelError && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {excelError ? "Excel unavailable" : "Download Excel"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}