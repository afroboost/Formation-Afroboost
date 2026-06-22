import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Client Supabase partage (fournisseur d'identite unique avec afroboosteur.com).
// Null si non configure -> on retombe sur le secret admin legacy.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
