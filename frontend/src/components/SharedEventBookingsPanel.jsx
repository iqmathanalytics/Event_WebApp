import { useEffect, useRef, useState } from "react";
import { FiCalendar } from "react-icons/fi";
import { exportOrganizerBookings, fetchOrganizerBookings } from "../services/bookingService";
import { formatDateUS } from "../utils/format";
import { downloadBlob } from "../utils/fileDownload";
import AirbnbDatePickerPanel from "./AirbnbDatePickerPanel";
import FilterPopupField from "./FilterPopupField";
import OrganizerBookingsTable from "./OrganizerBookingsTable";

/**
 * Bookings for a single event (owner or shared viewer).
 * Embedded under Event performance → Bookings & revenue.
 */
export default function SharedEventBookingsPanel({
  eventId,
  embedded = false,
  allowResend = false,
  title = "Event bookings",
  subtitle = "Reservations for this event."
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [datePanelOpen, setDatePanelOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    setDateFilter("");
    setDatePanelOpen(false);
    setError("");
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setRows([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchOrganizerBookings({
          event_id: String(eventId),
          date: dateFilter || undefined
        });
        if (!cancelled) {
          setRows(response?.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setError(err?.response?.data?.message || "Could not load bookings for this event.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, dateFilter]);

  useEffect(() => {
    if (!datePanelOpen) {
      return undefined;
    }
    const onPointerDown = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setDatePanelOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [datePanelOpen]);

  const download = async (format) => {
    if (!eventId || exporting) {
      return;
    }
    try {
      setExporting(true);
      const result = await exportOrganizerBookings({
        event_id: String(eventId),
        date: dateFilter || undefined,
        format
      });
      downloadBlob(result.blob, `event-bookings.${format === "excel" ? "xlsx" : "csv"}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not download bookings.");
    } finally {
      setExporting(false);
    }
  };

  if (!eventId) {
    return null;
  }

  const shellClass = embedded
    ? "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-soft ring-1 ring-slate-900/[0.03]"
    : "rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5";

  return (
    <section className={shellClass}>
      <div className={embedded ? "border-b border-slate-100 px-4 py-4 sm:px-5" : ""}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className={`font-semibold text-slate-900 ${embedded ? "text-base font-bold tracking-tight" : "text-lg"}`}>
              {title}
            </h2>
            <p className={`mt-1 text-slate-500 ${embedded ? "text-sm leading-relaxed text-slate-600" : "text-sm"}`}>
              {subtitle}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={exporting || loading}
              onClick={() => void download("csv")}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download CSV
            </button>
            <button
              type="button"
              disabled={exporting || loading}
              onClick={() => void download("excel")}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download Excel
            </button>
          </div>
        </div>

        <div
          ref={filterRef}
          className="mt-3 grid grid-cols-1 gap-2 rounded-[1.75rem] border border-slate-200 bg-slate-50/50 p-2 sm:grid-cols-2 sm:max-w-md"
        >
          <FilterPopupField
            label="Date"
            value={dateFilter ? formatDateUS(dateFilter) : "Any Date"}
            isActive={datePanelOpen}
            onToggle={(e) => {
              e.stopPropagation();
              setDatePanelOpen((prev) => !prev);
            }}
            panelClassName="w-fit max-w-[calc(100vw-2rem)]"
            panelContent={
              <AirbnbDatePickerPanel
                value={dateFilter}
                onChange={(next) => setDateFilter(next || "")}
                closeOnSelect
                onClose={() => setDatePanelOpen(false)}
              />
            }
          />
          <button
            type="button"
            disabled={!dateFilter}
            onClick={() => setDateFilter("")}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <FiCalendar className="text-slate-400" />
            Clear date
          </button>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className={embedded ? "p-3 sm:p-4" : "mt-3"}>
        <OrganizerBookingsTable
          rows={rows}
          loading={loading}
          rowKeyPrefix={`event-${eventId}`}
          allowResend={allowResend}
          compactEventColumn
          readable
        />
      </div>
    </section>
  );
}
