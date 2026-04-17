import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Preschool Listening Screen Prototype",
  description:
    "Mobile-first prototype for a non-diagnostic preschool listening-risk screening workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--color-background)] text-[var(--color-foreground)]">
        {children}
      </body>
    </html>
  );
}
