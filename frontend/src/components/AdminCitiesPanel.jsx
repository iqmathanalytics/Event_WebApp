import { useCallback, useEffect, useState } from "react";
import { FiMapPin, FiPlus, FiTrash2 } from "react-icons/fi";
import api from "../services/api";

export default function AdminCitiesPanel() {
  const [cities, setCities] = useState([]);
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/cities/dropdown");
      setCities(res.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load cities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !state.trim()) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/admin/cities/dropdown", { name: name.trim(), state: state.trim().toUpperCase() });
      setName("");
      setState("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not add city.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id) => {
    setError("");
    try {
      await api.delete(`/admin/cities/dropdown/${id}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not remove city.");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Global city dropdown</h2>
        <p className="mt-1 text-sm text-slate-600">
          Cities listed here appear in the navbar, filters, and listing forms across the site.
        </p>
      </div>

      <form onSubmit={(e) => void handleAdd(e)} className="flex flex-wrap items-end gap-2">
        <label className="min-w-[10rem] flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">City</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Simi Valley"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="w-24">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">State</span>
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="CA"
            maxLength={2}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <FiPlus />
          Add city
        </button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading cities…</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {cities.map((city) => (
            <li key={city.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
                <FiMapPin className="text-slate-400" />
                {city.label}
              </span>
              {city.slug !== "others-us" ? (
                <button
                  type="button"
                  onClick={() => void handleRemove(city.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  <FiTrash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              ) : (
                <span className="text-xs text-slate-400">Required</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
