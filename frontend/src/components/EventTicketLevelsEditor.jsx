import { FiPlus, FiTrash2 } from "react-icons/fi";
import { MAX_LEVELS, newTicketLevelId, TICKET_LEVEL_PRESETS } from "../utils/eventTicketLevels";
import { TIER_PALETTE_OPTIONS, normalizeTierColorKey, normalizeTierHex } from "../utils/ticketLevelPalettes";

function emptyLevel(sortOrder = 0) {
  return {
    id: newTicketLevelId(),
    name: "",
    description: "",
    price: "",
    seats: "",
    valid_upto: "",
    sort_order: sortOrder,
    color_key: "",
    color: ""
  };
}

function colorSelection(row) {
  const key = normalizeTierColorKey(row?.color_key);
  const hex = normalizeTierHex(row?.color);
  if (key === "custom" || (!key && hex)) {
    return { key: "custom", hex: hex || "#E31C5F" };
  }
  return { key: key || "", hex: hex || "" };
}

export default function EventTicketLevelsEditor({
  levels,
  onChange,
  tiersSort = "price_asc",
  onTiersSortChange,
  disabled = false
}) {
  const rows = Array.isArray(levels) ? levels : [];
  const sortMode = tiersSort === "price_desc" ? "price_desc" : "price_asc";

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
          seats: "",
          valid_upto: "",
          sort_order: sortOrder,
          color_key: "",
          color: ""
        }
      ]);
      return;
    }
    onChange([...rows, emptyLevel(sortOrder)]);
  };

  const setPalette = (index, key) => {
    if (!key) {
      updateRow(index, { color_key: "", color: "" });
      return;
    }
    if (key === "custom") {
      const current = normalizeTierHex(rows[index]?.color) || "#E31C5F";
      updateRow(index, { color_key: "custom", color: current });
      return;
    }
    const option = TIER_PALETTE_OPTIONS.find((item) => item.key === key);
    updateRow(index, {
      color_key: key,
      color: typeof option?.swatch === "string" && option.swatch.startsWith("#") ? option.swatch : ""
    });
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Ticket levels</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Add tiers with price, optional seat cap per level, and optional sale end date. Choose a cart color for
            each tier — or pick a custom color. Expired levels are hidden from buyers automatically.
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

      {typeof onTiersSortChange === "function" ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 sm:px-4">
          <p className="text-xs font-semibold text-slate-900">Show ticket tiers by price</p>
          <p className="mt-0.5 text-[11px] text-slate-600">
            Controls the order buyers see on the event page and checkout (not the order you edit below).
          </p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 transition ${
                sortMode === "price_asc"
                  ? "border-slate-900 bg-white ring-1 ring-slate-900/10"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="ticket_tiers_sort"
                value="price_asc"
                checked={sortMode === "price_asc"}
                disabled={disabled}
                onChange={() => onTiersSortChange("price_asc")}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">Price: low to high</span>
                <span className="block text-xs text-slate-500">Cheapest tier first.</span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 transition ${
                sortMode === "price_desc"
                  ? "border-slate-900 bg-white ring-1 ring-slate-900/10"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="ticket_tiers_sort"
                value="price_desc"
                checked={sortMode === "price_desc"}
                disabled={disabled}
                onChange={() => onTiersSortChange("price_desc")}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">Price: high to low</span>
                <span className="block text-xs text-slate-500">Most expensive tier first.</span>
              </span>
            </label>
          </div>
        </div>
      ) : null}

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
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Seats for this level <span className="font-normal normal-case text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={row.seats}
                    disabled={disabled}
                    onChange={(e) => updateRow(index, { seats: e.target.value })}
                    placeholder="Unlimited if empty"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Valid up to <span className="font-normal normal-case text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={row.valid_upto || ""}
                    disabled={disabled}
                    onChange={(e) => updateRow(index, { valid_upto: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Hidden from buyers after this date.</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Cart color
                  </label>
                  <p className="mt-0.5 text-[10px] text-slate-500">Shown on the ticket cart. Auto matches the tier name.</p>
                  {(() => {
                    const selected = colorSelection(row);
                    return (
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {TIER_PALETTE_OPTIONS.map((option) => {
                            const active = selected.key === option.key;
                            return (
                              <button
                                key={option.key || "auto"}
                                type="button"
                                disabled={disabled}
                                title={option.label}
                                onClick={() => setPalette(index, option.key)}
                                className={`flex h-8 items-center gap-1.5 rounded-full border px-2 text-[10px] font-semibold transition ${
                                  active
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                                }`}
                              >
                                <span
                                  className="h-3.5 w-3.5 rounded-full border border-white/70 shadow-sm"
                                  style={{ background: option.swatch }}
                                  aria-hidden
                                />
                                {option.label}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => setPalette(index, "custom")}
                            className={`flex h-8 items-center gap-1.5 rounded-full border px-2 text-[10px] font-semibold transition ${
                              selected.key === "custom"
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-white/70 shadow-sm"
                              style={{ background: selected.key === "custom" ? selected.hex : "#E31C5F" }}
                              aria-hidden
                            />
                            Custom
                          </button>
                        </div>
                        {selected.key === "custom" ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="color"
                              value={selected.hex}
                              disabled={disabled}
                              onChange={(e) =>
                                updateRow(index, {
                                  color_key: "custom",
                                  color: normalizeTierHex(e.target.value) || "#E31C5F"
                                })
                              }
                              className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                              aria-label={`Custom color for ${row.name || `level ${index + 1}`}`}
                            />
                            <input
                              value={selected.hex}
                              disabled={disabled}
                              maxLength={7}
                              onChange={(e) => {
                                const next = e.target.value.toUpperCase();
                                updateRow(index, { color_key: "custom", color: next });
                              }}
                              placeholder="#E31C5F"
                              className="w-28 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase"
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
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
