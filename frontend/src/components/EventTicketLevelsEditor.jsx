import { FiPlus, FiTrash2 } from "react-icons/fi";
import { MAX_LEVELS, newTicketLevelId, TICKET_LEVEL_PRESETS } from "../utils/eventTicketLevels";

function emptyLevel(sortOrder = 0) {
  return {
    id: newTicketLevelId(),
    name: "",
    description: "",
    price: "",
    sort_order: sortOrder
  };
}

export default function EventTicketLevelsEditor({ levels, onChange, disabled = false }) {
  const rows = Array.isArray(levels) ? levels : [];

  const updateRow = (index, patch) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  };

  const removeRow = (index) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const addRow = (preset) => {
    if (rows.length >= MAX_LEVELS) {
      return;
    }
    const sortOrder = rows.length;
    if (preset) {
      onChange([
        ...rows,
        {
          id: newTicketLevelId(),
          name: preset.name,
          description: preset.description,
          price: "",
          sort_order: sortOrder
        }
      ]);
      return;
    }
    onChange([...rows, emptyLevel(sortOrder)]);
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Ticket levels</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Add as many tiers as you need (e.g. General, Premium, VIP). Each level has its own price and description.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || rows.length >= MAX_LEVELS}
          onClick={() => addRow()}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <FiPlus className="h-3.5 w-3.5" />
          Add level
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-center">
          <p className="text-sm text-slate-600">No ticket levels yet.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {TICKET_LEVEL_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                disabled={disabled}
                onClick={() => addRow(preset)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700"
              >
                + {preset.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={row.id || `level-${index}`}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm ring-1 ring-slate-900/[0.03] sm:p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Level {index + 1}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeRow(index)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <FiTrash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Name</label>
                  <input
                    value={row.name}
                    disabled={disabled}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                    placeholder="e.g. VIP"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.price}
                    disabled={disabled}
                    onChange={(e) => updateRow(index, { price: e.target.value })}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Description (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={row.description}
                    disabled={disabled}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
                    placeholder="What guests get with this ticket…"
                    className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && rows.length < MAX_LEVELS ? (
        <div className="flex flex-wrap gap-2">
          {TICKET_LEVEL_PRESETS.filter((p) => !rows.some((r) => r.name?.trim() === p.name)).map((preset) => (
            <button
              key={preset.name}
              type="button"
              disabled={disabled}
              onClick={() => addRow(preset)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white"
            >
              Quick add: {preset.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
