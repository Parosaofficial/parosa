// Parosa — authentication helpers (Supabase Auth, email + password).
// Sign up = create a brand-new owner account. Sign in = authenticate a returning owner.

import { supabase } from "./supabase";

export type AuthResult = { userId: string; hasSession: boolean };

/** Human-friendly message for the auth errors owners actually hit. */
export function authMessage(err: unknown): string {
  const m = (err as { message?: string })?.message?.toLowerCase() ?? "";
  if (m.includes("already registered") || m.includes("already been registered")) return "This email already has an account — sign in instead.";
  if (m.includes("invalid login")) return "Wrong email or password. Please try again.";
  if (m.includes("email not confirmed")) return "Please confirm your email, then sign in.";
  if (m.includes("password should be")) return "Password must be at least 6 characters.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "That email address doesn't look right.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts — wait a minute and try again.";
  return "Something went wrong. Please try again.";
}

/** Create a new auth user. Returns the new user id and whether a session was issued. */
export async function signUpOwner(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  if (!data.user) throw new Error("Sign up failed");
  return { userId: data.user.id, hasSession: !!data.session };
}

/** Authenticate an existing owner. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return { userId: data.user.id, hasSession: !!data.session };
}

export async function signOutOwner(): Promise<void> {
  await supabase.auth.signOut();
}

/** Current signed-in user id, or null. */
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** The signed-in owner's id and email, or null. */
export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: (u.email ?? "").toLowerCase() } : null;
}

/** "Forgot password?" — emails a link that opens /login/new-password signed in for a reset. */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/login/new-password`,
  });
  if (error) throw error;
}

/** Sets a new password for the signed-in user (after opening the reset link). */
export async function setNewPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
