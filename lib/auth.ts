import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = true; 
let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((l) => l());
}

export function setAuth(session: Session | null) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}

supabase.auth.getSession().then(({ data: { session } }) => {
  setAuth(session);
});


supabase.auth.onAuthStateChange((_event, session) => {
  setAuth(session);
});

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
  };
}

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  // Pass metadata so the database trigger can read it
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: profile?.full_name ?? '',
        role: profile?.role ?? 'student',
      },
    },
  });

  if (error) return { data, error };

  // Fallback direct insert if you don't use triggers (requires RLS policy)
  if (data.session?.user && profile) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.session.user.id,
        email: email.trim(),
        full_name: profile.full_name,
        role: profile.role,
      });

    if (profileError) {
      console.error('Profile insert error:', profileError.message);
    }
  }

  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error && data.session) {
    setAuth(data.session);
  }
  return { data, error };
}

export async function signOut() {
  setAuth(null);
  await supabase.auth.signOut().catch(() => {});
  return { error: null };
}