import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket } from "lucide-react";
import {
  confirmBookingPayment,
  confirmGuestBookingPayment,
  createBookingCheckout,
  createBookingPaymentIntent,
  createGuestBookingCheckout,
  createGuestBookingPaymentIntent
} from "../services/bookingService";
import { confirmBookingPaymentWithRetry } from "../utils/confirmBookingPaymentWithRetry";
import { profileMobileOrEmpty } from "../utils/phone";
const StripePaymentModal = lazy(() => import("./StripePaymentModal"));
import StripePaymentReturnRelay from "./StripePaymentReturnRelay";
import {
  buildStripeReturnUrl,
  clearPendingStripePayment,
  clearStripeReturnParams,
  parseStripeReturnParams,
  savePendingStripePayment,
  STRIPE_PAYMENT_MESSAGE
} from "../utils/stripePaymentReturn";
import {
  releaseEventCouponHold,
  releaseGuestEventCouponHold,
  resumeEventCouponHold,
  resumeGuestEventCouponHold,
  validateEventCoupon,
  validateGuestEventCoupon
} from "../services/couponService";
import useAuth from "../hooks/useAuth";
import { formatCurrency, formatDateUS, formatTime12Hour } from "../utils/format";
import {
  formatBookingContactName,
  splitFullName,
  validateBookingContactNames
} from "../utils/bookingContact";
import { getEventAvailableDates, normalizeDateList } from "../utils/eventSchedule";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from "../constants/brand";
import { BOOKING_CONFIRMED_STORAGE_KEY } from "../pages/BookingConfirmedPage";
import EventTicketCart from "./EventTicketCart";
import { trackBookingCompleteTiers } from "../utils/googleAnalytics";
import { maxTicketsForBooking } from "../utils/eventSeats";

/** Seat availability UI hidden until re-enabled. */
const SHOW_SEAT_AVAILABILITY_UI = false;
import {
  buildTicketItemsPayload,
  cartFromItems,
  cartTicketCount,
  computeCartSubtotal,
  createEmptyCart,
  getCheckoutTicketLevels
} from "../utils/eventTicketLevels";
import {
  clearEventCheckoutDraft,
  datesKey,
  formatHoldCountdown,
  loadEventCheckoutDraft,
  normalizeCouponHoldPayload,
  parseExpiresMs,
  saveEventCheckoutDraft
} from "../utils/eventCheckoutDraft";
import { applyCheckoutFees, toBoolFlag } from "../utils/transactionFee";
import GuestSeatSelectionModal from "./seating/GuestSeatSelectionModal";
import { releaseSeatsioHold } from "../services/seatingService";
import { isReservedSeating } from "../utils/seatingMode";
import {
  SEATSIO_HOLD_MINUTES,
  buildCartFromSelectedSeats,
  buildTicketItemsFromSelectedSeats,
  groupSelectedSeatsForDisplay,
  seatHoldExpiresAtFromNow
} from "../utils/seatSelection";

function toggleDateInList(list, date) {
  const set = new Set(list);
  if (set.has(date)) {
    set.delete(date);
  } else {
    set.add(date);
  }
  return normalizeDateList(Array.from(set));
}

const STRIPE_MIN_USD = 0.5;

function requiresCardPayment(totalAmount) {
  return Number(totalAmount) >= STRIPE_MIN_USD;
}

function formatCheckoutCurrency(value) {
  return formatCurrency(value, { decimals: 2 });
}

function buildBookingConfirmationPayload({
  data,
  event,
  email,
  totalAmount,
  subtotalAmount,
  discountAmount,
  couponCode,
  totalDays,
  selectedDates,
  paidWithCard,
  attendeeCount
}) {
  return {
    bookingId: data?.bookingId,
    checkInCode: data?.checkInCode || "",
    email: String(email || data?.email || "").trim(),
    totalAmount: data?.totalAmount ?? totalAmount,
    subtotalAmount: data?.subtotalAmount ?? subtotalAmount,
    discountAmount: data?.discountAmount ?? discountAmount,
    couponCode: data?.couponCode || couponCode,
    totalDays: data?.totalDays ?? totalDays,
    selectedDates: data?.selectedDates || selectedDates,
    paidWithCard,
    attendeeCount,
    event: {
      id: event?.id ?? null,
      title: event?.title || "",
      image_url: event?.image_url || "",
      venue: event?.venue || "",
      public_slug: event?.public_slug || ""
    }
  };
}

function buildBookingPayload({
  eventId,
  levels,
  ticketCart,
  selectedDates,
  firstName,
  lastName,
  email,
  phone,
  couponHold,
  vendorCode = "",
  reservedSeating = false,
  seatsioHoldToken = "",
  selectedSeats = [],
  chartCategoryKeys = [],
  chartPricing = []
}) {
  const sortedDates = normalizeDateList(selectedDates);
  const first = String(firstName || "").trim();
  const last = String(lastName || "").trim();
  const name = formatBookingContactName({ firstName: first, lastName: last });
  const vendor_code = String(vendorCode || "").trim().toUpperCase() || undefined;

  if (reservedSeating && selectedSeats.length) {
    return {
      event_id: Number(eventId),
      attendee_count: selectedSeats.length,
      ticket_items: buildTicketItemsFromSelectedSeats(
        selectedSeats,
        levels,
        chartCategoryKeys,
        chartPricing
      ),
      selected_dates: sortedDates,
      booking_date: sortedDates[0],
      first_name: first || undefined,
      last_name: last || undefined,
      name: name || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      coupon_hold_token: couponHold?.holdToken || undefined,
      vendor_code,
      seatsio_hold_token: seatsioHoldToken || undefined,
      selected_seats: selectedSeats
    };
  }

  const ticket_items = buildTicketItemsPayload(levels, ticketCart);
  const attendee_count = cartTicketCount(ticketCart);
  return {
    event_id: Number(eventId),
    attendee_count,
    ticket_items,
    selected_dates: sortedDates,
    booking_date: sortedDates[0],
    first_name: first || undefined,
    last_name: last || undefined,
    name: name || undefined,
    email: email.trim() || undefined,
    phone: phone.trim() || undefined,
    coupon_hold_token: couponHold?.holdToken || undefined,
    vendor_code
  };
}

const COUPON_HOLD_MINUTES = 5;
const COUPON_HOLD_MESSAGE = `Coupon applied. Complete your booking within ${COUPON_HOLD_MINUTES} minutes to keep this rate.`;

/**
 * Order pricing particulars — render only after the guest has selected seats or ticket quantities.
 */
