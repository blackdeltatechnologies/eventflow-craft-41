import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useEvent } from "@/hooks/useEvents";
import { useRegistrationsByEvent, useCheckInRegistration } from "@/hooks/useRegistrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, CameraOff, CheckCircle2, Loader2, Search, UserCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Html5Qrcode } from "html5-qrcode";
import { playError, playSuccess, unlockAudio } from "@/lib/checkinSounds";

const SCANNER_ID = "checkin-qr-reader";

export default function CheckIn() {
  const { id } = useParams<{ id: string }>();
  const { data: event } = useEvent(id);
  const { data: registrations, isLoading } = useRegistrationsByEvent(id);
  const checkIn = useCheckInRegistration();

  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState("");
  const [lastScanned, setLastScanned] = useState<{ ok: boolean; text: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lockRef = useRef<string | null>(null);
  const regsRef = useRef(registrations);
  regsRef.current = registrations;

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extractRegId = (text: string): string | null => {
    const trimmed = text.trim();
    // UUID pattern
    const uuidMatch = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return uuidMatch ? uuidMatch[0] : null;
  };

  const performCheckIn = async (regId: string) => {
    if (!id) return;
    if (lockRef.current === regId) return;
    lockRef.current = regId;
    const regs = regsRef.current;
    const existing = regs?.find((r) => r.id === regId);
    const exData = existing?.data as Record<string, string> | undefined;
    const exName = exData?.["Full Name"] || exData?.["Name"] || exData?.["Email Address"] || exData?.["Email"] || "Attendee";
    if (regs && !existing) {
      playError();
      setLastScanned({ ok: false, text: "Ticket not found for this event" });
      toast.error("Ticket not found for this event");
      setTimeout(() => { lockRef.current = null; }, 2000);
      return;
    }
    if (existing && (existing as any).checked_in_at) {
      playError();
      const at = format(new Date((existing as any).checked_in_at), "p");
      setLastScanned({ ok: false, text: `${exName} already checked in at ${at}` });
      toast.warning(`${exName} already checked in at ${at}`);
      setTimeout(() => { lockRef.current = null; }, 2000);
      return;
    }
    try {
      const reg = await checkIn.mutateAsync({ id: regId, eventId: id });
      const data = (reg as any).data as Record<string, string> | undefined;
      const name = data?.["Full Name"] || data?.["Name"] || data?.["Email Address"] || data?.["Email"] || "Attendee";
      playSuccess();
      setLastScanned({ ok: true, text: `${name} checked in` });
      toast.success(`✓ ${name} checked in`);
    } catch (err: any) {
      playError();
      setLastScanned({ ok: false, text: err.message || "Check-in failed" });
      toast.error(err.message || "Check-in failed");
    } finally {
      setTimeout(() => { lockRef.current = null; }, 2000);
    }
  };

  const startScanner = async () => {
    unlockAudio();
    setScanning(true);
    setTimeout(async () => {
      try {
        const qr = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = qr;
        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            const regId = extractRegId(decoded);
            if (regId) performCheckIn(regId);
          },
          () => {}
        );
      } catch (err: any) {
        toast.error("Camera unavailable: " + (err?.message || "permission denied"));
        setScanning(false);
      }
    }, 50);
  };

  const filtered = useMemo(() => {
    if (!registrations) return [];
    const q = search.toLowerCase().trim();
    if (!q) return registrations;
    return registrations.filter((r) => {
      const data = r.data as Record<string, string>;
      return Object.values(data || {}).some(
        (v) => typeof v === "string" && v.toLowerCase().includes(q)
      );
    });
  }, [registrations, search]);

  const totals = useMemo(() => {
    const total = registrations?.length ?? 0;
    const checkedIn = registrations?.filter((r: any) => r.checked_in_at).length ?? 0;
    return { total, checkedIn, percent: total > 0 ? Math.round((checkedIn / total) * 100) : 0 };
  }, [registrations]);

  if (!event) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link to={`/dashboard/events/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to event
          </Link>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Check-in · {event.name}</h1>
          <p className="text-muted-foreground text-sm">Scan an attendee's QR code or check them in manually.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-card rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Checked in</p>
            <p className="text-2xl font-display font-bold text-success">{totals.checkedIn}/{totals.total}</p>
          </div>
          <div className="bg-card rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Rate</p>
            <p className="text-2xl font-display font-bold">{totals.percent}%</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-5 sm:p-6">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4" /> Scanner
          </h3>
          {scanning ? (
            <>
              <div id={SCANNER_ID} className="w-full rounded-xl overflow-hidden bg-black" />
              <Button variant="outline" className="w-full mt-3 rounded-full" onClick={stopScanner}>
                <CameraOff className="w-4 h-4 mr-2" /> Stop scanner
              </Button>
            </>
          ) : (
            <div className="text-center py-10 border border-dashed border-border rounded-xl">
              <Camera className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <Button onClick={startScanner} className="rounded-full">Start camera</Button>
              <p className="text-xs text-muted-foreground mt-3">Allow camera access when prompted.</p>
            </div>
          )}
          {lastScanned && (
            <div className={`mt-4 p-3 rounded-xl text-sm flex items-center gap-2 ${lastScanned.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {lastScanned.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {lastScanned.text}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl p-5 sm:p-6">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> Attendees
          </h3>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email"
              className="pl-9 rounded-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No attendees yet.</p>
            ) : (
              filtered.map((r) => {
                const data = r.data as Record<string, string>;
                const name = data["Full Name"] || data["Name"] || "Attendee";
                const email = data["Email Address"] || data["Email"] || "";
                const checked = !!(r as any).checked_in_at;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{email}</p>
                    </div>
                    {checked ? (
                      <Badge className="bg-success/15 text-success border-0 rounded-full">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> In{(r as any).checked_in_at && ` · ${format(new Date((r as any).checked_in_at), "p")}`}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => performCheckIn(r.id)}
                        disabled={checkIn.isPending}
                      >
                        Check in
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
