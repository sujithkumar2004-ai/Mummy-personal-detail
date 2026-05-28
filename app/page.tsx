"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Detail = {
  id: number;
  name: string;
  dob: string;
  phone: string;
  pdfName: string;
  pdfUrl: string;
};

const LOGIN_ID = "SL001";
const LOGIN_PASSWORD = "SL001@123";
const PAGE_SIZE = 5;

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [details, setDetails] = useState<Detail[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentPdfName, setCurrentPdfName] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfUrlsRef = useRef<Set<string>>(new Set());

  const isEditing = editingId !== null;

  const filteredDetails = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return details;
    }

    return details.filter((detail) => {
      return (
        detail.name.toLowerCase().includes(query) ||
        detail.phone.toLowerCase().includes(query)
      );
    });
  }, [details, search]);

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
    return () => {
      pdfUrlsRef.current.forEach((pdfUrl) => URL.revokeObjectURL(pdfUrl));
    };
  }, []);

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
    setPdf(null);
    setEditingId(null);
    setCurrentPdfName("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !dob || !phone.trim() || (!pdf && !isEditing)) {
      return;
    }

    if (isEditing) {
      const replacementPdfUrl = pdf ? URL.createObjectURL(pdf) : "";

      if (replacementPdfUrl) {
        pdfUrlsRef.current.add(replacementPdfUrl);
      }

      setDetails((currentDetails) =>
        currentDetails.map((detail) => {
          if (detail.id !== editingId) {
            return detail;
          }

          if (pdf) {
            URL.revokeObjectURL(detail.pdfUrl);
            pdfUrlsRef.current.delete(detail.pdfUrl);
          }

          return {
            ...detail,
            name: name.trim(),
            dob,
            phone: phone.trim(),
            pdfName: pdf?.name ?? detail.pdfName,
            pdfUrl: replacementPdfUrl || detail.pdfUrl
          };
        })
      );
      resetForm();
      return;
    }

    if (!pdf) {
      return;
    }

    const pdfUrl = URL.createObjectURL(pdf);
    pdfUrlsRef.current.add(pdfUrl);

    setDetails((currentDetails) => [
      {
        id: Date.now(),
        name: name.trim(),
        dob,
        phone: phone.trim(),
        pdfName: pdf.name,
        pdfUrl
      },
      ...currentDetails
    ]);

    resetForm();
  }

  function startEdit(detail: Detail) {
    setEditingId(detail.id);
    setName(detail.name);
    setDob(detail.dob);
    setPhone(detail.phone);
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
    resetForm();
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
          <h1>Detail Planner</h1>
          <p className="topbar-copy">Add, find, edit, and view uploaded PDFs in one place.</p>
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

          <button type="submit">{isEditing ? "Update" : "Add"}</button>
        </form>
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
              placeholder="Search name or number"
            />
          </label>
        </div>

        {details.length === 0 ? (
          <div className="empty-state">
            <p>No details added yet.</p>
            <span>Your first entry will appear here after upload.</span>
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
                      <td>{detail.dob}</td>
                      <td>{detail.phone}</td>
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
