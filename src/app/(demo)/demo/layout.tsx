import type { Metadata, Viewport } from "next";
import "./demo.css";

export const metadata: Metadata = {
  title: "Radius — prototype",
  description: "Interactive Radius prototype (sample data).",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f4ed" };

// Separate root layout so the prototype's styles never mix with the experiment site's styles.
export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
