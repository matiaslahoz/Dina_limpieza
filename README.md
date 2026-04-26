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
5. **Action (Login flow)** → agregar los roles como claim custom:

   ```js
   exports.onExecutePostLogin = async (event, api) => {
     const namespace = 'https://dina.app/roles';
     const roles = (event.authorization?.roles ?? []);
     api.accessToken.setCustomClaim(namespace, roles);
     api.idToken.setCustomClaim(namespace, roles);
   };
   ```

   Si cambiás el namespace, actualizá `EXPO_PUBLIC_AUTH0_ROLES_CLAIM`.

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
3. **SQL Editor** → pegar `supabase/migrations/20260426_init.sql` y ejecutar.
4. (Opcional) ejecutar `supabase/seed.sql` para crear el cliente demo y 4
   edificios.
5. Copiá `Project URL` y `anon key` a `.env`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

6. **Importante**: cada usuario que se loguea en Auth0 necesita una fila en
   `profiles` con su `auth0_sub`, `role` y (para `client`) su `client_org_id`.
   Hoy esto se hace manualmente. Próximo paso: agregar un Auth0 Action que
   llame a un Edge Function de Supabase para crear el profile la primera vez.

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

## Próximos pasos sugeridos

- [ ] Auto-aprovisionar profile en el primer login (Auth0 Action + Edge Function)
- [ ] Notificación push cuando una habitación lleva mucho tiempo sin limpiar
- [ ] Reportes filtrables por edificio / piso / rango de fechas (export CSV)
- [ ] Foto opcional al hacer check-out para evidenciar el trabajo
- [ ] Geofence: validar que el cleaner está físicamente en el edificio al escanear
- [ ] Tests con Detox / Jest

## Comandos útiles

```bash
npm run start          # Expo dev server
npm run ios            # iOS simulator
npm run android        # Android emulator
npm run typecheck      # tsc --noEmit
npm run supabase:types # genera tipos a partir del schema
```
