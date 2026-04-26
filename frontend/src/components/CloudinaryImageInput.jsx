import { useId, useRef, useState } from "react";
import { uploadImageFile } from "../services/uploadService";

const btnClass =
  "inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";
const btnDisabled = "cursor-not-allowed opacity-60";

/**
 * Image file picker that uploads to the API (Cloudinary) and returns an HTTPS URL via onChange.
 */
export default function CloudinaryImageInput({ value, onChange, disabled, compact, className = "" }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const busy = Boolean(disabled || loading);

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }
    setError("");
    setLoading(true);
    try {
      const url = await uploadImageFile(file);
      onChange(url);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Upload failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <div className={`min-w-0 flex-1 space-y-1 ${className}`}>
        <div className="flex items-center gap-2">
          {value ? (
            <img src={value} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" />
          ) : null}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onPick}
            disabled={busy}
          />
          <label
            htmlFor={inputId}
            className={`${btnClass} min-w-0 flex-1 truncate px-2 py-2 text-center text-xs ${busy ? btnDisabled : ""}`}
          >
            {loading ? "Uploading…" : value ? "Replace" : "Upload"}
          </label>
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="shrink-0 rounded-xl border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          ) : null}
        </div>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {value ? (
        <div className="flex items-start gap-3">
          <img src={value} alt="" className="h-24 w-auto max-w-[140px] rounded-xl border border-slate-200 object-cover" />
        </div>
      ) : null}
      <input ref={inputRef} id={inputId} type="file" accept="image/*" className="sr-only" onChange={onPick} disabled={busy} />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className={`${btnClass} ${busy ? btnDisabled : ""}`}>
          {loading ? "Uploading…" : value ? "Replace image" : "Choose image"}
        </label>
        {value ? (
          <button type="button" onClick={() => onChange("")} className={`${btnClass} text-slate-600`}>
            Remove
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {value ? (
        <p className="truncate text-[11px] text-slate-500" title={value}>
          {value}
        </p>
      ) : null}
    </div>
  );
}
