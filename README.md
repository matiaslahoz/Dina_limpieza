# Dina Limpieza

App móvil (React Native + Expo) para que la empresa de limpieza **Dina**
controle quién limpió cada habitación, cuándo entró y cuándo salió, en los
edificios de sus clientes.

Tres roles:

| Rol      | Quién es                                   | Qué puede hacer                                                                 |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| `cleaner`| Personal de Dina                           | Escanear QR de cada habitación al entrar / salir, ver su historial              |
| `client` | Dueño / responsable de los edificios       | Escanear QR para ver quién limpió esa habitación y cuándo                       |
| `admin`  | Administrador de Dina                      | Crear edificios, pisos, habitaciones, generar QR para imprimir, ver reportes    |

## Stack

- **Expo SDK 51** + expo-router (file-based routing)
- **Auth0** (Universal Login + PKCE, RBAC con custom claim)
- **Supabase** (Postgres + RLS) — el access token de Auth0 viaja como Bearer
- **expo-camera** para escanear QR · **react-native-qrcode-svg** + **expo-print** para generarlos e imprimirlos en PDF

## Estructura

```
app/                       Rutas (expo-router)
  _layout.tsx              AuthProvider + Stack raíz
  index.tsx                Redirige según el rol
  login.tsx                Login con Auth0
  no-role.tsx              Cuenta sin rol asignado
  (cleaner)/               Screens del personal de limpieza
  (client)/                Screens del cliente
  (admin)/                 Panel del administrador
src/
  auth/                    AuthProvider + RoleGuard
  components/              Button, Screen, QRScanner
  lib/                     supabase client, env, sessions, buildings, admin
  types/                   Tipos compartidos
supabase/
  migrations/              SQL del esquema (buildings, floors, rooms, sessions, RLS, RPCs)
  seed.sql                 Datos demo: 1 cliente con 4 edificios
```

## Setup local (Mac)

```bash
git clone git@github.com:matiaslahoz/dina_limpieza.git
cd dina_limpieza
git checkout claude/dina-cleaning-app-pHZgW
npm install
cp .env.example .env       # completar con valores reales
npm run start              # abre el dev server, escaneá con Expo Go o corré en sim
```

> Para iOS necesitás Xcode instalado, para Android necesitás Android Studio.
> Con **Expo Go** podés probar todo menos la firma final del bundle.

## Configuración de Auth0

