"use client";

import { useEffect } from "react";

type Locale = "fr" | "en" | "ar" | "zh" | "tr";
type Translation = Record<Exclude<Locale, "fr">, string>;

const exact: Record<string, Translation> = {
  "Mes sorties": { en: "My outings", ar: "خروجي", zh: "我的外出", tr: "Çıkışlarım" },
  "Aide & infos": { en: "Help & info", ar: "المساعدة والمعلومات", zh: "帮助与信息", tr: "Yardım ve bilgiler" },
  "DEMAIN": { en: "TOMORROW", ar: "غداً", zh: "明天", tr: "YARIN" },
  "AUJOURD’HUI": { en: "TODAY", ar: "اليوم", zh: "今天", tr: "BUGÜN" },
  "AUJOURD'HUI": { en: "TODAY", ar: "اليوم", zh: "今天", tr: "BUGÜN" },
  "PROCHAIN REPAS": { en: "NEXT MEAL", ar: "الوجبة القادمة", zh: "下一餐", tr: "SONRAKİ ÖĞÜN" },
  "MÉDECIN RÉFÉRENT": { en: "PRIMARY DOCTOR", ar: "الطبيب المرجعي", zh: "主治医生", tr: "SORUMLU DOKTOR" },
  "Journée calme": { en: "Quiet day", ar: "يوم هادئ", zh: "轻松的一天", tr: "Sakin bir gün" },
  "Rien de prévu pour le moment.": { en: "Nothing scheduled for now.", ar: "لا شيء مجدول حالياً.", zh: "目前没有安排。", tr: "Şimdilik planlanmış bir şey yok." },
  "Tout voir": { en: "View all", ar: "عرض الكل", zh: "查看全部", tr: "Tümünü gör" },
  "Psychiatrie": { en: "Psychiatry", ar: "الطب النفسي", zh: "精神科", tr: "Psikiyatri" },
  "événement": { en: "event", ar: "حدث", zh: "事件", tr: "etkinlik" },
  "événements": { en: "events", ar: "أحداث", zh: "事件", tr: "etkinlik" },
  "absent prochainement": { en: "away soon", ar: "سيغيب قريباً", zh: "即将缺席", tr: "yakında izinli" },
  "Entrée le": { en: "Admitted on", ar: "تاريخ الدخول", zh: "入院日期", tr: "Yatış tarihi" },
  "Vous êtes présent dans l’établissement": { en: "You are currently in the facility", ar: "أنت موجود حالياً في المؤسسة", zh: "您目前在院", tr: "Şu anda kurumdasınız" },
  "Vous êtes présent dans l'etablissement": { en: "You are currently in the facility", ar: "أنت موجود حالياً في المؤسسة", zh: "您目前在院", tr: "Şu anda kurumdasınız" },
  "Voir demain": { en: "View tomorrow", ar: "عرض الغد", zh: "查看明天", tr: "Yarını gör" },
  "Mon planning": { en: "My schedule", ar: "جدولي", zh: "我的日程", tr: "Programım" },
  "Mes visites": { en: "My visits", ar: "زياراتي", zh: "我的探访", tr: "Ziyaretlerim" },
  "Mes activités": { en: "My activities", ar: "أنشطتي", zh: "我的活动", tr: "Etkinliklerim" },
  "Ma permission": { en: "My leave request", ar: "طلب خروجي", zh: "我的外出申请", tr: "İzin talebim" },
  "Demander ou gérer": { en: "Request or manage", ar: "طلب أو إدارة", zh: "申请或管理", tr: "Talep et veya yönet" },
  "Voir mes horaires": { en: "View my schedule", ar: "عرض جدولي", zh: "查看我的时间表", tr: "Programımı gör" },
  "M’inscrire / voir": { en: "Join / view", ar: "التسجيل / العرض", zh: "报名 / 查看", tr: "Katıl / görüntüle" },
  "Prévenir l’accueil": { en: "Notify reception", ar: "إبلاغ الاستقبال", zh: "通知接待处", tr: "Resepsiyona bildir" }
};

function currentLocale(): Locale {
  const value = document.documentElement.lang;
  if (value === "en" || value === "ar" || value === "tr") return value;
  if (value === "zh" || value === "zh-CN") return "zh";
  return "fr";
}

function preserveSpace(source: string, replacement: string) {
  const left = source.match(/^\s*/)?.[0] || "";
  const right = source.match(/\s*$/)?.[0] || "";
  return `${left}${replacement}${right}`;
}

function translateDynamic(source: string, lang: Exclude<Locale, "fr">) {
  const trimmed = source.trim();
  const direct = exact[trimmed]?.[lang];
  if (direct) return preserveSpace(source, direct);

  const hello = trimmed.match(/^Bonjour\s+(.+)$/u);
  if (hello) {
    const prefix = { en: "Hello", ar: "مرحباً", zh: "你好", tr: "Merhaba" }[lang];
    return preserveSpace(source, `${prefix} ${hello[1]}`);
  }

  const event = trimmed.match(/^(\d+)\s+événement(s?)$/u);
  if (event) {
    const count = event[1];
    const word = event[2] ? exact["événements"][lang] : exact["événement"][lang];
    return preserveSpace(source, `${count} ${word}`);
  }

  let result = source;
  for (const key of Object.keys(exact).sort((a, b) => b.length - a.length)) {
    if (result.includes(key)) result = result.split(key).join(exact[key][lang]);
  }
  return result;
}

function applyResidualTranslations() {
  const lang = currentLocale();
  if (lang === "fr") return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const parent = node.parentElement;
    if (parent && !parent.closest("[data-no-i18n]") && !["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) {
      const current = node.nodeValue || "";
      const translated = translateDynamic(current, lang);
      if (translated !== current) node.nodeValue = translated;
    }
    node = walker.nextNode() as Text | null;
  }
}

export function AuraLanguagePatch() {
  useEffect(() => {
    const timers: number[] = [];
    const run = () => {
      for (const delay of [0, 80, 250, 800, 1800]) {
        timers.push(window.setTimeout(applyResidualTranslations, delay));
      }
    };

    run();
    const observer = new MutationObserver(run);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] });

    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
