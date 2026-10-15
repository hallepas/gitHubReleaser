import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Release Dashboard",
  description: "Azure DevOps-style release overview for GitHub",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <Sidebar />
        <div className="flex min-h-full flex-col lg:pl-64">{children}</div>
      </body>
    </html>
  );
}
