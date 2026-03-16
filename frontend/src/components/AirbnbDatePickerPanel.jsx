import DatePicker from "react-datepicker";
import { FiCalendar } from "react-icons/fi";

function parseDateValue(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function AirbnbDatePickerPanel({
  value,
  onChange,
  minDate,
  heading = "Pick your date",
  closeOnSelect = true,
  onClose
}) {
  const selectedDate = parseDateValue(value);

  return (
    <>
      <p className="mb-1 inline-flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <FiCalendar size={12} />
        {heading}
      </p>
      <div className="hide-scrollbar overflow-x-auto">
        <div className="airbnb-calendar-shell mx-auto w-fit">
          <DatePicker
            selected={selectedDate}
            onChange={(nextValue) => {
              if (!nextValue) {
                onChange("");
                return;
              }
              onChange(formatDateValue(nextValue));
              if (closeOnSelect) {
                onClose?.();
              }
            }}
            inline
            monthsShown={2}
            minDate={minDate}
            calendarClassName="airbnb-calendar"
            dayClassName={() => "airbnb-day"}
          />
        </div>
      </div>
    </>
  );
}

export default AirbnbDatePickerPanel;
