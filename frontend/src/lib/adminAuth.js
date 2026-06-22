import axios from 'axios';
import { supabase } from '@/lib/supabaseClient';

// Attache les identifiants admin a TOUS les appels axios (les endpoints publics les ignorent).
export function setSecretHeader(secret) {
  if (secret) axios.defaults.headers.common['X-Admin-Secret'] = secret;
  else delete axios.defaults.headers.common['X-Admin-Secret'];
}

export function setBearer(token) {
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete axios.defaults.headers.common['Authorization'];
}

let initialized = false;

// A appeler au demarrage de l'app : restaure le secret legacy + la session Supabase,
// et garde l'en-tete Authorization a jour lors du rafraichissement automatique du jeton.
export async function initAdminAuth() {
  if (initialized) return;
  initialized = true;
  const secret = localStorage.getItem('afroboost_admin_session');
  if (secret) setSecretHeader(secret);
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) setBearer(data.session.access_token);
    supabase.auth.onAuthStateChange((_event, session) => {
      setBearer(session?.access_token || null);
    });
  } catch (e) {
    /* ignore */
  }
}

export async function isAdminAuthenticated() {
  if (localStorage.getItem('afroboost_admin_session')) return true;
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
  if (supabase) {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
  }
  if (navigate) navigate('/admin-login');
}
