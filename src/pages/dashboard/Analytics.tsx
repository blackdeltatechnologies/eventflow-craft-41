import { Users, TrendingUp, CalendarDays, UserCheck, Loader2 } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useRegistrationStats } from "@/hooks/useRegistrations";
import { useMemo } from "react";
import { format, parseISO, startOfDay, subDays, eachDayOfInterval } from "date-fns";

const Analytics = () => {
  const { data: stats, isLoading } = useRegistrationStats();

  const perEventData = useMemo(() => {
    if (!stats?.events || !stats?.registrations) return [];
    const countMap: Record<string, { name: string; registrations: number; checkedIn: number }> = {};
    stats.events.forEach((e: any) => { countMap[e.id] = { name: e.name, registrations: 0, checkedIn: 0 }; });
    (stats.registrations as any[]).forEach((r) => {
      if (countMap[r.event_id]) {
        countMap[r.event_id].registrations++;
        if (r.checked_in_at) countMap[r.event_id].checkedIn++;
      }
    });
    return Object.values(countMap)
      .filter(d => d.registrations > 0)
      .sort((a, b) => b.registrations - a.registrations)
      .slice(0, 5);
  }, [stats]);

  const overTimeData = useMemo(() => {
    if (!stats?.registrations) return [];
    const end = startOfDay(new Date());
    const start = subDays(end, 29);
    const days = eachDayOfInterval({ start, end });
    const counts: Record<string, number> = {};
    days.forEach(d => { counts[format(d, "yyyy-MM-dd")] = 0; });
    (stats.registrations as any[]).forEach(r => {
      const key = format(startOfDay(parseISO(r.created_at)), "yyyy-MM-dd");
      if (key in counts) counts[key]++;
    });
    return days.map(d => ({
      day: format(d, "MMM d"),
      registrations: counts[format(d, "yyyy-MM-dd")],
    }));
  }, [stats]);

  const checkInData = useMemo(() => {
    return perEventData
      .filter(d => d.registrations > 0)
      .map(d => ({
        name: d.name.length > 16 ? d.name.slice(0, 14) + "…" : d.name,
        rate: Math.round((d.checkedIn / d.registrations) * 100),
      }));
  }, [perEventData]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const totalEvents = stats?.events?.length ?? 0;
  const avgPerEvent = totalEvents ? Math.round((stats?.total ?? 0) / totalEvents) : 0;

  const statCards = [
    { label: "Total registrations", value: stats?.total ?? 0, icon: Users },
    { label: "Active events", value: stats?.activeEvents ?? 0, icon: CalendarDays },
    { label: "Avg per event", value: avgPerEvent, icon: TrendingUp },
    { label: "Check-in rate", value: `${stats?.checkInRate ?? 0}%`, icon: UserCheck },
  ];

  const chartTooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your event performance, registration trends, and check-in rates.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-display font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl p-5 sm:p-6">
        <h3 className="font-display font-semibold mb-1">Registrations over the last 30 days</h3>
        <p className="text-xs text-muted-foreground mb-4">Daily new registrations across all events.</p>
        {overTimeData.some(d => d.registrations > 0) ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overTimeData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 10 }} interval={4} />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ fontWeight: 600 }} />
                <Line type="monotone" dataKey="registrations" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12 text-sm">No registrations in the last 30 days.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl p-5 sm:p-6">
          <h3 className="font-display font-semibold mb-1">Top 5 events</h3>
          <p className="text-xs text-muted-foreground mb-4">Your most-registered events.</p>
          {perEventData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perEventData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" className="text-xs" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ fontWeight: 600 }} />
                  <Bar dataKey="registrations" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12 text-sm">No registration data yet.</p>
          )}
        </div>

        <div className="bg-card rounded-xl p-5 sm:p-6">
          <h3 className="font-display font-semibold mb-1">Check-in rate per event</h3>
          <p className="text-xs text-muted-foreground mb-4">Share of registered attendees who actually showed up.</p>
          {checkInData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={checkInData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="rate" radius={[6, 6, 0, 0]} barSize={36}>
                    {checkInData.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--success))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12 text-sm">No check-in data yet. Use the check-in page during your event to start tracking.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
