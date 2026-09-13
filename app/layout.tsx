import type { Metadata } from "next";
import "./globals.css";
import "./aura-polish.css";
import "./aurademo.css";
import "./aurademo-actions.css";
import "./consent.css";
import "./planning.css";
import "./patient-experience.css";
import "./operations.css";
import "./final-demo-polish.css";

export const metadata: Metadata = {
  title: "AURA Demo | Orchestration du séjour patient",
  description: "AURA relie patients, soignants, accueil et équipes opérationnelles pour simplifier et piloter le séjour en clinique.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
