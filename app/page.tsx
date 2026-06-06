"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Detail = {
  id: number;
  name: string;
  dob: string;
  phone: string;
  renewalDate: string;
  pdfName: string;
  pdfUrl: string;
};

const LOGIN_ID = "SL001";
const LOGIN_PASSWORD = "SL001@123";
const PAGE_SIZE = 5;
const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
];

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

function getMonthName(value: string) {
  if (!value) {
    return "";
  }

  return MONTHS[parseLocalDate(value).getMonth()];
}

function getDaysUntilDate(value: string, repeatsEveryYear: boolean) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = parseLocalDate(value);

  if (repeatsEveryYear) {
    target.setFullYear(today.getFullYear());

    if (target < today) {
      target.setFullYear(today.getFullYear() + 1);
    }
  }

  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function getUpcomingLabel(days: number) {
  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  return `${days} days`;
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [details, setDetails] = useState<Detail[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentPdfName, setCurrentPdfName] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingId !== null;

  const filteredDetails = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return details;
    }

    return details.filter((detail) => {
      const dobMonth = getMonthName(detail.dob);
      const renewalMonth = getMonthName(detail.renewalDate);

      return (
        detail.name.toLowerCase().includes(query) ||
        detail.phone.toLowerCase().includes(query) ||
        detail.dob.includes(query) ||
        detail.renewalDate.includes(query) ||
        dobMonth.includes(query) ||
        dobMonth.slice(0, 3).includes(query) ||
        renewalMonth.includes(query) ||
        renewalMonth.slice(0, 3).includes(query)
      );
    });
  }, [details, search]);

  const nextBirthday = useMemo(() => {
    return details
      .map((detail) => ({
        detail,
        days: getDaysUntilDate(detail.dob, true)
      }))
      .sort((first, second) => first.days - second.days)[0];
  }, [details]);

  const nextRenewal = useMemo(() => {
    return details
      .filter((detail) => detail.renewalDate)
      .map((detail) => ({
        detail,
        days: getDaysUntilDate(detail.renewalDate, false)
      }))
      .filter((item) => item.days >= 0)
      .sort((first, second) => first.days - second.days)[0];
  }, [details]);

  const totalPages = Math.max(1, Math.ceil(filteredDetails.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const visibleDetails = filteredDetails.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (isLoggedIn) {
      void fetchDetails();
    }
  }, [isLoggedIn]);

  async function fetchDetails() {
    setIsLoading(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/details", { cache: "no-store" });
      const payload = (await response.json()) as { details?: Detail[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load details");
      }

      setDetails(payload.details || []);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to load details");
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
    setName("");
    setDob("");
    setPhone("");
    setRenewalDate("");
    setPdf(null);
    setEditingId(null);
    setCurrentPdfName("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !dob || !phone.trim() || !renewalDate || (!pdf && !isEditing)) {
      setStatusMessage("Please fill all required fields and upload a PDF.");
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      const response = await fetch(isEditing ? `/api/details/${editingId}` : "/api/details", {
        method: isEditing ? "PUT" : "POST",
        body: buildFormData()
      });
      const payload = (await response.json()) as { detail?: Detail; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save detail");
      }

      await fetchDetails();
      resetForm();
      setStatusMessage(isEditing ? "Detail updated in MySQL." : "Detail saved in MySQL.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save detail");
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(detail: Detail) {
    setEditingId(detail.id);
    setName(detail.name);
    setDob(detail.dob);
    setPhone(detail.phone);
    setRenewalDate(detail.renewalDate);
    setPdf(null);
    setCurrentPdfName(detail.pdfName);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setLoginId("");
    setPassword("");
    setDetails([]);
    setStatusMessage("");
    resetForm();
  }

  function buildFormData() {
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("dob", dob);
    formData.append("phone", phone.trim());
    formData.append("renewalDate", renewalDate);

    if (pdf) {
      formData.append("pdf", pdf);
    }

    return formData;
  }

  if (!isLoggedIn) {
    return (
      <main className="login-page">
        <section className="login-panel" aria-label="Login">
          <div className="brand-mark">SL</div>
          <div>
            <p className="eyebrow">Secure entry</p>
            <h1>Personal Detail Planner</h1>
            <p className="subtext">Sign in to manage detail records and uploaded PDFs.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Login ID
              <input
                type="text"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                placeholder="Enter login ID"
                autoComplete="username"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
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
          <p className="eyebrow">Personal records</p>
          <h1>Personal Detail Planner</h1>
          <p className="topbar-copy">Track birthdays, renewals, phone numbers, and uploaded PDFs.</p>
        </div>
        <button className="logout-button" type="button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <section className="summary-grid" aria-label="Record summary">
        <div>
          <span>Total Records</span>
          <strong>{details.length}</strong>
        </div>
        <div>
          <span>Showing</span>
          <strong>{filteredDetails.length}</strong>
        </div>
        <div>
          <span>PDF Files</span>
          <strong>{details.length}</strong>
        </div>
      </section>

      <section className="alert-grid" aria-label="Upcoming alerts">
        <article className="alert-card birthday-card">
          <div>
            <p className="eyebrow">Upcoming birthday</p>
            <h2>{nextBirthday ? nextBirthday.detail.name : "No birthdays yet"}</h2>
            <span>
              {nextBirthday
                ? `${formatDisplayDate(nextBirthday.detail.dob)} - ${getUpcomingLabel(nextBirthday.days)}`
                : "Add a DOB to see the nearest birthday."}
            </span>
          </div>
        </article>

        <article className="alert-card renewal-card">
          <div>
            <p className="eyebrow">Upcoming renewal</p>
            <h2>{nextRenewal ? nextRenewal.detail.name : "No renewals yet"}</h2>
            <span>
              {nextRenewal
                ? `${formatDisplayDate(nextRenewal.detail.renewalDate)} - ${getUpcomingLabel(nextRenewal.days)}`
                : "Add a renewal date to see the nearest deadline."}
            </span>
          </div>
        </article>
      </section>

      <section className="entry-panel" aria-label="Add or edit personal detail">
        <div className="panel-title">
          <div>
            <p className="eyebrow">{isEditing ? "Edit entry" : "New entry"}</p>
            <h2>{isEditing ? "Update Personal Detail" : "Add Personal Detail"}</h2>
          </div>
          {isEditing ? (
            <button className="ghost-button" type="button" onClick={resetForm}>
              Cancel Edit
            </button>
          ) : null}
        </div>

        <form className="detail-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              required
            />
          </label>

          <label>
            DOB
            <input
              type="date"
              value={dob}
              onChange={(event) => setDob(event.target.value)}
              required
            />
          </label>

          <label>
            Phone Number
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone number"
              required
            />
          </label>

          <label>
            Renewal Date
            <input
              type="date"
              value={renewalDate}
              onChange={(event) => setRenewalDate(event.target.value)}
              required
            />
          </label>

          <label>
            Upload PDF
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setPdf(event.target.files?.[0] ?? null)}
              required={!isEditing}
            />
            {isEditing && currentPdfName ? (
              <span className="field-note">Current file: {currentPdfName}</span>
            ) : null}
          </label>

          <button type="submit" disabled={isSaving}>
            {isSaving ? "Saving" : isEditing ? "Update" : "Add"}
          </button>
        </form>

        {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
      </section>

      <section className="records-section" aria-label="Saved records">
        <div className="records-header">
          <div>
            <h2>Saved Details</h2>
            <span>
              {filteredDetails.length} of {details.length} records
            </span>
          </div>

          <label className="search-field">
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, month, or renewal"
              aria-label="Search by name, phone number, month, DOB, or renewal date"
            />
          </label>
        </div>

        {isLoading ? (
          <div className="empty-state">
            <p>Loading saved details.</p>
            <span>Fetching records from local MySQL.</span>
          </div>
        ) : details.length === 0 ? (
          <div className="empty-state">
            <p>No details added yet.</p>
            <span>Your first entry will be saved in MySQL after upload.</span>
          </div>
        ) : filteredDetails.length === 0 ? (
          <div className="empty-state">
            <p>No matching records.</p>
            <span>Try searching by another name or phone number.</span>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Name</th>
                    <th>DOB</th>
                    <th>Phone Number</th>
                    <th>Renewal Date</th>
                    <th>PDF</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDetails.map((detail, index) => (
                    <tr key={detail.id}>
                      <td>{pageStart + index + 1}</td>
                      <td>
                        <strong>{detail.name}</strong>
                      </td>
                      <td>{formatDisplayDate(detail.dob)}</td>
                      <td>{detail.phone}</td>
                      <td>
                        <span className="renewal-date">{formatDisplayDate(detail.renewalDate)}</span>
                      </td>
                      <td>
                        <a
                          className="pdf-link"
                          href={detail.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View PDF
                        </a>
                        <span className="pdf-name">{detail.pdfName}</span>
                      </td>
                      <td>
                        <button className="table-button" type="button" onClick={() => startEdit(detail)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Page {safePage} of {totalPages}
              </span>
              <div className="page-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={safePage === 1}
                >
                  Previous
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                  disabled={safePage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
