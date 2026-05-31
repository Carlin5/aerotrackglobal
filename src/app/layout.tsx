import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AeroTrack Pro — Global Cargo Flight Tracking",
  description:
    "Real-time cargo flight tracking with great-circle route visualization, 3D globe, and detailed shipment intelligence.",
  applicationName: "AeroTrack Pro",
};

export const viewport: Viewport = {
  themeColor: "#03060B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
