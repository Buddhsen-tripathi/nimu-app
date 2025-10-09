import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nimu App",
  description: "Nimu App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
