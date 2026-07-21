import { useState } from "react";

function validateField(field, value) {
  const trimmed = typeof value === "string" ? value.trim() : value;
  if (field.required && !trimmed) return `${field.label} is required`;
  if (field.type === "email" && trimmed) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email";
  }
  return null;
}

/**
 * Shared stub lead form — inline validation + local success UI.
 */
export default function LandingLeadForm({ form, idPrefix = "el" }) {
  const fields = form?.fields || [];
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, ""]))
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!form || !fields.length) return null;

  if (success) {
    return (
      <div className="el-success" role="status">
        {form.successMessage || "Thanks — we received your submission."}
      </div>
    );
  }

  const onChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    for (const field of fields) {
      const err = validateField(field, values[field.name]);
      if (err) nextErrors[field.name] = err;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    await Promise.resolve();
    setSubmitting(false);
    setSuccess(true);
  };

  return (
    <form className="el-form-panel" onSubmit={onSubmit} noValidate>
      <h3>{form.title || "Contact us"}</h3>
      {fields.map((field) => {
        const inputId = `${idPrefix}-${field.name}`;
        return (
          <div className="el-field" key={field.name}>
            <label htmlFor={inputId}>
              {field.label}
              {field.required ? " *" : ""}
            </label>
            {field.type === "textarea" ? (
              <textarea
                id={inputId}
                name={field.name}
                value={values[field.name] || ""}
                onChange={(e) => onChange(field.name, e.target.value)}
              />
            ) : field.type === "select" ? (
              <select
                id={inputId}
                name={field.name}
                value={values[field.name] || ""}
                onChange={(e) => onChange(field.name, e.target.value)}
              >
                <option value="">Select…</option>
                {(field.options || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={inputId}
                name={field.name}
                type={field.type || "text"}
                value={values[field.name] || ""}
                onChange={(e) => onChange(field.name, e.target.value)}
              />
            )}
            {errors[field.name] ? (
              <span className="el-field-error">{errors[field.name]}</span>
            ) : null}
          </div>
        );
      })}
      <button type="submit" className="el-btn el-btn--primary" disabled={submitting}>
        {submitting ? "Sending…" : form.submitLabel || "Submit"}
      </button>
    </form>
  );
}
