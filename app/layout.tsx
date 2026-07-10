import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentryline — Security posture, always in view",
  description:
    "Scan your web and mobile applications for common security misconfigurations, then track and resolve findings over time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
