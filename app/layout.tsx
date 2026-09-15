import type { Metadata } from "next";
import { AuraLanguage } from "@/components/aura-language";
import { AuraLanguagePatch } from "@/components/aura-language-patch";
import { UxJourneyTracker } from "@/components/ux-journey-tracker";
import { PatientChromeEnhancer } from "@/components/patient-chrome-enhancer";
import "./globals.css";
import "./aura-polish.css";
import "./aurademo.css";
import "./aurademo-actions.css";
import "./consent.css";
import "./planning.css";
import "./patient-experience.css";
import "./patient-home-dense.css";
import "./operations.css";
import "./impact.css";
import "./language.css";
import "./final-demo-polish.css";
import "./final-demo-patch.css";
import "./hotfix-ux.css";
import "./reception-simplify.css";
import "./mobile-fix.css";
import "./ux-review.css";
import "./ux-simplify-v2.css";
import "./simplification.css";
import "./simplification-mobile-patch.css";
import "./tassadite.css";
import "./patient-inbox-header.css";
import "./doctor-epure.css";

export const metadata: Metadata = {
  title: "AURA Demo | Orchestration du séjour patient",
  description: "AURA relie patients, soignants, accueil et équipes opérationnelles pour simplifier et piloter le séjour en clinique.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body><AuraLanguage /><AuraLanguagePatch /><UxJourneyTracker /><PatientChromeEnhancer />{children}</body></html>;
}
