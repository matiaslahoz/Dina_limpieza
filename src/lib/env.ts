import Constants from 'expo-constants';

const fromExtra = (key: string) =>
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.[key];

const read = (envKey: string, extraKey: string): string => {
  const value = process.env[envKey] ?? fromExtra(extraKey);
  if (!value || value.endsWith('_PLACEHOLDER')) {
    throw new Error(
      `Falta ${envKey}. Definilo en .env (EXPO_PUBLIC_...) o en app.json -> expo.extra.`,
    );
  }
  return value;
};

export const env = {
  auth0Domain: read('EXPO_PUBLIC_AUTH0_DOMAIN', 'auth0Domain'),
  auth0ClientId: read('EXPO_PUBLIC_AUTH0_CLIENT_ID', 'auth0ClientId'),
  auth0Audience: read('EXPO_PUBLIC_AUTH0_AUDIENCE', 'auth0Audience'),
  auth0RolesClaim:
    process.env.EXPO_PUBLIC_AUTH0_ROLES_CLAIM ?? 'https://dina.app/roles',
  supabaseUrl: read('EXPO_PUBLIC_SUPABASE_URL', 'supabaseUrl'),
  supabaseAnonKey: read('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'supabaseAnonKey'),
};
