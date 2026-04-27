import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { jwtDecode } from 'jwt-decode';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { env } from '@/lib/env';
import { registerPushToken } from '@/lib/push';
import { setSupabaseAccessToken, supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

WebBrowser.maybeCompleteAuthSession();

const STORE_KEY = 'dina.auth.tokens.v1';
const VALID_ROLES: UserRole[] = ['admin', 'cleaner', 'client'];

interface StoredTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number;
}

interface AuthState {
  loading: boolean;
  signedIn: boolean;
  role: UserRole | null;
  profile: Profile | null;
  email: string | null;
  name: string | null;
  redirectUri: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: `https://${env.auth0Domain}/authorize`,
  tokenEndpoint: `https://${env.auth0Domain}/oauth/token`,
  revocationEndpoint: `https://${env.auth0Domain}/oauth/revoke`,
  endSessionEndpoint: `https://${env.auth0Domain}/v2/logout`,
};

const extractRole = (accessToken: string): UserRole | null => {
  try {
    const payload = jwtDecode<Record<string, unknown>>(accessToken);
    const claim = payload[env.auth0RolesClaim];
    const roles = Array.isArray(claim) ? claim : typeof claim === 'string' ? [claim] : [];
    return (roles.find((r): r is UserRole =>
      VALID_ROLES.includes(r as UserRole),
    ) ?? null);
  } catch {
    return null;
  }
};

const persist = (tokens: StoredTokens | null) =>
  tokens
    ? SecureStore.setItemAsync(STORE_KEY, JSON.stringify(tokens))
    : SecureStore.deleteItemAsync(STORE_KEY);

const load = async (): Promise<StoredTokens | null> => {
  const raw = await SecureStore.getItemAsync(STORE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [identity, setIdentity] = useState<{ email: string | null; name: string | null }>({
    email: null,
    name: null,
  });
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const redirectUri = useMemo(() => {
    const uri = AuthSession.makeRedirectUri({ scheme: 'dinalimpieza', path: 'auth' });
    if (__DEV__) console.log('[Auth0] redirect_uri =', uri);
    return uri;
  }, []);

  const applyTokens = useCallback(async (next: StoredTokens | null) => {
    setTokens(next);
    setSupabaseAccessToken(next?.accessToken ?? null);
    await persist(next);

    if (!next) {
      setProfile(null);
      setIdentity({ email: null, name: null });
      return;
    }

    if (next.idToken) {
      try {
        const payload = jwtDecode<{ email?: string; name?: string }>(next.idToken);
        setIdentity({ email: payload.email ?? null, name: payload.name ?? null });
      } catch {
        // ignore
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth0_sub', jwtDecode<{ sub: string }>(next.accessToken).sub)
      .maybeSingle();
    if (!error) {
      const profile = (data as Profile | null) ?? null;
      setProfile(profile);
      if (profile) registerPushToken(profile.id).catch(() => {});
    }
  }, []);

  const refresh = useCallback(
    async (refreshToken: string) => {
      const result = await AuthSession.refreshAsync(
        {
          clientId: env.auth0ClientId,
          refreshToken,
          extraParams: { audience: env.auth0Audience },
        },
        discovery,
      );
      const next: StoredTokens = {
        accessToken: result.accessToken,
        idToken: result.idToken,
        refreshToken: result.refreshToken ?? refreshToken,
        expiresAt: Date.now() + (result.expiresIn ?? 3600) * 1000,
      };
      await applyTokens(next);
      return next;
    },
    [applyTokens],
  );

  useEffect(() => {
    (async () => {
      const stored = await load();
      if (!stored) {
        setLoading(false);
        return;
      }
      const expiresSoon = stored.expiresAt - Date.now() < 60_000;
      if (expiresSoon && stored.refreshToken) {
        try {
          await refresh(stored.refreshToken);
        } catch {
          await applyTokens(null);
        }
      } else {
        await applyTokens(stored);
      }
      setLoading(false);
    })();
  }, [applyTokens, refresh]);

  // Programar refresh proactivo
  useEffect(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    if (!tokens?.refreshToken) return;
    const ms = Math.max(tokens.expiresAt - Date.now() - 60_000, 5_000);
    refreshTimer.current = setTimeout(() => {
      refresh(tokens.refreshToken!).catch(() => applyTokens(null));
    }, ms);
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [tokens, refresh, applyTokens]);

  const signIn = useCallback(async () => {
    const request = new AuthSession.AuthRequest({
      clientId: env.auth0ClientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      usePKCE: true,
      extraParams: { audience: env.auth0Audience, prompt: 'login' },
    });
    const result = await request.promptAsync(discovery);
    if (result.type !== 'success' || !result.params.code) {
      throw new Error('Login cancelado');
    }
    const exchange = await AuthSession.exchangeCodeAsync(
      {
        clientId: env.auth0ClientId,
        code: result.params.code,
        redirectUri,
        extraParams: {
          code_verifier: request.codeVerifier ?? '',
          audience: env.auth0Audience,
        },
      },
      discovery,
    );
    const next: StoredTokens = {
      accessToken: exchange.accessToken,
      idToken: exchange.idToken,
      refreshToken: exchange.refreshToken,
      expiresAt: Date.now() + (exchange.expiresIn ?? 3600) * 1000,
    };
    await applyTokens(next);
  }, [redirectUri, applyTokens]);

  const signOut = useCallback(async () => {
    await applyTokens(null);
    const logoutUrl =
      `https://${env.auth0Domain}/v2/logout?client_id=${env.auth0ClientId}` +
      `&returnTo=${encodeURIComponent(redirectUri)}`;
    try {
      await WebBrowser.openAuthSessionAsync(logoutUrl, redirectUri);
    } catch {
      // ignore
    }
  }, [applyTokens, redirectUri]);

  const role = tokens ? extractRole(tokens.accessToken) ?? profile?.role ?? null : null;

  const value: AuthState = {
    loading,
    signedIn: !!tokens,
    role,
    profile,
    email: identity.email,
    name: identity.name,
    redirectUri,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
};
