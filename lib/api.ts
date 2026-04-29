import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const AUTH_TOKEN_KEY = "tri_pro_auth_token";
const AUTH_USER_KEY = "tri_pro_auth_user";

type AuthUser = { id: string; email: string };
type AuthSession = { access_token: string; user: AuthUser };
type AuthChangeEvent = "SIGNED_IN" | "SIGNED_OUT";
type AuthCallback = (event: AuthChangeEvent, session: AuthSession | null) => void;

const authListeners = new Set<AuthCallback>();

async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

async function getSession(): Promise<AuthSession | null> {
  const token = await getToken();
  const user = await getStoredUser();
  if (!token || !user) return null;
  return { access_token: token, user };
}

async function setSession(token: string, user: AuthUser): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await AsyncStorage.removeItem(AUTH_USER_KEY);
}

async function notifyAuth(event: AuthChangeEvent): Promise<void> {
  const session = await getSession();
  for (const listener of authListeners) {
    listener(event, session);
  }
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getToken();
  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const resolvedUrl = `${API_BASE_URL}${normalizedPath}`;

  console.log(`[API] Requesting ${options.method ?? 'GET'} ${resolvedUrl}`);

  const res = await fetch(resolvedUrl, {
    ...options,
    headers,
  });
  
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  return body;
}

class QueryBuilder {
  private readonly table: string;
  private selectValue = "*";
  private filters = new URLSearchParams();
  private orderValue = "";
  private limitValue = "";
  private singleMode = false;
  private mutationType: "insert" | "update" | "delete" | null = null;
  private mutationPayload: Record<string, unknown> | Array<Record<string, unknown>> | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*"): this {
    this.selectValue = columns;
    return this;
  }

  eq(column: string, value: string | number | boolean | null): this {
    this.filters.set(`eq.${column}`, String(value));
    return this;
  }

  neq(column: string, value: string | number | boolean | null): this {
    this.filters.set(`neq.${column}`, String(value));
    return this;
  }

  in(column: string, values: Array<string | number | boolean>): this {
    this.filters.set(`in.${column}`, JSON.stringify(values));
    return this;
  }

  gte(column: string, value: string | number): this {
    this.filters.set(`gte.${column}`, String(value));
    return this;
  }

  lte(column: string, value: string | number): this {
    this.filters.set(`lte.${column}`, String(value));
    return this;
  }

  not(column: string, operator: string, value: string | number | boolean | null): this {
    this.filters.set(`not.${column}`, `${operator}.${value === null ? "null" : String(value)}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    const direction = options?.ascending === false ? "desc" : "asc";
    this.orderValue = `${column}.${direction}`;
    return this;
  }

  limit(value: number): this {
    this.limitValue = String(value);
    return this;
  }

  async single(): Promise<{ data: any; error: Error | null }> {
    this.singleMode = true;
    return this.execute();
  }

  async maybeSingle(): Promise<{ data: any; error: Error | null }> {
    this.singleMode = true;
    return this.execute();
  }

  // To allow 'await api.from(...)'
  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined);
  }

  private async execute(): Promise<{ data: any; error: Error | null }> {
    if (this.mutationType) {
      return this.executeMutation();
    }
    return this.executeSelect();
  }

  private async executeSelect(): Promise<{ data: any; error: Error | null }> {
    try {
      const params = new URLSearchParams(this.filters);
      params.set("select", this.selectValue);
      if (this.orderValue) params.set("order", this.orderValue);
      if (this.limitValue) params.set("limit", this.limitValue);

      const response = await request(`/api/db/${this.table}?${params.toString()}`, { method: "GET" });
      const data = this.singleMode ? response.data?.[0] ?? null : response.data;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  private async executeMutation(): Promise<{ data: any; error: Error | null }> {
    try {
      if (this.mutationType === "insert") {
        const response = await request(`/api/db/${this.table}`, {
          method: "POST",
          body: JSON.stringify(this.mutationPayload),
        });
        const data = this.singleMode ? response.data?.[0] ?? null : response.data;
        return { data, error: null };
      }

      if (this.mutationType === "update") {
        const response = await request(`/api/db/${this.table}?${this.filters.toString()}`, {
          method: "PATCH",
          body: JSON.stringify(this.mutationPayload),
        });
        const data = this.singleMode ? response.data?.[0] ?? null : response.data;
        return { data, error: null };
      }

      const response = await request(`/api/db/${this.table}?${this.filters.toString()}`, {
        method: "DELETE",
      });
      const data = this.singleMode ? response.data?.[0] ?? null : response.data;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>): this {
    this.mutationType = "insert";
    this.mutationPayload = payload;
    return this;
  }

  update(payload: Record<string, unknown>): this {
    this.mutationType = "update";
    this.mutationPayload = payload;
    return this;
  }

  delete(): this {
    this.mutationType = "delete";
    this.mutationPayload = null;
    return this;
  }
}

export const api = {
  auth: {
    async signUp(input: { email: string; password: string; options?: { data?: Record<string, string> } }) {
      try {
        const response = await request("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            email: input.email,
            password: input.password,
            metadata: input.options?.data ?? {},
          }),
        });
        await setSession(response.token, response.user);
        await notifyAuth("SIGNED_IN");
        return { data: { user: response.user }, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    async signInWithPassword(input: { email: string; password: string }) {
      try {
        const response = await request("/api/auth/signin", {
          method: "POST",
          body: JSON.stringify(input),
        });
        await setSession(response.token, response.user);
        await notifyAuth("SIGNED_IN");
        return { data: { user: response.user, session: { access_token: response.token, user: response.user } }, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    async signOut() {
      await clearSession();
      await notifyAuth("SIGNED_OUT");
      return { error: null };
    },
    async getSession() {
      return { data: { session: await getSession() }, error: null };
    },
    async getUser() {
        const session = await getSession();
        return { data: { user: session?.user ?? null }, error: null };
    },
    onAuthStateChange(callback: AuthCallback) {
      authListeners.add(callback);
      // Initial trigger
      getSession().then(session => callback(session ? "SIGNED_IN" : "SIGNED_OUT", session));
      
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },
  },
  functions: {
    async invoke(name: string, payload: { body?: unknown }) {
      try {
        const response = await request(`/api/functions/${name}`, {
          method: "POST",
          body: JSON.stringify(payload.body ?? {}),
        });
        return { data: response, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
  },
  from(table: string) {
    return new QueryBuilder(table);
  },
} as const;
