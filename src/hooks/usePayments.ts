import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Payment = Tables<"payments"> & {
  events: { name: string } | null;
  registrations: { ticket_tier: string | null; data: Tables<"registrations">["data"] } | null;
};

/** Organizer-only read: existing payment RLS enforces event ownership. */
export function usePayments(eventId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payments", user?.id, eventId],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const results: Payment[] = [];
      for (let offset = 0; ; offset += 500) {
        let query = supabase.from("payments").select("*, events(name), registrations(ticket_tier, data)").order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
        if (eventId) query = query.eq("event_id", eventId);
        const { data, error } = await query;
        if (error) throw error;
        results.push(...data);
        if (data.length < 500) break;
      }
      return results;
    },
  });
}