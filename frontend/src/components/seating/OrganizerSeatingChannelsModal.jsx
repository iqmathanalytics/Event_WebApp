import { useCallback, useEffect, useState } from "react";
import { GitBranch, LayoutGrid } from "lucide-react";
import { SeatsioEventManager } from "@seatsio/seatsio-react";
import SeatingModalShell from "./SeatingModalShell";
import { fetchOrganizerSeatingDesigner } from "../../services/seatingService";

export default function OrganizerSeatingChannelsModal({
  open,
  onClose,
  eventId,
  eventTitle
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(null);

  const loadChannelsManager = useCallback(async () => {
    if (!eventId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrganizerSeatingDesigner(eventId);
      setConfig(data);
      if (!data?.event_key) {
        setError("Save the seating chart first, then manage channels.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not load channel manager.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (open && eventId) {
      loadChannelsManager();
    }
  }, [open, eventId, loadChannelsManager]);

  const footer = (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-xs text-slate-600">
        Manage private channels directly in Seats.io. Channel changes are saved by Seats.io for this event.
      </p>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          Close
        </button>
      </div>
    </div>
  );

  const canRenderManager = Boolean(config?.secret_key && config?.event_key && !error);

  return (
    <SeatingModalShell
      open={open}
      onClose={onClose}
      title={eventTitle ? `Channels - ${eventTitle}` : "Manage seating channels"}
      subtitle="Use the native Seats.io channel manager to create channels and assign seats."
      footer={footer}
      size="fullscreen"
    >
      <div className="flex h-full min-h-0 flex-col bg-slate-50">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Loading channel manager...
          </div>
        ) : null}
        {error ? (
          <div className="m-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        ) : null}
        {canRenderManager ? (
          <div className="min-h-0 flex-1 p-0.5 sm:p-1">
            <div className="h-full min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <SeatsioEventManager
                secretKey={config.secret_key}
                event={config.event_key}
                region={config.region || "na"}
                mode="manageChannels"
                manageChannelsList
                unavailableObjectsSelectable
                viewSettings={{
                  showSeatLabels: true
                }}
              />
            </div>
          </div>
        ) : null}
        {!loading && !config?.secret_key && !error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-600">
            <LayoutGrid className="h-8 w-8 text-slate-400" />
            <p>Seats.io is not configured. Add API keys to the server environment.</p>
          </div>
        ) : null}
        {!loading && config?.secret_key && !config?.event_key && !error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-600">
            <GitBranch className="h-8 w-8 text-slate-400" />
            <p>Save the seating chart first, then open the channel manager.</p>
          </div>
        ) : null}
      </div>
    </SeatingModalShell>
  );
}
