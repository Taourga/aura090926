"use client";

import { useEffect, useState } from "react";

type Locale = "fr" | "en" | "ar" | "zh" | "tr";

type Copy = Record<Locale, string>;

const copy = {
  heroTitle: {
    fr: "Le système d’exploitation du séjour patient.",
    en: "The operating system for the patient stay.",
    ar: "نظام تشغيل رحلة إقامة المريض.",
    zh: "患者住院旅程的运营系统。",
    tr: "Hasta yatış sürecinin işletim sistemi."
  },
  heroLead: {
    fr: "AURA coordonne patients et équipes, réduit les processus manuels et le papier, améliore l’expérience du séjour et mesure la performance opérationnelle et environnementale de l’établissement.",
    en: "AURA coordinates patients and teams, reduces manual processes and paper, improves the stay experience, and measures the facility’s operational and environmental performance.",
    ar: "ينسّق AURA بين المرضى والفرق، ويقلل الإجراءات اليدوية والورق، ويحسن تجربة الإقامة ويقيس الأداء التشغيلي والبيئي للمؤسسة.",
    zh: "AURA 协调患者与团队，减少手工流程和纸张使用，改善住院体验，并衡量机构的运营与环境绩效。",
    tr: "AURA hastaları ve ekipleri koordine eder, manuel süreçleri ve kağıt kullanımını azaltır, yatış deneyimini iyileştirir ve kurumun operasyonel ve çevresel performansını ölçer."
  },
  requestDemo: {
    fr: "Demander une démonstration",
    en: "Request a demo",
    ar: "طلب عرض توضيحي",
    zh: "申请演示",
    tr: "Demo talep et"
  },
  discoverTwoMinutes: {
    fr: "Découvrir AURA en 2 minutes",
    en: "Discover AURA in 2 minutes",
    ar: "اكتشف AURA في دقيقتين",
    zh: "2 分钟了解 AURA",
    tr: "AURA'yı 2 dakikada keşfet"
  },
  valueTitle: {
    fr: "Quatre bénéfices. Une seule plateforme.",
    en: "Four benefits. One platform.",
    ar: "أربع فوائد. منصة واحدة.",
    zh: "四大价值，一个平台。",
    tr: "Dört fayda. Tek platform."
  },
  valueLead: {
    fr: "AURA masque la complexité technique pour ne montrer à chaque utilisateur que ce qui compte maintenant.",
    en: "AURA hides technical complexity so each user only sees what matters right now.",
    ar: "يخفي AURA التعقيد التقني ليعرض لكل مستخدم ما يهمه الآن فقط.",
    zh: "AURA 隐藏技术复杂度，让每位用户只看到当下真正重要的内容。",
    tr: "AURA teknik karmaşıklığı gizler ve her kullanıcıya yalnızca o anda önemli olanı gösterir."
  },
  pillarPatientTitle: {
    fr: "Expérience patient",
    en: "Patient experience",
    ar: "تجربة المريض",
    zh: "患者体验",
    tr: "Hasta deneyimi"
  },
  pillarPatientText: {
    fr: "Une journée lisible, des demandes simples et toutes les informations du séjour au même endroit.",
    en: "A clear day, simple requests, and all stay information in one place.",
    ar: "يوم واضح وطلبات بسيطة وجميع معلومات الإقامة في مكان واحد.",
    zh: "清晰的一天、简单的申请，以及集中在一处的住院信息。",
    tr: "Net bir günlük akış, kolay talepler ve tüm yatış bilgileri tek yerde."
  },
  pillarTeamTitle: {
    fr: "Coordination des équipes",
    en: "Team coordination",
    ar: "تنسيق الفرق",
    zh: "团队协同",
    tr: "Ekip koordinasyonu"
  },
  pillarTeamText: {
    fr: "Moins d’appels, moins de relances et une information partagée au bon rôle, au bon moment.",
    en: "Fewer calls, fewer follow-ups, and the right information shared with the right role at the right time.",
    ar: "اتصالات ومتابعات أقل، ومعلومة صحيحة تصل إلى الدور المناسب في الوقت المناسب.",
    zh: "更少电话、更少催办，让正确的信息在正确的时间到达正确的角色。",
    tr: "Daha az telefon, daha az takip ve doğru bilginin doğru zamanda doğru role ulaşması."
  },
  pillarPerformanceTitle: {
    fr: "Performance établissement",
    en: "Facility performance",
    ar: "أداء المؤسسة",
    zh: "机构绩效",
    tr: "Kurum performansı"
  },
  pillarPerformanceText: {
    fr: "Des flux tracés, des tâches mieux pilotées et des indicateurs lisibles pour la direction.",
    en: "Tracked workflows, better-managed tasks, and clear indicators for management.",
    ar: "مسارات موثقة ومهام أفضل إدارة ومؤشرات واضحة للإدارة.",
    zh: "可追踪流程、更高效的任务管理，以及面向管理层的清晰指标。",
    tr: "İzlenen süreçler, daha iyi yönetilen görevler ve yönetim için net göstergeler."
  },
  pillarImpactTitle: {
    fr: "Impact environnemental",
    en: "Environmental impact",
    ar: "الأثر البيئي",
    zh: "环境影响",
    tr: "Çevresel etki"
  },
  pillarImpactText: {
    fr: "Moins de papier et de démarches inutiles, avec des estimations transparentes et une méthodologie visible.",
    en: "Less paper and fewer unnecessary processes, with transparent estimates and a visible methodology.",
    ar: "ورق وإجراءات غير ضرورية أقل، مع تقديرات شفافة ومنهجية واضحة.",
    zh: "减少纸张和不必要流程，并提供透明估算与可查看的方法说明。",
    tr: "Daha az kağıt ve gereksiz işlem; şeffaf tahminler ve görünür bir metodoloji ile."
  },
  impactLead: {
    fr: "AURA Impact transforme les usages numériques en indicateurs simples de dématérialisation, de réduction des frictions et d’impact environnemental potentiel.",
    en: "AURA Impact turns digital usage into simple indicators for paperless processes, friction reduction, and potential environmental impact.",
    ar: "يحوّل AURA Impact الاستخدام الرقمي إلى مؤشرات بسيطة للرقمنة وتقليل الاحتكاك والأثر البيئي المحتمل.",
    zh: "AURA Impact 将数字化使用转化为无纸化、减少流程摩擦和潜在环境影响的简明指标。",
    tr: "AURA Impact dijital kullanımı; kağıtsızlaşma, sürtüşmenin azaltılması ve potansiyel çevresel etki için anlaşılır göstergelere dönüştürür."
  },
  demoDataNote: {
    fr: "Chiffres fictifs de démonstration. Les estimations CO₂e ne constituent pas un bilan carbone certifié.",
    en: "Fictitious demo figures. CO₂e estimates are not a certified carbon assessment.",
    ar: "أرقام تجريبية افتراضية. تقديرات مكافئ CO₂ ليست تقييماً كربونياً معتمداً.",
    zh: "演示数据为虚构值。CO₂e 估算不构成经认证的碳核算。",
    tr: "Rakamlar demo amaçlıdır. CO₂e tahminleri sertifikalı bir karbon bilançosu değildir."
  },
  pilotTitle: {
    fr: "Le prochain écran, c’est celui de votre établissement.",
    en: "The next screen is your facility’s.",
    ar: "الشاشة التالية هي شاشة مؤسستك.",
    zh: "下一个界面，就是您机构的界面。",
    tr: "Bir sonraki ekran sizin kurumunuza ait."
  },
  pilotLead: {
    fr: "Lancez un pilote AURA configuré selon vos rôles, vos règles, vos modules, vos langues et vos priorités de performance.",
    en: "Launch an AURA pilot configured around your roles, rules, modules, languages, and performance priorities.",
    ar: "أطلق تجربة AURA مهيأة وفق أدواركم وقواعدكم ووحداتكم ولغاتكم وأولويات الأداء لديكم.",
    zh: "启动按您的角色、规则、模块、语言和绩效重点配置的 AURA 试点。",
    tr: "Rollerinize, kurallarınıza, modüllerinize, dillerinize ve performans önceliklerinize göre yapılandırılmış bir AURA pilotu başlatın."
  },
  demoTitle: {
    fr: "Comprendre AURA en deux minutes.",
    en: "Understand AURA in two minutes.",
    ar: "تعرّف على AURA في دقيقتين.",
    zh: "两分钟了解 AURA。",
    tr: "AURA'yı iki dakikada anlayın."
  },
  demoLead: {
    fr: "De la journée du patient au pilotage de la direction : AURA simplifie le parcours, coordonne les équipes et rend visibles les gains opérationnels et environnementaux.",
    en: "From the patient’s day to management oversight, AURA simplifies the journey, coordinates teams, and makes operational and environmental gains visible.",
    ar: "من يوم المريض إلى متابعة الإدارة، يبسط AURA المسار وينسق الفرق ويجعل المكاسب التشغيلية والبيئية مرئية.",
    zh: "从患者日程到管理层驾驶舱，AURA 简化流程、协同团队，并让运营与环境价值清晰可见。",
    tr: "Hastanın gününden yönetim takibine kadar AURA süreci sadeleştirir, ekipleri koordine eder ve operasyonel ile çevresel kazanımları görünür kılar."
  },
  demoGainTitle: {
    fr: "Ce que la clinique gagne",
    en: "What the clinic gains",
    ar: "ما الذي تكسبه العيادة",
    zh: "诊所获得什么",
    tr: "Kliniğin kazancı"
  },
  performanceImpactTitle: {
    fr: "Performance & impact responsable",
    en: "Performance & responsible impact",
    ar: "الأداء والأثر المسؤول",
    zh: "绩效与负责任影响",
    tr: "Performans ve sorumlu etki"
  },
  performanceImpactLead: {
    fr: "Réunir dans une même lecture la performance opérationnelle, la dématérialisation et les indicateurs environnementaux potentiels.",
    en: "Bring operational performance, paperless progress, and potential environmental indicators into one view.",
    ar: "جمع الأداء التشغيلي والتقدم في الرقمنة والمؤشرات البيئية المحتملة في عرض واحد.",
    zh: "在同一视图中汇总运营绩效、无纸化进展和潜在环境指标。",
    tr: "Operasyonel performansı, kağıtsızlaşmayı ve potansiyel çevresel göstergeleri tek görünümde birleştirin."
  },
  impactOps: {
    fr: "Opérations",
    en: "Operations",
    ar: "العمليات",
    zh: "运营",
    tr: "Operasyon"
  },
  impactOpsText: {
    fr: "Moins de tâches manuelles et davantage de flux tracés.",
    en: "Fewer manual tasks and more tracked workflows.",
    ar: "مهام يدوية أقل ومسارات موثقة أكثر.",
    zh: "减少手工作业，增加可追踪流程。",
    tr: "Daha az manuel görev ve daha fazla izlenebilir süreç."
  },
  impactRse: {
    fr: "RSE",
    en: "ESG",
    ar: "الاستدامة",
    zh: "ESG",
    tr: "Sürdürülebilirlik"
  },
  impactRseText: {
    fr: "Des indicateurs de dématérialisation et d’impact à suivre dans le temps.",
    en: "Paperless and impact indicators that can be tracked over time.",
    ar: "مؤشرات للرقمنة والأثر يمكن متابعتها مع الوقت.",
    zh: "可随时间持续跟踪的无纸化与影响指标。",
    tr: "Zaman içinde izlenebilen kağıtsızlaşma ve etki göstergeleri."
  },
  impactDirection: {
    fr: "Direction",
    en: "Management",
    ar: "الإدارة",
    zh: "管理层",
    tr: "Yönetim"
  },
  impactDirectionText: {
    fr: "Une preuve lisible de la transformation numérique réellement engagée.",
    en: "A clear view of the digital transformation actually underway.",
    ar: "دليل واضح على التحول الرقمي الجاري فعلياً.",
    zh: "清晰呈现真正落地的数字化转型。",
    tr: "Gerçekten hayata geçen dijital dönüşümün net bir göstergesi."
  },
  more: {
    fr: "Plus",
    en: "More",
    ar: "المزيد",
    zh: "更多",
    tr: "Daha fazla"
  }
} satisfies Record<string, Copy>;

export type AuraCopyKey = keyof typeof copy;

export function AuraCopy({ id, className }: { id: AuraCopyKey; className?: string }) {
  const [locale, setLocale] = useState<Locale>("fr");

  useEffect(() => {
    const syncLocale = () => {
      const candidate = (document.body.dataset.auraLocale || window.localStorage.getItem("aura-language") || "fr") as Locale;
      if (["fr", "en", "ar", "zh", "tr"].includes(candidate)) setLocale(candidate);
    };
    syncLocale();
    const observer = new MutationObserver(syncLocale);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-aura-locale"] });
    return () => observer.disconnect();
  }, []);

  return <span className={className} data-no-i18n>{copy[id][locale]}</span>;
}
