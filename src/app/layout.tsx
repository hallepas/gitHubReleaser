import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Release Dashboard",
  description: "Azure DevOps-style release overview for GitHub",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white text-gray-900">{children}</body>
    </html>
  );
}
