import type { Metadata, Viewport } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: { default: "Promise Tracker GH", template: "%s · Promise Tracker GH" },
  description:
    "Track what Ghana's MPs, Ministers, MMDCEs and Assembly Members promised, see the evidence, and confirm it as a resident.",
};

export const viewport: Viewport = { themeColor: "#006B3F" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
