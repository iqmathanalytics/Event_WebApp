import { useCallback, useEffect } from "react";
import OrganizerInsightsPanel from "./OrganizerInsightsPanel";
import { fetchVendorBookings, fetchVendorInsights } from "../services/vendorShareService";

/**
 * Partner-link analytics — reuses the full Event performance analytics UI,
 * scoped to one vendor share / partner link.
 */
export default function VendorInsightsPanel({
  eventId,
  shareId = null,
  vendorCode = null,
  banner = null,
  onBack = null,
  onLoadingChange = null,
  hideLocalLoader = false
}) {
  void hideLocalLoader;

  const fetchInsights = useCallback(
    async (id, { hourlyDate } = {}) => {
      onLoadingChange?.(true);
      try {
        return await fetchVendorInsights(id, {
          shareId,
          vendorCode,
          hourlyDate
        });
      } finally {
        onLoadingChange?.(false);
      }
    },
    [shareId, vendorCode, onLoadingChange]
  );

  const fetchBookings = useCallback(
    async ({ eventId: id }) => {
      const res = await fetchVendorBookings(id, { shareId, vendorCode });
      return { data: Array.isArray(res?.data?.rows) ? res.data.rows : [] };
    },
    [shareId, vendorCode]
  );

  useEffect(() => {
    if (!eventId) {
      onLoadingChange?.(false);
    }
  }, [eventId, onLoadingChange]);

  if (!eventId) {
    return <p className="text-sm text-slate-500">Select a partner link to view analytics.</p>;
  }

  return (
    <OrganizerInsightsPanel
      fixedEventId={eventId}
      embedded={false}
      partnerMode
      fetchEventInsightsFn={fetchInsights}
      fetchBookingsFn={fetchBookings}
      allowBookingExport={false}
      sharedAccessBanner={banner}
      onBack={onBack}
      heroTitle="Partner link analytics"
      heroDescription="Same performance views as your event analytics — limited to traffic and bookings from this partner link."
    />
  );
}