function OrderPriceSummary({
  subtotal,
  discount,
  serviceFee = 0,
  platformFee = 0,
  total,
  ticketCount = 0,
  showDays = 0,
  couponCode = "",
  seatGroups = null,
  holdCountdown = "",
  onClearSeats = null,
  className = ""
}) {
  const showServiceFee = Number(serviceFee) > 0;
  const showPlatformFee = Number(platformFee) > 0;
  const showDiscount = Number(discount) > 0;
  const hasSeatDetails = Array.isArray(seatGroups) && seatGroups.length > 0;
  const particulars = [];
  if (ticketCount > 0) {
    particulars.push(
      hasSeatDetails
        ? `${ticketCount} seat${ticketCount === 1 ? "" : "s"}`
        : `${ticketCount} ticket${ticketCount === 1 ? "" : "s"}`
    );
  }
  if (showDays > 0) {
    particulars.push(`${showDays} show day${showDays === 1 ? "" : "s"}`);
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-amber-50/40 shadow-sm ring-1 ring-slate-900/[0.03] ${className}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Order summary</p>
          {particulars.length ? (
            <p className="mt-0.5 text-xs font-medium text-slate-600">{particulars.join(" · ")}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-xl font-bold tabular-nums tracking-tight text-slate-900">
            {formatCheckoutCurrency(total)}
          </p>
          {typeof onClearSeats === "function" ? (
            <button
              type="button"
              onClick={onClearSeats}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Clear seats
            </button>
          ) : null}
        </div>
      </div>

      {hasSeatDetails ? (
        <div className="space-y-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <ul className="space-y-2">
            {seatGroups.map((group) => (
              <li key={group.levelId} className="text-xs leading-relaxed text-slate-700">
                <span className="font-semibold text-slate-900">
                  {group.levelName}
                  <span className="font-medium text-slate-500"> × {group.seatLabels.length}</span>
                </span>
                <span className="mt-0.5 block text-slate-600">{group.seatLabels.join(", ")}</span>
              </li>
            ))}
          </ul>
          {holdCountdown ? (
            <p className="text-[11px] font-semibold text-amber-800">
              Reserved for {holdCountdown}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">
              Seats stay reserved for about {SEATSIO_HOLD_MINUTES} minutes while you finish checkout.
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-2 px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <span>Subtotal</span>
          <span className="font-semibold tabular-nums text-slate-800">{formatCheckoutCurrency(subtotal)}</span>
        </div>
        {showDiscount ? (
          <div className="flex items-center justify-between gap-3 text-emerald-700">
            <span>
              Discount{couponCode ? ` (${couponCode})` : ""}
            </span>
            <span className="font-semibold tabular-nums">−{formatCheckoutCurrency(discount)}</span>
          </div>
        ) : null}
        {showServiceFee ? (
          <div className="flex items-center justify-between gap-3 text-slate-600">
            <span>Service fee</span>
            <span className="font-semibold tabular-nums text-slate-800">{formatCheckoutCurrency(serviceFee)}</span>
          </div>
        ) : null}
        {showPlatformFee ? (
          <div className="flex items-center justify-between gap-3 text-slate-600">
            <span>Platform fee</span>
            <span className="font-semibold tabular-nums text-slate-800">{formatCheckoutCurrency(platformFee)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5">
          <span className="text-sm font-semibold text-slate-900">Total</span>
          <span className="text-base font-bold tabular-nums text-slate-900">{formatCheckoutCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

function CheckoutCard({ children, pill = `${BRAND_NAME} · your city's event guide`, seatBar = null }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_6px_20px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/[0.04]">
      {seatBar}
      <div className="p-5 sm:p-6">
      <div className="-mt-1 mb-4 flex justify-center sm:-mt-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
          <Ticket className="shrink-0 text-rose-500" size={14} strokeWidth={2} aria-hidden />
          {pill}
        </div>
      </div>
      {children}
      </div>
    </div>
  );
}

export default function EventTicketCheckoutPanel({ event, guestMode = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? user?.userId;
  const [email, setEmail] = useState("");
  const guestCheckoutKey = useMemo(() => {
    if (!guestMode) {
      return userId;
    }
    const normalized = String(email || "").trim().toLowerCase();
    return normalized ? `guest:${normalized}` : "guest";
  }, [guestMode, userId, email]);
  const checkoutUserId = guestMode ? guestCheckoutKey : userId;
  const eventId = event?.id;
  const reservedSeating = isReservedSeating(event);
  const availableDates = useMemo(() => getEventAvailableDates(event), [event]);
  const scheduleType = event?.schedule_type || "single";

  const [selectedDates, setSelectedDates] = useState([]);
  const ticketLevels = useMemo(() => getCheckoutTicketLevels(event), [event]);
  const [ticketCart, setTicketCart] = useState(() => createEmptyCart(getCheckoutTicketLevels(event)));
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [seatsioHoldToken, setSeatsioHoldToken] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatHoldExpiresAt, setSeatHoldExpiresAt] = useState(null);
  const [seatHoldCountdown, setSeatHoldCountdown] = useState("");
  const [seatingEventKey, setSeatingEventKey] = useState("");
  const [chartCategoryKeys, setChartCategoryKeys] = useState([]);
  const [chartPricing, setChartPricing] = useState([]);
  const attendeeCount = useMemo(() => {
    if (reservedSeating) {
      return selectedSeats.length;
    }
    return cartTicketCount(ticketCart);
  }, [reservedSeating, selectedSeats.length, ticketCart]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [vendorCodeInput, setVendorCodeInput] = useState("");
  const [couponHold, setCouponHold] = useState(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [holdCountdown, setHoldCountdown] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState("");
  const [paymentPublishableKey, setPaymentPublishableKey] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [checkoutReady, setCheckoutReady] = useState(false);
  const restoredFromDraftRef = useRef(false);
  const skipHoldClearRef = useRef(0);
  const resumeAttemptedRef = useRef(false);
  const guestCouponEmailRef = useRef("");
  const paymentReturnHandledRef = useRef(false);
  const [completingPaymentReturn, setCompletingPaymentReturn] = useState(false);
  const [popupReturnRelay, setPopupReturnRelay] = useState(null);

  const buildHoldState = useCallback((data, snapshot) => {
    const normalized = normalizeCouponHoldPayload(data);
    if (!normalized) {
      return null;
    }
    return {
      ...normalized,
      _draftSnapshot: snapshot
    };
  }, []);

  useLayoutEffect(() => {
    const stripeReturn = parseStripeReturnParams();
    if (
      stripeReturn.paymentIntentId &&
      typeof window !== "undefined" &&
      window.opener &&
      !window.opener.closed
    ) {
      setPopupReturnRelay({
        paymentIntentId: stripeReturn.paymentIntentId,
        redirectStatus: stripeReturn.redirectStatus
      });
      setCheckoutReady(true);
      return;
    }
    setPopupReturnRelay(null);

    restoredFromDraftRef.current = false;
    resumeAttemptedRef.current = false;
    setCheckoutReady(false);

    const dates = getEventAvailableDates(event);
    if (!dates.length || !eventId || !checkoutUserId) {
      setCheckoutReady(true);
      return;
    }

    const draft = loadEventCheckoutDraft(eventId, checkoutUserId);
    if (!draft) {
      if (scheduleType === "single") {
        setSelectedDates([dates[0]]);
      } else {
        setSelectedDates([dates[0]]);
      }
      setCheckoutReady(true);
      return;
    }

    restoredFromDraftRef.current = true;
    const restoredDates = normalizeDateList(draft.selectedDates || []).filter((d) => dates.includes(d));
    const datesForCart = restoredDates.length ? restoredDates : normalizeDateList([dates[0]]);
    const cap = maxTicketsForBooking(event);
    const levelsForDraft = getCheckoutTicketLevels(event);
    let cart = cartFromItems(levelsForDraft, draft.ticketItems);
    const draftGuests = cartTicketCount(cart);
    if (isReservedSeating(event)) {
      cart = createEmptyCart(levelsForDraft);
    } else if (draftGuests < 1) {
      const legacyGuests = Math.min(cap > 0 ? cap : 50, Math.max(1, Number(draft.attendeeCount) || 1));
      cart = { ...createEmptyCart(levelsForDraft) };
      if (levelsForDraft[0]) {
        cart[levelsForDraft[0].id] = legacyGuests;
      }
    }

    setSelectedDates(datesForCart);
    setTicketCart(cart);
    if (draft.firstName) {
      setFirstName(String(draft.firstName));
    } else if (draft.name) {
      const split = splitFullName(draft.name);
      setFirstName(split.firstName);
      setLastName(split.lastName);
    }
    if (draft.lastName) {
      setLastName(String(draft.lastName));
    }
    if (draft.email) {
      setEmail(String(draft.email));
    }
    if (draft.phone) {
      setPhone(String(draft.phone));
    }
    if (draft.couponCodeInput) {
      setCouponCodeInput(String(draft.couponCodeInput));
    }
    if (draft.vendorCodeInput) {
      setVendorCodeInput(String(draft.vendorCodeInput));
    }
    const returningFromStripe =
      stripeReturn.isPaymentReturn && stripeReturn.paymentIntentId && stripeReturn.redirectStatus;
    if (draft.step === "confirm" && !returningFromStripe) {
      setStep("confirm");
    }

    const snapshot = draft.holdSnapshot || {
      datesKey: datesKey(datesForCart),
      attendeeCount: cartTicketCount(cart),
      cartKey: JSON.stringify(cart)
    };

    if (draft.couponHold?.holdToken) {
      // Legacy vendor discount holds are no longer valid — keep the typed vendor code only.
      if (draft.couponHold.holdKind === "vendor") {
        if (draft.couponHold.couponCode && !draft.vendorCodeInput) {
          setVendorCodeInput(String(draft.couponHold.couponCode));
        }
      } else {
        skipHoldClearRef.current = 2;
        const hold = buildHoldState(draft.couponHold, snapshot) || {
          ...draft.couponHold,
          _draftSnapshot: snapshot
        };
        setCouponHold(hold);
        setCouponMessage(draft.couponMessage || hold.message || COUPON_HOLD_MESSAGE);
      }
    }

    if (isReservedSeating(event) && draft.seatHold?.holdToken && draft.seatHold?.selectedSeats?.length) {
      const expiresMs =
        typeof draft.seatHold.expiresAt === "number"
          ? draft.seatHold.expiresAt
          : parseExpiresMs(draft.seatHold.expiresAt);
      if (expiresMs && expiresMs > Date.now()) {
        setSeatsioHoldToken(String(draft.seatHold.holdToken));
        setSeatingEventKey(String(draft.seatHold.eventKey || ""));
        setSelectedSeats(draft.seatHold.selectedSeats);
        setChartCategoryKeys(
          Array.isArray(draft.seatHold.chartCategoryKeys) ? draft.seatHold.chartCategoryKeys : []
        );
        setChartPricing(Array.isArray(draft.seatHold.chartPricing) ? draft.seatHold.chartPricing : []);
        setSeatHoldExpiresAt(expiresMs);
      }
    }

    setCheckoutReady(true);
  }, [eventId, checkoutUserId, event, scheduleType, buildHoldState]);

  useEffect(() => {
    const dates = getEventAvailableDates(event);
    if (!dates.length || restoredFromDraftRef.current || !eventId || !checkoutUserId) {
      return;
    }
    if (scheduleType === "single") {
      setSelectedDates([dates[0]]);
    } else {
      setSelectedDates([dates[0]]);
    }
  }, [event, scheduleType, eventId, checkoutUserId]);

  useEffect(() => {
    if (guestMode) {
      return;
    }
    const split = splitFullName(user?.name);
    setFirstName(split.firstName);
    setLastName(split.lastName);
    setEmail(String(user?.email || "").trim());
    setPhone(profileMobileOrEmpty(user?.mobile_number));
  }, [user, guestMode]);

  useEffect(() => {
    if (reservedSeating) {
      setTicketCart(
        selectedSeats.length
          ? buildCartFromSelectedSeats(selectedSeats, ticketLevels, chartCategoryKeys, chartPricing)
          : createEmptyCart(ticketLevels)
      );
    }
  }, [reservedSeating, selectedSeats, ticketLevels, chartCategoryKeys, chartPricing]);

  const checkoutCart = useMemo(() => {
    if (reservedSeating) {
      return selectedSeats.length
        ? buildCartFromSelectedSeats(selectedSeats, ticketLevels, chartCategoryKeys, chartPricing)
        : createEmptyCart(ticketLevels);
    }
    return ticketCart;
  }, [reservedSeating, selectedSeats, ticketLevels, chartCategoryKeys, chartPricing, ticketCart]);

  useEffect(() => {
    if (
      !checkoutReady ||
      !restoredFromDraftRef.current ||
      !couponHold?.holdToken ||
      !eventId ||
      !checkoutUserId ||
      (guestMode && guestCheckoutKey === "guest") ||
      resumeAttemptedRef.current
    ) {
      return;
    }
    resumeAttemptedRef.current = true;
    const token = couponHold.holdToken;
    const snapshot = couponHold._draftSnapshot;

    void (async () => {
      try {
        const resumePayload = {
          event_id: Number(eventId),
          hold_token: token,
          ticket_items: buildTicketItemsPayload(ticketLevels, checkoutCart)
        };
        const res = guestMode
          ? await resumeGuestEventCouponHold({
              ...resumePayload,
              email: email.trim()
            })
          : await resumeEventCouponHold(resumePayload);
        const data = res?.data || res;
        const hold = buildHoldState(data, snapshot);
        if (!hold) {
          return;
        }
        skipHoldClearRef.current = 2;
        setCouponHold(hold);
        const code = data.couponCode || data.coupon_code;
        if (code) {
          if (hold.holdKind === "vendor") {
            setVendorCodeInput(String(code));
            setCouponCodeInput("");
          } else {
            setCouponCodeInput(String(code));
            setVendorCodeInput("");
          }
        }
        setCouponMessage(hold.message || COUPON_HOLD_MESSAGE);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Could not refresh your coupon hold. You can try Apply again or complete booking soon."
        );
      }
    })();
  }, [checkoutReady, couponHold?.holdToken, eventId, checkoutUserId, guestMode, guestCheckoutKey, email, buildHoldState, ticketLevels, checkoutCart]);

  const clearSeatHold = useCallback(
    async ({ expired = false } = {}) => {
      const token = seatsioHoldToken;
      const labels = selectedSeats.map((seat) => seat.label).filter(Boolean);
      const eventKey = seatingEventKey;
      if (token && eventKey && labels.length) {
        try {
          await releaseSeatsioHold(eventId, { eventKey, holdToken: token, labels });
        } catch (_err) {
          /* seats.io may already have released the hold */
        }
      }
      setSeatsioHoldToken("");
      setSelectedSeats([]);
      setSeatHoldExpiresAt(null);
      setSeatHoldCountdown("");
      setChartCategoryKeys([]);
      setChartPricing([]);
      setTicketCart(createEmptyCart(ticketLevels));
      if (expired) {
        setError(`Your seat hold expired after ${SEATSIO_HOLD_MINUTES} minutes. Please select seats again.`);
      }
    },
    [
      seatsioHoldToken,
      selectedSeats,
      seatingEventKey,
      eventId,
      ticketLevels
    ]
  );

  useEffect(() => {
    if (!seatHoldExpiresAt || !seatsioHoldToken) {
      setSeatHoldCountdown("");
      return undefined;
    }
    let expiredHandled = false;
    const tick = () => {
      const ms = seatHoldExpiresAt - Date.now();
      if (ms <= 0) {
        if (!expiredHandled) {
          expiredHandled = true;
          setSeatHoldCountdown("");
          void clearSeatHold({ expired: true });
        }
        return;
      }
      setSeatHoldCountdown(formatHoldCountdown(ms));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [seatHoldExpiresAt, seatsioHoldToken, clearSeatHold]);

  const openSeatSelectionModal = () => {
    setError("");
    setSeatModalOpen(true);
  };

  const contactName = useMemo(
    () => formatBookingContactName({ firstName, lastName }),
    [firstName, lastName]
  );

  const maxTickets = useMemo(
    () => (SHOW_SEAT_AVAILABILITY_UI ? maxTicketsForBooking(event) : 50),
    [event]
  );
  const seatBar = null;

  const totalDays = selectedDates.length;
  const awaitingSeatSelection = reservedSeating && !selectedSeats.length;
  const subtotalAmount = awaitingSeatSelection
    ? 0
    : computeCartSubtotal(ticketLevels, checkoutCart, totalDays);
  const discountAmount = couponHold ? Number(couponHold.discount || 0) : 0;
  const {
    serviceFeeAmount,
    platformFeeAmount,
    totalAmount
  } = applyCheckoutFees({
    subtotalAmount,
    discountAmount,
    event
  });
  const couponsEnabled = toBoolFlag(event?.coupon_codes_enabled, true);
  const checkoutCouponsAvailable = toBoolFlag(event?.checkout_coupons_available, false);
  const showCouponCheckout = (couponsEnabled || checkoutCouponsAvailable) && attendeeCount > 0;
  const vendorCodeEnabled = toBoolFlag(event?.vendor_code_enabled, false);
  const isCouponHoldApplied = Boolean(couponHold?.holdToken);

  const sortedSelected = useMemo(() => normalizeDateList(selectedDates), [selectedDates]);
  const reservedSeatGroups = useMemo(
    () => groupSelectedSeatsForDisplay(selectedSeats, ticketLevels, chartCategoryKeys, chartPricing),
    [selectedSeats, ticketLevels, chartCategoryKeys, chartPricing]
  );

  const gridLeftTitle = scheduleType === "single" ? "Date" : "Starts";
  const gridRightTitle = scheduleType === "single" ? "Time" : "Ends";
  const gridLeftValue = useMemo(() => {
    if (scheduleType === "single" && availableDates[0]) {
      return formatDateUS(availableDates[0]);
    }
    if (!sortedSelected.length) {
      return "—";
    }
    return formatDateUS(sortedSelected[0]);
  }, [scheduleType, availableDates, sortedSelected]);

  const gridRightValue = useMemo(() => {
    if (scheduleType === "single") {
      return formatTime12Hour(event?.event_time);
    }
    if (sortedSelected.length > 1) {
      return formatDateUS(sortedSelected[sortedSelected.length - 1]);
    }
    return "Pick another show date";
  }, [scheduleType, event?.event_time, sortedSelected]);

  const needsCardPayment = useMemo(() => requiresCardPayment(totalAmount), [totalAmount]);
  const showOrderPriceSummary = !awaitingSeatSelection && attendeeCount > 0;

  const clearCouponHold = useCallback(
    async (opts = {}) => {
      const token = opts.holdToken ?? couponHold?.holdToken;
      setCouponHold(null);
      setCouponMessage("");
      setHoldCountdown("");
      if (!opts.skipApi && token && eventId) {
        try {
          if (guestMode) {
            const guestEmail = String(email || "").trim();
            if (!guestEmail) {
              return;
            }
            await releaseGuestEventCouponHold({
              event_id: Number(eventId),
              hold_token: token,
              email: guestEmail
            });
          } else if (userId) {
            await releaseEventCouponHold({
              event_id: Number(eventId),
              hold_token: token
            });
          }
        } catch {
          /* hold may already be released or expired */
        }
      }
    },
    [couponHold?.holdToken, eventId, userId, guestMode, email]
  );

  const persistDraft = useCallback(
    (overrides = {}) => {
      if (!eventId || !checkoutUserId) {
        return;
      }
      const dates = normalizeDateList(overrides.selectedDates || selectedDates);
      const cart = overrides.ticketCart ?? ticketCart;
      const guests = cartTicketCount(cart);
      const hold = overrides.couponHold !== undefined ? overrides.couponHold : couponHold;
      const holdForStorage = hold
        ? (({ _draftSnapshot: _s, ...rest }) => rest)(hold)
        : null;
      const seatHoldForStorage =
        reservedSeating && selectedSeats.length && seatsioHoldToken
          ? {
              holdToken: seatsioHoldToken,
              eventKey: seatingEventKey,
              expiresAt: seatHoldExpiresAt,
              selectedSeats,
              chartCategoryKeys,
              chartPricing
            }
          : null;
      saveEventCheckoutDraft({
        eventId: Number(eventId),
        userId: checkoutUserId,
        selectedDates: dates,
        attendeeCount: guests,
        ticketItems: buildTicketItemsPayload(ticketLevels, cart),
        ticketCart: cart,
        firstName: overrides.firstName ?? firstName,
        lastName: overrides.lastName ?? lastName,
        name: overrides.name ?? contactName,
        email: overrides.email ?? email,
        phone: overrides.phone ?? phone,
        step: overrides.step ?? step,
        couponCodeInput: overrides.couponCodeInput ?? couponCodeInput,
        vendorCodeInput: overrides.vendorCodeInput ?? vendorCodeInput,
        couponMessage: overrides.couponMessage ?? couponMessage,
        couponHold: holdForStorage,
        seatHold: overrides.seatHold !== undefined ? overrides.seatHold : seatHoldForStorage,
        holdSnapshot: hold
          ? hold._draftSnapshot || {
              datesKey: datesKey(dates),
              attendeeCount: guests,
              cartKey: JSON.stringify(cart)
            }
          : null
      });
    },
    [
      ticketCart,
      ticketLevels,
      couponCodeInput,
      vendorCodeInput,
      couponHold,
      couponMessage,
      email,
      eventId,
      firstName,
      lastName,
      contactName,
      phone,
      selectedDates,
      step,
      checkoutUserId,
      reservedSeating,
      selectedSeats,
      seatsioHoldToken,
      seatingEventKey,
      seatHoldExpiresAt,
      chartCategoryKeys,
      chartPricing
    ]
  );

  useEffect(() => {
    if (!checkoutReady || !eventId || !checkoutUserId) {
      return;
    }
    persistDraft();
  }, [checkoutReady, eventId, checkoutUserId, persistDraft]);

  useEffect(() => {
    if (skipHoldClearRef.current > 0) {
      skipHoldClearRef.current -= 1;
      return;
    }
    if (!couponHold) {
      return;
    }
    const snap = couponHold._draftSnapshot;
    if (snap) {
      const currentKey = datesKey(selectedDates);
      const cartKey = JSON.stringify(ticketCart);
      if (snap.datesKey === currentKey && Number(snap.attendeeCount) === Number(attendeeCount)) {
        if (!snap.cartKey || snap.cartKey === cartKey) {
          return;
        }
      }
    }
    void clearCouponHold();
  }, [selectedDates, attendeeCount, ticketCart, clearCouponHold, couponHold]);

  useEffect(() => {
    const expiresAt = couponHold?.expiresAt;
    const holdToken = couponHold?.holdToken;
    if (!expiresAt || !holdToken) {
      setHoldCountdown("");
      return undefined;
    }
    let expiredHandled = false;
    const tick = () => {
      const ms = parseExpiresMs(expiresAt) - Date.now();
      if (ms <= 0) {
        if (!expiredHandled) {
          expiredHandled = true;
          setHoldCountdown("");
          void clearCouponHold({ holdToken }).then(() => {
            setError("Coupon hold expired. Apply the code again if you still want the discount.");
          });
        }
        return;
      }
      setHoldCountdown(formatHoldCountdown(ms));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [couponHold?.expiresAt, couponHold?.holdToken, clearCouponHold]);

  useEffect(() => {
    if (!guestMode || !couponHold?.holdToken) {
      return;
    }
    const normalized = String(email || "").trim().toLowerCase();
    if (
      guestCouponEmailRef.current &&
      normalized &&
      normalized !== guestCouponEmailRef.current
    ) {
      guestCouponEmailRef.current = "";
      void clearCouponHold();
    }
  }, [email, guestMode, couponHold?.holdToken, clearCouponHold]);

  const applyPromoCode = async (rawCode) => {
    if (!couponsEnabled && !checkoutCouponsAvailable) {
      setError("Coupon codes are not available for this event.");
      return;
    }
    setError("");
    setCouponMessage("");
    const emailTrim = email.trim();
    if (guestMode) {
      if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        setError("Enter your email above before applying a coupon.");
        return;
      }
    } else if (!userId) {
      setError("Sign in to apply a coupon code.");
      return;
    }
    const msg = validateForm();
    if (msg) {
      setError(msg);
      return;
    }
    const code = String(rawCode || "").trim();
    if (!code) {
      setError("Enter a coupon code.");
      return;
    }
    if (subtotalAmount <= 0) {
      setError("Codes cannot be applied to free bookings.");
      return;
    }
    try {
      setCouponApplying(true);
      const couponPayload = {
        event_id: Number(eventId),
        coupon_code: code,
        attendee_count: attendeeCount,
        ticket_items: buildTicketItemsPayload(ticketLevels, checkoutCart),
        selected_dates: normalizeDateList(selectedDates),
        hold_token: couponHold?.holdToken || undefined
      };
      const res = guestMode
        ? await validateGuestEventCoupon({ ...couponPayload, email: emailTrim })
        : await validateEventCoupon(couponPayload);
      const data = res?.data || res;
      const snapshot = {
        datesKey: datesKey(selectedDates),
        attendeeCount,
        cartKey: JSON.stringify(checkoutCart)
      };
      const hold = buildHoldState(data, snapshot);
      if (!hold || hold.holdKind === "vendor") {
        setError("Could not apply this coupon.");
        return;
      }
      skipHoldClearRef.current = 2;
      setCouponHold(hold);
      setCouponCodeInput(hold.couponCode || code);
      if (guestMode) {
        guestCouponEmailRef.current = emailTrim.toLowerCase();
      }
      const message = hold.message || COUPON_HOLD_MESSAGE;
      setCouponMessage(message);
      saveEventCheckoutDraft({
        eventId: Number(eventId),
        userId: checkoutUserId,
        selectedDates: normalizeDateList(selectedDates),
        attendeeCount,
        ticketItems: buildTicketItemsPayload(ticketLevels, checkoutCart),
        ticketCart: checkoutCart,
        firstName,
        lastName,
        name: contactName,
        email,
        phone,
        step,
        couponCodeInput: hold.couponCode || code,
        vendorCodeInput,
        couponMessage: message,
        couponHold: (({ _draftSnapshot: _s, ...rest }) => rest)(hold),
        holdSnapshot: snapshot
      });
    } catch (err) {
      await clearCouponHold({ skipApi: true });
      setError(err?.response?.data?.message || "Could not apply this coupon.");
    } finally {
      setCouponApplying(false);
    }
  };

  const applyCoupon = async () => applyPromoCode(couponCodeInput);

  const validateForm = useCallback(() => {
    if (!availableDates.length) {
      return "This event has no dates you can book on Book My Tickets yet.";
    }
    if (!selectedDates.length) {
      return "Choose at least one show date.";
    }
    const invalid = selectedDates.find((d) => !availableDates.includes(d));
    if (invalid) {
      return "One of the dates you picked isn’t offered for this event.";
    }
    const ticketCap = maxTickets > 0 ? maxTickets : 50;
    if (!ticketLevels.length) {
      return "No ticket types are available to book for this event right now.";
    }
    if (reservedSeating) {
      if (!selectedSeats.length || !seatsioHoldToken) {
        return "Choose your seats on the seating chart to continue.";
      }
    } else if (!Number.isFinite(attendeeCount) || attendeeCount < 1) {
      return "Select at least one ticket.";
    }
    if (attendeeCount > ticketCap) {
      return `You can book up to ${ticketCap} ticket${ticketCap === 1 ? "" : "s"} per order.`;
    }
    const nameCheck = validateBookingContactNames({ firstName, lastName });
    const emailTrim = email.trim();
    const phoneTrim = phone.trim();
    if (!nameCheck.ok) {
      return nameCheck.message;
    }
    if (guestMode || !userId) {
      if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        return "Enter a valid email address.";
      }
    }
    if (!phoneTrim) {
      return "";
    }
    if (phoneTrim.length < 8) {
      return "Enter a valid phone number (at least 8 digits), or leave it blank.";
    }
    return "";
  }, [
    availableDates,
    attendeeCount,
    phone,
    selectedDates,
    maxTickets,
    ticketCart,
    ticketLevels.length,
    guestMode,
    firstName,
    reservedSeating,
    selectedSeats.length,
    seatsioHoldToken,
    lastName,
    email,
    userId
  ]);

  useEffect(() => {
    if (!ticketLevels.length) {
      return;
    }
    if (reservedSeating) {
      return;
    }
    setTicketCart((prev) => {
      const next = createEmptyCart(ticketLevels);
      ticketLevels.forEach((level) => {
        if (prev[level.id] != null) {
          next[level.id] = prev[level.id];
        }
      });
      return next;
    });
  }, [eventId, ticketLevels, reservedSeating]);

  const onContinueToConfirm = () => {
    setError("");
    const msg = validateForm();
    if (msg) {
      setError(msg);
      return;
    }
    if (couponCodeInput.trim() && !couponHold?.holdToken) {
      setError("Apply your coupon code before continuing, or remove it.");
      return;
    }
    setStep("confirm");
  };

  const finishBookingSuccess = useCallback(
    (data, sortedDates) => {
      const items = buildTicketItemsPayload(ticketLevels, ticketCart).map((row) => {
        const level = ticketLevels.find((l) => l.id === row.level_id);
        return { level_id: row.level_id, level_name: level?.name, quantity: row.quantity };
      });
      if (eventId && items.length) {
        trackBookingCompleteTiers({ eventId, items });
      }

      const summary = buildBookingConfirmationPayload({
        data,
        event,
        email,
        totalAmount,
        subtotalAmount,
        discountAmount,
        couponCode: couponHold?.couponCode,
        totalDays,
        selectedDates: sortedDates,
        paidWithCard: needsCardPayment,
        attendeeCount
      });

      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(BOOKING_CONFIRMED_STORAGE_KEY, JSON.stringify(summary));
        }
      } catch {
        // ignore session storage failures and continue navigation
      }

      setCouponHold(null);
      setPaymentModalOpen(false);
      setPaymentClientSecret("");
      clearPendingStripePayment(eventId, checkoutUserId);
      clearStripeReturnParams();
      clearEventCheckoutDraft(eventId, checkoutUserId);
      navigate("/booking/confirmed", { replace: true, state: summary });
    },
    [
      attendeeCount,
      checkoutUserId,
      couponHold?.couponCode,
      discountAmount,
      email,
      event,
      eventId,
      navigate,
      needsCardPayment,
      subtotalAmount,
      ticketCart,
      ticketLevels,
      totalAmount,
      totalDays
    ]
  );

  const onSubmitBooking = async () => {
    setError("");
    const msg = validateForm();
    if (msg) {
      setError(msg);
      setStep("form");
      return;
    }
    if (!guestMode && !userId) {
      setError("Sign in to complete your booking.");
      return;
    }
    const sortedDates = normalizeDateList(selectedDates);
    const payload = buildBookingPayload({
      eventId,
      levels: ticketLevels,
      ticketCart,
      selectedDates: sortedDates,
      firstName,
      lastName,
      email,
      phone,
      couponHold,
      vendorCode: vendorCodeInput,
      reservedSeating,
      seatsioHoldToken,
      selectedSeats,
      chartCategoryKeys,
      chartPricing
    });

    try {
      setSubmitting(true);

      if (!needsCardPayment) {
        const body = guestMode
          ? await createGuestBookingCheckout(payload)
          : await createBookingCheckout(payload);
        const data = body?.data || body;
        finishBookingSuccess(data, sortedDates);
        return;
      }

      const intentRes = guestMode
        ? await createGuestBookingPaymentIntent(payload)
        : await createBookingPaymentIntent(payload);
      const intent = intentRes?.data || intentRes;
      const pubKey =
        intent?.publishableKey ||
        import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
        "";
      if (!intent?.clientSecret || !pubKey) {
        setError("Payment could not be started. Please try again.");
        return;
      }
      setPaymentClientSecret(intent.clientSecret);
      setPaymentPublishableKey(pubKey);
      setPaymentIntentId(intent.paymentIntentId || "");
      savePendingStripePayment(eventId, checkoutUserId, {
        paymentIntentId: intent.paymentIntentId,
        returnUrl: buildStripeReturnUrl(eventId)
      });
      setPaymentModalOpen(true);
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      setError(apiMessage || `We couldn’t start checkout on ${BRAND_NAME}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const onPaymentSuccess = useCallback(
    async (piId) => {
      setError("");
      try {
        setSubmitting(true);
        const sortedDates = normalizeDateList(selectedDates);
        const confirmFn = guestMode ? confirmGuestBookingPayment : confirmBookingPayment;
        const body = await confirmBookingPaymentWithRetry(confirmFn, piId);
        const data = body?.data || body;
        finishBookingSuccess(data, sortedDates);
      } catch (err) {
        const apiMessage = err?.response?.data?.message;
        setError(
          apiMessage ||
            `Payment went through but we could not save your booking. Contact ${BRAND_SUPPORT_EMAIL} with your receipt.`
        );
        setPaymentModalOpen(false);
        setStep("confirm");
      } finally {
        setSubmitting(false);
        setCompletingPaymentReturn(false);
      }
    },
    [selectedDates, finishBookingSuccess, guestMode]
  );

  const handleStripePaymentReturn = useCallback(
    async (piId, redirectStatus) => {
      if (!piId || paymentReturnHandledRef.current) {
        return;
      }
      paymentReturnHandledRef.current = true;
      clearStripeReturnParams();
      setPaymentModalOpen(false);
      setPaymentClientSecret("");

      if (redirectStatus && redirectStatus !== "succeeded") {
        setCompletingPaymentReturn(false);
        setError("Payment was not completed. Please try again.");
        setStep("confirm");
        return;
      }

      setCompletingPaymentReturn(true);
      setError("");
      await onPaymentSuccess(piId);
    },
    [onPaymentSuccess]
  );

  useEffect(() => {
    const handler = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      if (event.data?.type !== STRIPE_PAYMENT_MESSAGE) {
        return;
      }
      void handleStripePaymentReturn(event.data.paymentIntentId, event.data.redirectStatus);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [handleStripePaymentReturn]);

  useEffect(() => {
    const stripeReturn = parseStripeReturnParams();
    if (!stripeReturn.isPaymentReturn || !stripeReturn.paymentIntentId || paymentReturnHandledRef.current) {
      return;
    }
    if (popupReturnRelay) {
      return;
    }
    if (
      stripeReturn.eventIdFromUrl != null &&
      eventId != null &&
      Number(stripeReturn.eventIdFromUrl) !== Number(eventId)
    ) {
      return;
    }
    if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
      return;
    }
    void handleStripePaymentReturn(
      stripeReturn.paymentIntentId,
      stripeReturn.redirectStatus || "succeeded"
    );
  }, [eventId, popupReturnRelay, handleStripePaymentReturn]);

  const onPaymentModalClose = () => {
    if (submitting) {
      return;
    }
    setPaymentModalOpen(false);
    setPaymentClientSecret("");
    setError(
      "Payment was not completed. Your tickets are not booked yet — try again when you are ready."
    );
  };

  if (popupReturnRelay?.paymentIntentId) {
    return (
      <StripePaymentReturnRelay
        paymentIntentId={popupReturnRelay.paymentIntentId}
        redirectStatus={popupReturnRelay.redirectStatus}
      />
    );
  }

  if (completingPaymentReturn) {
    return (
      <CheckoutCard pill="Confirming payment">
        <div className="py-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#E31C5F]" />
          <p className="mt-4 text-sm font-medium text-slate-800">Confirming your payment and booking…</p>
        </div>
      </CheckoutCard>
    );
  }

  if (!availableDates.length) {
    return (
      <CheckoutCard pill={`${BRAND_NAME} · booking`}>
        <p className="text-center text-sm text-slate-600">
          This event doesn’t have any bookable show dates on {BRAND_NAME} yet. Check back later or contact the organizer.
        </p>
      </CheckoutCard>
    );
  }

  if (step === "confirm") {
    return (
      <>
      {paymentModalOpen ? (
        <Suspense fallback={null}>
          <StripePaymentModal
            open={paymentModalOpen}
            clientSecret={paymentClientSecret}
            publishableKey={paymentPublishableKey}
            paymentIntentId={paymentIntentId}
            eventId={eventId}
            totalLabel={formatCheckoutCurrency(totalAmount)}
            onClose={onPaymentModalClose}
            onError={(msg) => setError(msg)}
            onSuccess={(piId) => void onPaymentSuccess(piId)}
          />
        </Suspense>
      ) : null}
      <CheckoutCard pill="Review your booking" seatBar={seatBar}>
        <div className="mb-5 space-y-3">
          <OrderPriceSummary
            subtotal={subtotalAmount}
            discount={discountAmount}
            serviceFee={serviceFeeAmount}
            platformFee={platformFeeAmount}
            total={totalAmount}
            ticketCount={attendeeCount}
            showDays={totalDays}
            couponCode={couponHold?.couponCode || ""}
          />
          {vendorCodeInput.trim() ? (
            <p className="text-xs font-semibold text-slate-700">
              Vendor {vendorCodeInput.trim().toUpperCase()} (tracking only)
            </p>
          ) : null}
          <p className="text-sm text-slate-600">
            {needsCardPayment
              ? `You will pay ${formatCheckoutCurrency(totalAmount)} securely with Stripe in a popup on this page.`
              : "No card payment is required for this booking total."}
          </p>
        </div>

        <div className="mb-4 overflow-hidden rounded-xl border border-slate-300 bg-white">
          <div className="space-y-2 p-3.5 text-sm text-slate-700">
            <p>
              <span className="text-slate-500">Show dates: </span>
              {normalizeDateList(selectedDates)
                .map((d) => formatDateUS(d))
                .join(", ")}
            </p>
            <div>
              <span className="text-slate-500">Tickets: </span>
              <ul className="mt-1 space-y-1">
                {reservedSeating && selectedSeats.length
                  ? reservedSeatGroups.map((group) => (
                      <li key={group.levelId}>
                        <span className="font-medium text-slate-800">
                          {group.levelName} × {group.seatLabels.length}
                        </span>
                        <span className="block text-xs text-slate-600">{group.seatLabels.join(", ")}</span>
                      </li>
                    ))
                  : buildTicketItemsPayload(ticketLevels, ticketCart).map((row) => {
                      const level = ticketLevels.find((l) => l.id === row.level_id);
                      return (
                        <li key={row.level_id}>
                          {level?.name || "Ticket"} × {row.quantity}
                        </li>
                      );
                    })}
              </ul>
            </div>
            {reservedSeating && seatHoldCountdown ? (
              <p className="text-xs font-medium text-amber-800">Seats held for {seatHoldCountdown}</p>
            ) : null}
            <p>
              <span className="text-slate-500">Contact: </span>
              {contactName || "—"} · {email || "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={() => setStep("form")}
            className="flex-1 rounded-full border border-slate-300 bg-white py-3.5 text-center text-base font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            Edit details
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void onSubmitBooking()}
            className="flex-1 rounded-full bg-[#E31C5F] py-3.5 text-center text-base font-semibold text-white transition hover:bg-[#D70466] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? needsCardPayment
                ? "Starting…"
                : "Saving…"
              : needsCardPayment
                ? "Pay & confirm"
                : "Confirm booking"}
          </button>
        </div>

        {error ? <p className="mt-3 text-center text-sm font-medium text-rose-700">{error}</p> : null}
        <p className="mt-3 text-center text-xs text-slate-600">
          {needsCardPayment
            ? "Your card is charged only after you complete payment in the secure popup."
            : `No card charge on ${BRAND_NAME} for this booking.`}
        </p>
      </CheckoutCard>
      </>
    );
  }

  return (
    <>
    <CheckoutCard seatBar={seatBar}>
      {showOrderPriceSummary ? (
        <div className="mb-5">
          <OrderPriceSummary
            subtotal={subtotalAmount}
            discount={discountAmount}
            serviceFee={serviceFeeAmount}
            platformFee={platformFeeAmount}
            total={totalAmount}
            ticketCount={attendeeCount}
            showDays={totalDays}
            couponCode={couponHold?.couponCode || ""}
            seatGroups={reservedSeating ? reservedSeatGroups : null}
            holdCountdown={reservedSeating ? seatHoldCountdown : ""}
            onClearSeats={
              reservedSeating && selectedSeats.length
                ? () => void clearSeatHold()
                : null
            }
          />
        </div>
      ) : null}

      <div className="mb-4 overflow-hidden rounded-xl border border-slate-300">
        <div className="grid grid-cols-2 divide-x divide-slate-300">
          <div className="bg-white p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-900">{gridLeftTitle}</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{gridLeftValue}</p>
          </div>
          <div className="bg-white p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-900">{gridRightTitle}</p>
            <p
              className={`mt-1 text-sm font-medium ${
                scheduleType !== "single" && sortedSelected.length <= 1 ? "text-slate-500" : "text-slate-900"
              }`}
            >
              {gridRightValue}
            </p>
          </div>
        </div>
        <div className="border-t border-slate-200/90 bg-gradient-to-b from-slate-100/60 via-white to-amber-50/30 px-3.5 pb-3.5 pt-4">
          {reservedSeating ? (
            <div className="space-y-3">
              {ticketLevels.length ? (
                <EventTicketCart
                  eventId={eventId}
                  levels={ticketLevels}
                  cart={checkoutCart}
                  totalDays={totalDays}
                  selectionMode="chart"
                />
              ) : (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-4 text-center text-sm text-amber-900">
                  No ticket types are available to book right now. Sale periods may have ended for all tiers.
                </p>
              )}
              <button
                type="button"
                onClick={openSeatSelectionModal}
                disabled={!ticketLevels.length}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectedSeats.length ? "Change seats on chart" : "Choose seats on chart"}
              </button>
            </div>
          ) : ticketLevels.length ? (
            <>
              <EventTicketCart
                eventId={eventId}
                levels={ticketLevels}
                cart={ticketCart}
                onChange={setTicketCart}
                totalDays={totalDays}
                maxTickets={maxTickets > 0 ? maxTickets : 50}
              />
              <p className="mt-3 text-center text-[11px] font-medium text-slate-500">Max 50 tickets per order</p>
            </>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-4 text-center text-sm text-amber-900">
              No ticket types are available to book right now. Sale periods may have ended for all tiers.
            </p>
          )}
        </div>
      </div>

      {scheduleType !== "single" ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Choose show dates</p>
          <p className="mt-0.5 text-xs text-slate-500">Pricing is per ticket, for each day you select.</p>
          <div className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
            {availableDates.map((d) => (
              <label
                key={d}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedDates.includes(d)}
                  onChange={() => setSelectedDates((prev) => toggleDateInList(prev, d))}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>{formatDateUS(d)}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
            First name <span className="text-rose-600">*</span>
          </label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-900"
            autoComplete="given-name"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
            Last name <span className="text-rose-600">*</span>
          </label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-900"
            autoComplete="family-name"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
            Email <span className="text-rose-600">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
            Phone
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
            placeholder="Mobile number (optional)"
            autoComplete="tel"
          />
        </div>
      </div>

      {vendorCodeEnabled ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/90 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Vendor code</p>
          <p className="mt-1 text-xs text-slate-500">
            Optional — enter a partner/vendor code for tracking only. No discount is applied.
          </p>
          <input
            value={vendorCodeInput}
            onChange={(e) => setVendorCodeInput(e.target.value.toUpperCase())}
            maxLength={40}
            placeholder="VENDOR123"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm uppercase"
          />
        </div>
      ) : null}

      {!showCouponCheckout ? null : (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/90 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Coupon code</p>
          {guestMode ? (
            <p className="mt-1 text-xs text-slate-500">
              Enter your email above first, then apply your promo code here.
            </p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <input value={couponCodeInput} onChange={(e) => { setCouponCodeInput(e.target.value.toUpperCase()); if (couponHold) void clearCouponHold(); }} maxLength={20} placeholder="SAVE20" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm uppercase" />
            <button type="button" disabled={couponApplying || !couponCodeInput.trim()} onClick={() => void applyCoupon()} className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{couponApplying ? "..." : "Apply"}</button>
          </div>
          {isCouponHoldApplied && couponHold?.holdToken ? (
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-emerald-700">{couponMessage}</span>
                <button
                  type="button"
                  onClick={() => void clearCouponHold()}
                  className="font-semibold text-slate-600 hover:text-slate-900"
                >
                  Remove
                </button>
              </div>
              {holdCountdown ? (
                <p className="font-semibold tabular-nums text-amber-800">
                  Reserved for {holdCountdown}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-slate-500">
              Reserved for {COUPON_HOLD_MINUTES} minutes after you apply.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onContinueToConfirm}
        className="w-full rounded-full bg-[#E31C5F] py-3.5 text-center text-base font-semibold text-white transition hover:bg-[#D70466]"
      >
        Book tickets
      </button>

      {error ? <p className="mt-3 text-center text-sm font-medium text-rose-700">{error}</p> : null}
    </CheckoutCard>
    <GuestSeatSelectionModal
      open={seatModalOpen}
      onClose={() => setSeatModalOpen(false)}
      eventId={eventId}
      eventTitle={event?.title}
      maxSeats={maxTickets > 0 ? maxTickets : 20}
      totalDays={totalDays}
      initialSelectedSeats={selectedSeats}
      existingHoldToken={seatsioHoldToken}
      existingEventKey={seatingEventKey}
      onConfirm={({ holdToken, selectedSeats: seats, eventKey, chartCategoryKeys: categoryKeys, chartPricing: pricing, holdExpiresAt }) => {
        setSeatsioHoldToken(holdToken);
        setSelectedSeats(seats);
        setSeatHoldExpiresAt((prev) => {
          if (prev && prev > Date.now()) {
            return prev;
          }
          const fromApi = parseExpiresMs(holdExpiresAt);
          if (fromApi && fromApi > Date.now()) {
            return fromApi;
          }
          return seatHoldExpiresAtFromNow();
        });
        setSeatingEventKey(eventKey || "");
        setChartCategoryKeys(Array.isArray(categoryKeys) ? categoryKeys : []);
        setChartPricing(Array.isArray(pricing) ? pricing : []);
        setSeatModalOpen(false);
      }}
    />
  </>
  );
}










