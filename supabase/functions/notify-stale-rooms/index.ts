// Edge Function: notify-stale-rooms
// Disparada por pg_cron (o invocada manualmente) cada N minutos. Busca
// habitaciones cuya última limpieza supera `building.stale_threshold_hours`
// y envía un push a los admins (y al cliente del edificio) usando Expo.
//
// Para no spamear, registra cada notificación en stale_notifications y sólo
// vuelve a notificar una habitación si pasaron al menos
// `STALE_REMINDER_HOURS` horas desde la última notificación.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const STALE_REMINDER_HOURS = 6;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface StaleRow {
  room_id: string;
  room_name: string;
  floor_name: string;
  building_id: string;
  building_name: string;
  client_org_id: string;
  hours_since_clean: number;
}

interface Recipient {
  id: string;
  expo_push_token: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

Deno.serve(async (req) => {
  // Aceptamos GET (cron) y POST (invocación manual)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data: stale, error: staleErr } = await supabase
    .from('stale_rooms')
    .select('*');
  if (staleErr) return json({ error: 'stale_query_failed', details: staleErr.message }, 500);

  const since = new Date(Date.now() - STALE_REMINDER_HOURS * 3600 * 1000).toISOString();
  const { data: recent, error: recentErr } = await supabase
    .from('stale_notifications')
    .select('room_id')
    .gte('notified_at', since);
  if (recentErr) return json({ error: 'recent_query_failed', details: recentErr.message }, 500);

  const skip = new Set((recent ?? []).map((r) => r.room_id as string));
  const targets = ((stale ?? []) as StaleRow[]).filter((r) => !skip.has(r.room_id));
  if (targets.length === 0) return json({ ok: true, sent: 0, skipped: skip.size });

  const messages: { to: string; title: string; body: string; data: Record<string, unknown> }[] = [];
  const auditRows: { room_id: string; recipients: number }[] = [];

  for (const row of targets) {
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, expo_push_token, role, client_org_id')
      .not('expo_push_token', 'is', null)
      .or(`role.eq.admin,and(role.eq.client,client_org_id.eq.${row.client_org_id})`);
    if (profErr) continue;

    const recipients = (profiles ?? []) as (Recipient & { role: string; client_org_id: string | null })[];
    if (recipients.length === 0) continue;

    const hours = Math.round(row.hours_since_clean);
    for (const r of recipients) {
      messages.push({
        to: r.expo_push_token,
        title: `Limpieza pendiente · ${row.building_name}`,
        body: `Piso ${row.floor_name} · ${row.room_name} sin limpieza desde hace ${hours}h`,
        data: { roomId: row.room_id, buildingId: row.building_id, kind: 'stale_room' },
      });
    }
    auditRows.push({ room_id: row.room_id, recipients: recipients.length });
  }

  if (messages.length === 0) return json({ ok: true, sent: 0, skipped: skip.size });

  // Expo acepta hasta 100 mensajes por request
  const batches: typeof messages[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    batches.push(messages.slice(i, i + 100));
  }
  for (const batch of batches) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(batch),
    }).catch(() => {});
  }

  if (auditRows.length > 0) {
    await supabase.from('stale_notifications').insert(auditRows);
  }

  return json({ ok: true, sent: messages.length, rooms: auditRows.length });
});
