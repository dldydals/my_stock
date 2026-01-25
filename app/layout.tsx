import type { Metadata } from "next";
import "./globals.css";
import DashboardLayout from "../components/layout/DashboardLayout";

export const metadata: Metadata = {
  title: "My Stock Portfolio",
  description: "High-density asset management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="dark">
      <body className="antialiased font-sans">
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </body>
    </html>
  );
}
