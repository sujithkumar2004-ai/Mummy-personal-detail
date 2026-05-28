"use client";

import { FormEvent, useMemo, useState } from "react";

type Detail = {
  id: number;
  name: string;
  dob: string;
  phone: string;
  pdfName: string;
};

const LOGIN_ID = "SL001";
const LOGIN_PASSWORD = "SL001@123";

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

  const nextNumber = useMemo(() => details.length + 1, [details.length]);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loginId === LOGIN_ID && password === LOGIN_PASSWORD) {
      setIsLoggedIn(true);
      setLoginError("");
      return;
    }

    setLoginError("Invalid login credentials");
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !dob || !phone.trim() || !pdf) {
      return;
    }

    setDetails((currentDetails) => [
      ...currentDetails,
      {
        id: Date.now(),
        name: name.trim(),
        dob,
        phone: phone.trim(),
        pdfName: pdf.name
      }
    ]);

    setName("");
    setDob("");
    setPhone("");
    setPdf(null);
    event.currentTarget.reset();
  }

  if (!isLoggedIn) {
    return (
      <main className="login-page">
        <section className="login-panel" aria-label="Login">
          <div>
            <p className="eyebrow">Secure entry</p>
            <h1>Personal Detail Planner</h1>
            <p className="subtext">Sign in to add and view personal detail records.</p>
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
          <p className="eyebrow">Details</p>
          <h1>Personal Detail Planner</h1>
        </div>
        <button
          className="logout-button"
          type="button"
          onClick={() => {
            setIsLoggedIn(false);
            setLoginId("");
            setPassword("");
          }}
        >
          Logout
        </button>
      </header>

      <section className="entry-panel" aria-label="Add personal detail">
        <form className="detail-form" onSubmit={handleAdd}>
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
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setPdf(event.target.files?.[0] ?? null)}
              required
            />
          </label>

          <button type="submit">Add</button>
        </form>
      </section>

      <section className="records-section" aria-label="Saved records">
        <div className="records-header">
          <h2>Saved Details</h2>
          <span>{details.length} records</span>
        </div>

        {details.length === 0 ? (
          <div className="empty-state">
            <p>No details added yet.</p>
            <span>Your first entry will appear as row {nextNumber}.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>DOB</th>
                  <th>Name</th>
                  <th>Phone Number</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {details.map((detail) => (
                  <tr key={detail.id}>
                    <td>{detail.dob}</td>
                    <td>{detail.name}</td>
                    <td>{detail.phone}</td>
                    <td>{detail.pdfName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
