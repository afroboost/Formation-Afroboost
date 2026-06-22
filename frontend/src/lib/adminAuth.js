import axios from 'axios';
import { supabase } from '@/lib/supabaseClient';
import { firebaseAuth } from '@/lib/firebaseClient';
import { onIdTokenChanged, signOut as fbSignOut } from 'firebase/auth';

// Attache les identifiants admin a TOUS les appels axios (les endpoints publics les ignorent).
export function setSecretHeader(secret) {
  if (secret) axios.defaults.headers.common['X-Admin-Secret'] = secret;
  else delete axios.defaults.headers.common['X-Admin-Secret'];
}

export function setBearer(token) {
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete axios.defaults.headers.common['Authorization'];
}

// Choisit le meilleur jeton : Firebase prioritaire, sinon Supabase.
async function refreshBearer() {
  if (firebaseAuth && firebaseAuth.currentUser) {
    try {
      setBearer(await firebaseAuth.currentUser.getIdToken());
      return;
    } catch { /* ignore */ }
  }
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        setBearer(data.session.access_token);
        return;
      }
    } catch { /* ignore */ }
  }
  if (!localStorage.getItem('afroboost_admin_session')) setBearer(null);
}

let initialized = false;

// Restaure secret legacy + sessions Firebase/Supabase, et garde l'en-tete Authorization
// a jour lors du rafraichissement automatique du jeton (Firebase ~1h, Supabase).
export async function initAdminAuth() {
  if (initialized) return;
  initialized = true;
  const secret = localStorage.getItem('afroboost_admin_session');
  if (secret) setSecretHeader(secret);

  if (firebaseAuth) {
    onIdTokenChanged(firebaseAuth, async (user) => {
      if (user) {
        try { setBearer(await user.getIdToken()); } catch { /* ignore */ }
      } else {
        await refreshBearer();
      }
    });
  }
  if (supabase) {
    try {
      supabase.auth.onAuthStateChange((_event, session) => {
        if (firebaseAuth && firebaseAuth.currentUser) return; // Firebase prioritaire
        setBearer(session?.access_token || null);
      });
    } catch { /* ignore */ }
  }

  if (firebaseAuth) {
    try { await firebaseAuth.authStateReady(); } catch { /* ignore */ }
  }
  await refreshBearer();
}

export async function isAdminAuthenticated() {
  if (localStorage.getItem('afroboost_admin_session')) return true;
  if (firebaseAuth) {
    try { await firebaseAuth.authStateReady(); } catch { /* ignore */ }
    if (firebaseAuth.currentUser) return true;
  }
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      return !!data?.session;
    } catch {
      return false;
    }
  }
  return false;
}

export async function adminLogout(navigate) {
  setSecretHeader(null);
  setBearer(null);
  localStorage.removeItem('afroboost_admin_session');
  if (firebaseAuth) {
    try { await fbSignOut(firebaseAuth); } catch { /* ignore */ }
  }
  if (supabase) {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
  }
  if (navigate) navigate('/admin-login');
}
