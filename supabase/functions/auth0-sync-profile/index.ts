// Edge Function: auth0-sync-profile
// Llamada desde un Auth0 Post-Login Action para crear/actualizar el profile
// del usuario en Supabase. Idempotente.
//
// Headers requeridos:
//   x-shared-secret: AUTH0_SYNC_SECRET (env var de Supabase)
//
// Body:
//   {
//     auth0_sub: string,
//     email?: string,
//     full_name?: string,
//     roles: string[]
//   }
//
// Comportamiento:
//   * Si no hay roles válidos, devuelve 422 (Auth0 lo maneja como warning).
//   * Si el profile ya existe, actualiza email/full_name y deja role/client_org_id
//     intactos (para no pisar cambios manuales del admin).
//   * Si no existe, lo crea con el primer rol válido y client_org_id null.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type Role = 'admin' | 'cleaner' | 'client';
const VALID_ROLES: Role[] = ['admin', 'cleaner', 'client'];

interface Payload {
  auth0_sub?: string;
  email?: string;
  full_name?: string;
  roles?: string[];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const expected = Deno.env.get('AUTH0_SYNC_SECRET');
  if (!expected) return json({ error: 'server_misconfigured' }, 500);
  if (req.headers.get('x-shared-secret') !== expected) {
    return json({ error: 'unauthorized' }, 401);
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const sub = payload.auth0_sub?.trim();
  if (!sub) return json({ error: 'missing_auth0_sub' }, 400);

  const role = (payload.roles ?? []).find((r): r is Role =>
    VALID_ROLES.includes(r as Role),
  );
  if (!role) return json({ error: 'no_valid_role' }, 422);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('id, role, client_org_id')
    .eq('auth0_sub', sub)
    .maybeSingle();
  if (selErr) return json({ error: 'select_failed', details: selErr.message }, 500);

  if (existing) {
    const { error } = await supabase
      .from('profiles')
      .update({
        email: payload.email ?? null,
        full_name: payload.full_name ?? null,
      })
      .eq('id', existing.id);
    if (error) return json({ error: 'update_failed', details: error.message }, 500);
    return json({ ok: true, created: false, profile_id: existing.id });
  }

  const { data: created, error: insErr } = await supabase
    .from('profiles')
    .insert({
      auth0_sub: sub,
      email: payload.email ?? null,
      full_name: payload.full_name ?? null,
      role,
    })
    .select('id')
    .single();
  if (insErr) return json({ error: 'insert_failed', details: insErr.message }, 500);

  return json({ ok: true, created: true, profile_id: created.id });
});