1. **Crear un tenant** en [auth0.com](https://auth0.com) si no tenés uno.
2. **Application** → *Native* → tomá nota de `Domain` y `Client ID`.
   - **Allowed Callback URLs**: `dinalimpieza://auth`, `exp://*` (para desarrollo)
   - **Allowed Logout URLs**: lo mismo.
   - Activar `Refresh Token Rotation` y `Refresh Token Expiration` (sliding).
3. **API** → crear una API con Identifier (audience) `https://api.dina-limpieza`
   y dejar **RBAC** + **Add Permissions in the Access Token** activados.
4. **Roles** → crear `admin`, `cleaner`, `client`. Asignar a los usuarios.
5. **Action (Login flow)** → un único Action que (a) inyecta los roles en el
   token y (b) avisa a Supabase para crear/actualizar el profile:

   ```js
   exports.onExecutePostLogin = async (event, api) => {
     const namespace = 'https://dina.app/roles';
     const roles = event.authorization?.roles ?? [];
     api.accessToken.setCustomClaim(namespace, roles);
     api.idToken.setCustomClaim(namespace, roles);

     // Sync con Supabase (idempotente, no bloquea login si falla)
     try {
       await fetch(event.secrets.SUPABASE_SYNC_URL, {
         method: 'POST',
         headers: {
           'content-type': 'application/json',
           'x-shared-secret': event.secrets.SUPABASE_SYNC_SECRET,
         },
         body: JSON.stringify({
           auth0_sub: event.user.user_id,
           email: event.user.email,
           full_name: event.user.name,
           roles,
         }),
       });
     } catch (e) {
       console.log('supabase sync failed', e);
     }
   };
   ```

   En el Action, agregar dos *secrets*:
   - `SUPABASE_SYNC_URL`: `https://<PROJECT_REF>.functions.supabase.co/auth0-sync-profile`
   - `SUPABASE_SYNC_SECRET`: el mismo valor seteado en
     `AUTH0_SYNC_SECRET` de la Edge Function.

   Si cambiás el namespace de roles, actualizá `EXPO_PUBLIC_AUTH0_ROLES_CLAIM`.

6. Llenar `.env`:

   ```
   EXPO_PUBLIC_AUTH0_DOMAIN=tu-tenant.us.auth0.com
   EXPO_PUBLIC_AUTH0_CLIENT_ID=...
   EXPO_PUBLIC_AUTH0_AUDIENCE=https://api.dina-limpieza
   EXPO_PUBLIC_AUTH0_ROLES_CLAIM=https://dina.app/roles
   ```

## Configuración de Supabase

1. **Proyecto nuevo** en [supabase.com](https://supabase.com).
2. **Authentication → JWT Settings**: poné el JWT Secret + audience según tu
   API de Auth0. La forma simple es usar **JWT Hooks** de Supabase para validar
   contra el JWKS de Auth0:
   - JWT Secret: el secreto compartido (o JWKS endpoint si usás *Third-party JWT*).
   - JWT Audience: `https://api.dina-limpieza`.
3. **SQL Editor** → ejecutar las migrations en orden:
   - `supabase/migrations/20260426_init.sql` (esquema base + RLS + RPCs)
   - `supabase/migrations/20260427_features.sql` (geofence, push token, stale rooms)
   - `supabase/migrations/20260427_cron.sql` (programa la job cada 30 minutos
     — reemplazar `<PROJECT_REF>` y `<CRON_SECRET>` por los valores reales)
4. (Opcional) ejecutar `supabase/seed.sql` para crear el cliente demo y 4
   edificios.
5. Copiá `Project URL` y `anon key` a `.env`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

6. **Edge Functions** (necesitan el [Supabase CLI](https://supabase.com/docs/guides/cli)):

   ```bash
   supabase login
   supabase link --project-ref <PROJECT_REF>

   # Secrets server-side (NO van al .env del cliente)
   supabase secrets set \
     AUTH0_SYNC_SECRET=$(openssl rand -hex 32) \
     CRON_SECRET=$(openssl rand -hex 32)

   supabase functions deploy auth0-sync-profile
   supabase functions deploy notify-stale-rooms
   ```

   - Copiar `AUTH0_SYNC_SECRET` al *secret* `SUPABASE_SYNC_SECRET` del Auth0
     Action (sección Auth0 más arriba).
   - Copiar `CRON_SECRET` al SQL de `20260427_cron.sql` antes de correrlo.

7. Los profiles se crean **automáticamente** en el primer login gracias al
   Auth0 Action. El admin sólo tiene que asignar `client_org_id` a los usuarios
   con rol `client` (desde Supabase, una sola vez).

## Cómo funciona el flujo

1. **Cleaner** escanea el QR pegado en la puerta → la app llama
   `rpc('check_in', { p_qr_token })` → se inserta una `cleaning_session` con
   `check_out_at = null`. Si había una sesión abierta, la cierra
   automáticamente.
2. **Cleaner** termina y vuelve a escanear el mismo QR → `rpc('check_out', ...)`
   completa el `check_out_at` de esa sesión.
3. **Client** escanea el QR de cualquier habitación → la app consulta
   `cleaning_history` filtrando por `room_id` (RLS asegura que sólo ve los
   edificios de su `client_org_id`).
4. **Admin** crea edificios → pisos → habitaciones (la BD genera un
   `qr_token` único) y desde la pantalla de la habitación imprime un PDF con
   el QR para pegar en la puerta.

## Funciones automáticas

- **Auto-provisioning de profiles**: el Auth0 Post-Login Action llama a la
  Edge Function `auth0-sync-profile` que hace upsert en `profiles`.
- **Geofence opcional**: si `building.geofence_radius_m` está seteado, el
  cleaner debe estar dentro del radio para hacer check-in. Se valida tanto
  client-side (UX) como server-side en la RPC `check_in`.
- **Notificaciones de habitaciones sin limpiar**: cada edificio puede tener
  un `stale_threshold_hours`. Cada 30 minutos pg_cron invoca la Edge Function
  `notify-stale-rooms` que manda push (vía Expo) a admins y al cliente del
  edificio si una habitación supera el umbral. Para no spamear hay un
  cooldown de 6 horas por habitación.
- **Push tokens**: la app registra automáticamente el `expo_push_token` en el
  profile al loguearse. Para que funcionen los push en producción hay que
  buildear con EAS (`eas build`); en Expo Go los push tokens funcionan sólo
  para el proyecto del dueño del Expo Go.

## Próximos pasos sugeridos

- [ ] Foto opcional al hacer check-out para evidenciar el trabajo
- [ ] Edge Function que reciba webhooks de Auth0 *al asignar/quitar roles*
      para sincronizar el `role` en `profiles`
- [ ] Tests con Detox / Jest
- [ ] Selector de mapa para fijar coords del edificio (vs. ingreso manual)

## Comandos útiles

```bash
npm run start          # Expo dev server
npm run ios            # iOS simulator
npm run android        # Android emulator
npm run typecheck      # tsc --noEmit
npm run supabase:types # genera tipos a partir del schema
```
