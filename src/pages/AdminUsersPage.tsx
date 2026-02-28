import { useEffect, useState } from "react";
import { AppLayout } from "../components/AppLayout";
import { supabase } from "../lib/supabase";
import type { Profile, UserRole } from "../types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Profile | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers((data as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const saveUser = async () => {
    if (!editing) return;
    await supabase
      .from("profiles")
      .update({
        full_name: editing.full_name,
        role: editing.role,
        is_active: editing.is_active
      })
      .eq("id", editing.id);
    setEditing(null);
    void load();
  };

  return (
    <AppLayout>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">
        Gestion des utilisateurs
      </h1>
      {loading ? (
        <div className="text-sm text-slate-600">Chargement des utilisateurs...</div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-1.5 py-0.5 text-left font-medium text-slate-600">Nom</th>
                  <th className="px-1.5 py-0.5 text-left font-medium text-slate-600">Email</th>
                  <th className="px-1.5 py-0.5 text-left font-medium text-slate-600">Rôle</th>
                  <th className="px-1.5 py-0.5 text-left font-medium text-slate-600">
                    Actif
                  </th>
                  <th className="px-1.5 py-0.5" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-1.5 py-0.5 text-slate-900">{u.full_name || "-"}</td>
                    <td className="px-1.5 py-0.5 text-slate-700">{u.email}</td>
                    <td className="px-1.5 py-0.5 text-slate-700">{u.role}</td>
                    <td className="px-1.5 py-0.5 text-slate-700">
                      {u.is_active ? "Oui" : "Non"}
                    </td>
                    <td className="px-1.5 py-0.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(u)}
                      >
                        Modifier
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editing && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Modifier l&apos;utilisateur
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={editing.full_name ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, full_name: e.target.value })
                  }
                  placeholder="Nom complet"
                />
                <select
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={editing.role}
                  onChange={(e) =>
                    setEditing({ ...editing, role: e.target.value as UserRole })
                  }
                >
                  <option value="demandeur">Demandeur</option>
                  <option value="gdr">GDR</option>
                  <option value="admin">Admin</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(e) =>
                      setEditing({ ...editing, is_active: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Compte actif
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(null)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveUser()}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

