import { motion } from "framer-motion";
import { FiDownload, FiMail, FiMessageSquare } from "react-icons/fi";
import { formatDateUS } from "../utils/format";

function AdminCommunicationsSection({
  tab,
  onTabChange,
  newsletterRows,
  newsletterPagination,
  loadingNewsletter,
  onNewsletterPageChange,
  contactRows,
  contactPagination,
  loadingContact,
  onContactPageChange,
  onExportNewsletter,
  onExportContact,
  onSyncNewsletterMailchimp,
  syncingNewsletterMailchimp
}) {
  const nTotal = newsletterPagination?.total ?? 0;
  const nPage = newsletterPagination?.page ?? 1;
  const nLimit = newsletterPagination?.limit ?? 20;
  const nPages = Math.max(1, Math.ceil(nTotal / nLimit));

  const cTotal = contactPagination?.total ?? 0;
  const cPage = contactPagination?.page ?? 1;
  const cLimit = contactPagination?.limit ?? 20;
  const cPages = Math.max(1, Math.ceil(cTotal / cLimit));

  const formatInterests = (raw) => {
    if (Array.isArray(raw)) {
      return raw.length ? raw.join(", ") : "—";
    }
    try {
      const arr = JSON.parse(raw || "[]");
      return Array.isArray(arr) && arr.length ? arr.join(", ") : "—";
    } catch (_err) {
      const text = String(raw || "").trim();
      return text ? text : "—";
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Communications</h2>
          <p className="text-sm text-slate-600">Newsletter subscribers and contact form messages.</p>
        </div>
      </div>

      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => onTabChange("newsletter")}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "newsletter" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FiMail className="h-4 w-4" />
          Newsletter
        </button>
        <button
          type="button"
          onClick={() => onTabChange("contact")}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "contact" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FiMessageSquare className="h-4 w-4" />
          Contact log
        </button>
      </div>

      {tab === "newsletter" ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
        >
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-800">
              {nTotal} subscriber{nTotal === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onExportNewsletter("csv")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FiDownload className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => onExportNewsletter("excel")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FiDownload className="h-3.5 w-3.5" />
                Excel
              </button>
              <button
                type="button"
                onClick={onSyncNewsletterMailchimp}
                disabled={syncingNewsletterMailchimp}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncingNewsletterMailchimp ? "Syncing..." : "Sync Mailchimp"}
              </button>
            </div>
          </div>
          <div className="space-y-2 p-3 md:hidden">
            {loadingNewsletter ? (
              <p className="rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">Loading…</p>
            ) : newsletterRows.length === 0 ? (
              <p className="rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">No subscribers yet.</p>
            ) : (
              newsletterRows.map((row) => (
                <article key={`m-news-${row.id}`} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {[row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}
                  </p>
                  <p className="text-xs text-slate-600">{row.email}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600">
                    <p><span className="font-semibold">Mobile:</span> {row.mobile_number || "—"}</p>
                    <p><span className="font-semibold">City:</span> {row.city_name || "—"}</p>
                    <p className="col-span-2"><span className="font-semibold">Interested In:</span> {formatInterests(row.interests_json)}</p>
                    <p><span className="font-semibold">Influencer:</span> {Number(row.wants_influencer) === 1 ? "Yes" : "No"}</p>
                    <p><span className="font-semibold">Dealer:</span> {Number(row.wants_deal) === 1 ? "Yes" : "No"}</p>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">First Name</th>
                  <th className="px-4 py-2">Last Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Mobile Number</th>
                  <th className="px-4 py-2">City</th>
                  <th className="px-4 py-2">Interested In</th>
                  <th className="px-4 py-2">Influencer</th>
                  <th className="px-4 py-2">Dealer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingNewsletter ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : newsletterRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                      No subscribers yet.
                    </td>
                  </tr>
                ) : (
                  newsletterRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 text-slate-700">{row.first_name || "—"}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.last_name || "—"}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{row.email}</td>
                      <td className="px-4 py-2.5 text-slate-600">{row.mobile_number || "—"}</td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {row.city_name || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{formatInterests(row.interests_json)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{Number(row.wants_influencer) === 1 ? "Yes" : "No"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{Number(row.wants_deal) === 1 ? "Yes" : "No"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {nPages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-600">
              <button
                type="button"
                disabled={nPage <= 1}
                onClick={() => onNewsletterPageChange(nPage - 1)}
                className="rounded-lg px-2 py-1 font-medium disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {nPage} of {nPages}
              </span>
              <button
                type="button"
                disabled={nPage >= nPages}
                onClick={() => onNewsletterPageChange(nPage + 1)}
                className="rounded-lg px-2 py-1 font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
        >
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-800">
              {cTotal} message{cTotal === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onExportContact("csv")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FiDownload className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => onExportContact("excel")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FiDownload className="h-3.5 w-3.5" />
                Excel
              </button>
            </div>
          </div>
          <div className="space-y-2 p-3 md:hidden">
            {loadingContact ? (
              <p className="rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">Loading…</p>
            ) : contactRows.length === 0 ? (
              <p className="rounded-xl border border-slate-200 px-3 py-4 text-sm text-slate-500">No messages yet.</p>
            ) : (
              contactRows.map((row) => (
                <article key={`m-contact-${row.id}`} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                    <span className="text-[11px] font-semibold uppercase text-slate-500">{row.status}</span>
                  </div>
                  <p className="text-xs text-slate-600">{row.email}</p>
                  <p className="mt-1 text-xs text-slate-600">{row.subject}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.created_at ? formatDateUS(row.created_at) : "—"}</p>
                  <p className="mt-2 text-xs text-slate-700">{row.message}</p>
                </article>
              ))
            )}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Subject</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingContact ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : contactRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No messages yet.
                    </td>
                  </tr>
                ) : (
                  contactRows.map((row) => (
                    <tr key={row.id} className="align-top hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                        {row.created_at ? formatDateUS(row.created_at) : "—"}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{row.name}</td>
                      <td className="max-w-[180px] truncate px-4 py-2.5 text-slate-600" title={row.email}>
                        {row.email}
                      </td>
                      <td className="max-w-[160px] px-4 py-2.5 text-slate-600" title={row.subject}>
                        {row.subject}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{row.status}</td>
                      <td className="max-w-xs px-4 py-2.5 text-slate-600">
                        <span className="line-clamp-3">{row.message}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {cPages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-600">
              <button
                type="button"
                disabled={cPage <= 1}
                onClick={() => onContactPageChange(cPage - 1)}
                className="rounded-lg px-2 py-1 font-medium disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {cPage} of {cPages}
              </span>
              <button
                type="button"
                disabled={cPage >= cPages}
                onClick={() => onContactPageChange(cPage + 1)}
                className="rounded-lg px-2 py-1 font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </motion.div>
      )}
    </section>
  );
}

export default AdminCommunicationsSection;
