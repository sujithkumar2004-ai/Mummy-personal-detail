import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Number Saving Platform",
  description: "Professional Next.js and Prisma number registry backed by MySQL"
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
