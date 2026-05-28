import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Detail Planner",
  description: "Frontend-only personal detail planner with PDF uploads"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
