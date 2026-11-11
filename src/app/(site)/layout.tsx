import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radius — be a regular from day one",
  description:
    "Radius matches you into small, recurring neighborhood activities that are already running, so you're never the new person for long. Prototype preview.",
  openGraph: {
    title: "Radius — be a regular from day one",
    description: "Small, recurring neighborhood groups for people new to NYC. Try the prototype.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBF6EE",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
