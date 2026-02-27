import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from "react";
import type { UserRole, Profile } from "../types";
import { supabase, fetchProfile } from "../lib/supabase";

interface AuthContextValue {
  userId: string | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Error | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUserId(session.user.id);
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      } else {
        setUserId(null);
        setProfile(null);
      }
      setLoading(false);
    };

    void init();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        void fetchProfile(session.user.id).then((p) => setProfile(p));
      } else {
        setUserId(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error;
    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value: AuthContextValue = {
    userId,
    profile,
    role: profile?.role ?? null,
    loading,
    signIn,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return ctx;
}

