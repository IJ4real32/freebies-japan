// Frontend admin helpers (advisory only; backend must enforce!)
import { auth, functions } from "../config/firebase";
import { httpsCallable } from "firebase/functions";
import { User } from "firebase/auth";
import { useState, useEffect } from "react";

/** Returns the current user or throws if not signed in. */
export function requireUser(): User {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  return user;
}

/** Load ID token result with claims; refresh if requested. */
export async function getClaims(forceRefresh: boolean = false) {
  const user = requireUser();
  return user.getIdTokenResult(forceRefresh);
}

/** Assert admin flag from custom claims. Throws if not admin. */
export async function assertAdmin(): Promise<boolean> {
  const token = await getClaims(true); // force refresh in case claims just set
  if (!token.claims?.admin) {
    throw new Error("Admin privileges required");
  }
  return true;
}

/** Check if current user is admin (advisory only) */
export async function isAdmin(): Promise<boolean> {
  try {
    const token = await getClaims();
    return !!token.claims?.admin;
  } catch {
    return false;
  }
}

/** Safe call wrapper for callable functions with standard error surface. */
export async function call(name: string, data: any = {}): Promise<any> {
  try {
    const fn = httpsCallable(functions, name);
    const res = await fn(data);
    return res?.data ?? null;
  } catch (err: any) {
    // Normalize Firebase callable errors
    const message = err?.message || "Unknown error";
    const code = err?.code || "unknown";
    throw new Error(`${code}: ${message}`);
  }
}

/** Currency formatting (JPY default). */
export function formatCurrency(n: number | string): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(Number(n || 0));
}

/** Datetime display (Tokyo). */
export function formatDate(ms: number | string | null | undefined): string {
  if (!ms) return "-";
  return new Date(ms).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

/** Tiny loader state helper */
interface AsyncState<T> {
  loading: boolean;
  error: Error | null;
  data: T | null;
}

export function useAsync<T>(asyncFn: () => Promise<T>, deps: any[] = []): AsyncState<T> {
  const [state, set] = useState<AsyncState<T>>({ loading: false, error: null, data: null });
  
  useEffect(() => {
    let mounted = true;
    set((s: AsyncState<T>) => ({ ...s, loading: true, error: null }));
    
    asyncFn()
      .then((data: T) => mounted && set({ loading: false, error: null, data }))
      .catch((error: Error) => mounted && set({ loading: false, error, data: null }));
      
    return () => { mounted = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  
  return state;
}

// Keep the original function names for backward compatibility
export { formatCurrency as jpy, formatDate as dt };