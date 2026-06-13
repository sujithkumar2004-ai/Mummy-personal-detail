"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type SavedNumber = {
  id: number;
  name: string;
  phoneNumber: string;
  registrationDate: string;
  insuranceDate: string;
  birthday: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const LOGIN_ID = "SL001";
const LOGIN_PASSWORD = "SL001@123";
const PAGE_SIZE = 8;
const emptyPagination: Pagination = { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 };
const initialForm = {
  name: "",
  phoneNumber: "",
  registrationDate: "",
  insuranceDate: "",
  birthday: "",
  notes: ""
};

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(value: string) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parseLocalDate(value));
}

function daysUntil(value: string, yearly: boolean) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(value);

  if (yearly) {
    target.setFullYear(today.getFullYear());

    if (target < today) {
      target.setFullYear(today.getFullYear() + 1);
    }
  }

  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function urgencyLabel(days: number) {
  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  return `${days} days`;
}

function normalizePhone(value: string) {
  return value.replace(/[^0-9+]/g, "");
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [records, setRecords] = useState<SavedNumber[]>([]);
  const [pagination, setPagination] = useState<Pagination>(emptyPagination);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const isEditing = editingId !== null;

  const nextBirthday = useMemo(() => {
    return [...records]
      .map((record) => ({ record, days: daysUntil(record.birthday, true) }))
      .sort((first, second) => first.days - second.days)[0];
  }, [records]);

  const nextInsurance = useMemo(() => {
    return [...records]
      .map((record) => ({ record, days: daysUntil(record.insuranceDate, false) }))
      .filter((item) => item.days >= 0)
      .sort((first, second) => first.days - second.days)[0];
  }, [records]);

  const nextRegistration = useMemo(() => {
    return [...records]
      .map((record) => ({ record, days: daysUntil(record.registrationDate, false) }))
      .filter((item) => item.days >= 0)
      .sort((first, second) => first.days - second.days)[0];
  }, [records]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const handle = window.setTimeout(() => {
      void fetchRecords(page, search);
    }, 220);

    return () => window.clearTimeout(handle);
  }, [isLoggedIn, page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function updateField(key: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function fetchRecords(nextPage = page, nextSearch = search) {
    setIsLoading(true);
    setStatusMessage("");

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(PAGE_SIZE)
      });

      if (nextSearch.trim()) {
        params.set("search", nextSearch.trim());
      }

      const response = await fetch(`/api/contacts?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        records?: SavedNumber[];
        pagination?: Pagination;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load saved numbers");
      }

      setRecords(payload.records || []);
      setPagination(payload.pagination || emptyPagination);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to load saved numbers");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loginId === LOGIN_ID && password === LOGIN_PASSWORD) {
      setIsLoggedIn(true);
      setLoginError("");
      return;
    }

    setLoginError("Invalid login credentials");
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.phoneNumber.trim() || !form.registrationDate || !form.insuranceDate || !form.birthday) {
      setStatusMessage("Please fill name, number, registration, insurance, and birthday.");
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      const response = await fetch(isEditing ? `/api/contacts/${editingId}` : "/api/contacts", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phoneNumber: normalizePhone(form.phoneNumber)
        })
      });
      const payload = (await response.json()) as { record?: SavedNumber; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save number");
      }

      resetForm();
      await fetchRecords(isEditing ? page : 1, search);
      setPage(isEditing ? page : 1);
      setStatusMessage(isEditing ? "Number updated in MySQL." : "Number saved in MySQL.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save number");
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(record: SavedNumber) {
    setEditingId(record.id);
    setForm({
      name: record.name,
      phoneNumber: record.phoneNumber,
      registrationDate: record.registrationDate,
      insuranceDate: record.insuranceDate,
      birthday: record.birthday,
      notes: record.notes
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteRecord(record: SavedNumber) {
    const confirmed = window.confirm(`Delete ${record.name}'s saved number?`);

    if (!confirmed) {
      return;
    }

    setStatusMessage("");

    try {
      const response = await fetch(`/api/contacts/${record.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete record");
      }

      await fetchRecords(page, search);
      setStatusMessage("Record deleted from MySQL.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to delete record");
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setLoginId("");
    setPassword("");
    setRecords([]);
    setPagination(emptyPagination);
    setSearch("");
    setStatusMessage("");
    resetForm();
  }

  if (!isLoggedIn) {
    return (
      <main className="login-page">
        <section className="login-panel" aria-label="Login">
          <div className="brand-row">
            <div className="brand-mark">NS</div>
            <div>
              <p className="eyebrow">Secure access</p>
              <h1>Number Saving Platform</h1>
            </div>
          </div>
          <p className="subtext">Sign in to manage saved numbers, registration dates, insurance dates, and birthdays.</p>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Login ID
              <input value={loginId} onChange={(event) => setLoginId(event.target.value)} placeholder="Enter login ID" autoComplete="username" />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" autoComplete="current-password" />
            </label>
            {loginError ? <p className="error">{loginError}</p> : null}
            <button type="submit">Login</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">MySQL backed registry</p>
          <h1>Number Saving Platform</h1>
          <p className="topbar-copy">Save every number with registration, insurance, birthday, notes, search, edit, delete, and pagination.</p>
        </div>
        <button className="logout-button" type="button" onClick={handleLogout}>Logout</button>
      </header>

      <section className="summary-grid" aria-label="Record summary">
        <div><span>Total saved</span><strong>{pagination.total}</strong></div>
        <div><span>Current page</span><strong>{pagination.page}</strong></div>
        <div><span>Visible rows</span><strong>{records.length}</strong></div>
      </section>

      <section className="alert-grid" aria-label="Upcoming dates">
        <article className="alert-card birthday-card">
          <p className="eyebrow">Upcoming birthday</p>
          <h2>{nextBirthday ? nextBirthday.record.name : "No birthdays yet"}</h2>
          <span>{nextBirthday ? `${formatDisplayDate(nextBirthday.record.birthday)} - ${urgencyLabel(nextBirthday.days)}` : "Add birthdays to track the next one."}</span>
        </article>
        <article className="alert-card insurance-card">
          <p className="eyebrow">Insurance due</p>
          <h2>{nextInsurance ? nextInsurance.record.name : "No insurance dates"}</h2>
          <span>{nextInsurance ? `${formatDisplayDate(nextInsurance.record.insuranceDate)} - ${urgencyLabel(nextInsurance.days)}` : "Add insurance dates to see upcoming renewals."}</span>
        </article>
        <article className="alert-card registration-card">
          <p className="eyebrow">Registration due</p>
          <h2>{nextRegistration ? nextRegistration.record.name : "No registration dates"}</h2>
          <span>{nextRegistration ? `${formatDisplayDate(nextRegistration.record.registrationDate)} - ${urgencyLabel(nextRegistration.days)}` : "Add registration dates to watch deadlines."}</span>
        </article>
      </section>

      <section className="entry-panel" aria-label="Add or edit saved number">
        <div className="panel-title">
          <div>
            <p className="eyebrow">{isEditing ? "Editing record" : "New record"}</p>
            <h2>{isEditing ? "Update Saved Number" : "Add Saved Number"}</h2>
          </div>
          {isEditing ? <button className="ghost-button" type="button" onClick={resetForm}>Cancel Edit</button> : null}
        </div>

        <form className="number-form" onSubmit={handleSubmit}>
          <label>Name<input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Full name" required /></label>
          <label>Number<input type="tel" value={form.phoneNumber} onChange={(event) => updateField("phoneNumber", event.target.value)} placeholder="Phone number" required /></label>
          <label>Registration Date<input type="date" value={form.registrationDate} onChange={(event) => updateField("registrationDate", event.target.value)} required /></label>
          <label>Insurance Date<input type="date" value={form.insuranceDate} onChange={(event) => updateField("insuranceDate", event.target.value)} required /></label>
          <label>Birthday<input type="date" value={form.birthday} onChange={(event) => updateField("birthday", event.target.value)} required /></label>
          <label className="notes-field">Notes<input value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Vehicle, policy, or reminder note" /></label>
          <button type="submit" disabled={isSaving}>{isSaving ? "Saving" : isEditing ? "Update" : "Save"}</button>
        </form>

        {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
      </section>

      <section className="records-section" aria-label="Saved numbers">
        <div className="records-header">
          <div>
            <h2>Saved Numbers</h2>
            <span>{pagination.total} records in MySQL</span>
          </div>
          <label className="search-field">
            <span>Search</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, number, or notes" aria-label="Search saved numbers" />
          </label>
        </div>

        {isLoading ? (
          <div className="empty-state"><p>Loading records.</p><span>Fetching from Prisma and local MySQL.</span></div>
        ) : records.length === 0 ? (
          <div className="empty-state"><p>No saved numbers found.</p><span>Add your first number to save it in MySQL.</span></div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Name</th>
                    <th>Number</th>
                    <th>Registration</th>
                    <th>Insurance</th>
                    <th>Birthday</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr key={record.id}>
                      <td>{(pagination.page - 1) * pagination.pageSize + index + 1}</td>
                      <td><strong>{record.name}</strong></td>
                      <td><a className="number-link" href={`tel:${record.phoneNumber}`}>{record.phoneNumber}</a></td>
                      <td>{formatDisplayDate(record.registrationDate)}</td>
                      <td><span className="date-pill insurance-pill">{formatDisplayDate(record.insuranceDate)}</span></td>
                      <td><span className="date-pill birthday-pill">{formatDisplayDate(record.birthday)}</span></td>
                      <td>{record.notes || "-"}</td>
                      <td>
                        <div className="row-actions">
                          <button className="table-button" type="button" onClick={() => startEdit(record)}>Edit</button>
                          <button className="danger-button" type="button" onClick={() => void deleteRecord(record)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <div className="page-actions">
                <button className="ghost-button" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={pagination.page <= 1}>Previous</button>
                <button className="ghost-button" type="button" onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))} disabled={pagination.page >= pagination.totalPages}>Next</button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
