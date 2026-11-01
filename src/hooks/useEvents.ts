import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { copyName } from "@/lib/ticketTiers";

export type Event = Tables<"events">;

export function useEvents(search?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["events", user?.id, search],
    queryFn: async () => {
      let query = supabase.from("events").select("*").order("created_at", { ascending: false });
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Event[];
    },
    enabled: !!user,
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Event;
    },
    enabled: !!id,
  });
}

export function useEventBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["event-slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("slug", slug!).eq("status", "live").single();
      if (error) throw error;
      return data as Event;
    },
    enabled: !!slug,
  });
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).substring(2, 8);
}

export function useCreateEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      event_date?: string;
      event_end_date?: string;
      timezone?: string;
      event_type?: string;
      template?: string;
      location_type?: string;
      location_value?: string;
      ticket_price?: number;
      requires_approval?: boolean;
      capacity?: number;
    }) => {
      const slug = generateSlug(input.name);
      const { data, error } = await supabase.from("events").insert({
        ...input,
        slug,
        user_id: user!.id,
        status: "draft",
      } as any).select().single();
      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"events"> & { id: string }) => {
      const { data, error } = await supabase.from("events").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Event;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["event", data.id] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

/** Clones an event (branding, settings, form fields, ticket types) into a new draft without dates. */
export function useDuplicateEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (source: Event) => {
      const { id, created_at, updated_at, slug, status, event_date, event_end_date, registration_deadline, user_id, ...rest } = source;
      const name = copyName(source.name);
      const { data, error } = await supabase.from("events").insert({
        ...rest,
        name,
        slug: generateSlug(name),
        status: "draft",
        user_id: user!.id,
      }).select().single();
      if (error) throw error;
      const { data: fields } = await supabase.from("form_fields").select("*").eq("event_id", id);
      if (fields && fields.length) {
        const { error: fErr } = await supabase.from("form_fields").insert(
          fields.map(({ id: _id, event_id: _e, ...f }) => ({ ...f, event_id: data.id }))
        );
        if (fErr) throw fErr;
      }
      return data as Event;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export type PublicEvent = Event & { organizer?: { company: string | null; company_slug: string | null } | null };

/** All live events for the public directory. */
export function usePublicEvents() {
  return useQuery({
    queryKey: ["public-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("status", "live").order("event_date", { ascending: true, nullsFirst: false }).limit(200);
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((e) => e.user_id))];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, company, company_slug").in("id", ids).not("company_slug", "is", null)
        : { data: [] as { id: string; company: string | null; company_slug: string | null }[] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((e) => ({ ...e, organizer: byId.get(e.user_id) ?? null })) as PublicEvent[];
    },
  });
}
