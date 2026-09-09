import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AURA | Portail de séjour",
  description: "Portail sécurisé pour patients et équipes de clinique.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
