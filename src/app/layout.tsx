/**
 * INDIA'S JOURNEY BEYOND EARTH — Root Layout
 *
 * Fonts: all four faces (Orbitron/display, Space Grotesk/UI+body, IBM Plex
 * Mono/technical) are self-hosted local @font-face declarations from
 * public/fonts/ — see the "Local fonts" block in globals.css. There is no
 * next/font/google usage and no runtime or build-time request to Google
 * Fonts anywhere in the site; only the OFL-licensed files in public/fonts/
 * are used, and no restricted/trial fonts are referenced.
 */
import type { Metadata } from "next";
import "./globals.css";
import { JourneyProvider } from "@/components/providers/JourneyProvider";
import { Navigation } from "@/components/ui/Navigation";

export const metadata: Metadata = {
  title: "Stellar Path — Interactive 3D Space History",
  description:
    "Travel through India's space history in an immersive scroll-controlled 3D journey — from Aryabhata to Chandrayaan-3 and beyond.",
  keywords: ["ISRO", "India space", "satellite", "3D", "Chandrayaan", "Aryabhata", "Mars Orbiter", "Stellar Path"],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Stellar Path",
    description: "An interactive 3D visualization of India's satellite and space-mission history.",
    type: "website",
    locale: "en-IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      {/* suppressHydrationWarning: browser extensions like Grammarly inject
          attributes (data-new-gr-c-s-check-loaded, data-gr-ext-installed)
          onto <body> before React hydrates, causing a false-positive
          hydration mismatch warning that isn't an actual app bug — the
          extension modifies the DOM outside of React's control. This is
          the standard, narrowly-scoped fix (only suppresses the warning
          for this one element's attributes, not for its children/content). */}
      <body
        suppressHydrationWarning
        className="font-body antialiased"
      >
        <JourneyProvider>
          <Navigation />
          {children}
        </JourneyProvider>
      </body>
    </html>
  );
}
