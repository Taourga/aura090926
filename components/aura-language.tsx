"use client";

import { useEffect, useRef, useState } from "react";

type Locale = "fr" | "en" | "ar" | "zh" | "tr";
type Translation = Record<Exclude<Locale, "fr">, string>;

const locales: Array<{ code: Locale; label: string; native: string }> = [
  { code: "fr", label: "Français", native: "FR" },
  { code: "en", label: "English", native: "EN" },
  { code: "ar", label: "العربية", native: "AR" },
  { code: "zh", label: "中文", native: "中文" },
  { code: "tr", label: "Türkçe", native: "TR" },
];

const t: Record<string, Translation> = {
  "Accueil": { en: "Home", ar: "الرئيسية", zh: "首页", tr: "Ana sayfa" },
  "Réception": { en: "Reception", ar: "الاستقبال", zh: "接待", tr: "Resepsiyon" },
  "Mes patients": { en: "My patients", ar: "مرضاي", zh: "我的患者", tr: "Hastalarım" },
  "Permissions": { en: "Leave requests", ar: "طلبات الخروج", zh: "外出申请", tr: "İzin talepleri" },
  "Mes permissions": { en: "My leave requests", ar: "طلبات خروجي", zh: "我的外出申请", tr: "İzin taleplerim" },
  "Planning": { en: "Schedule", ar: "الجدول", zh: "日程", tr: "Program" },
  "Mon planning": { en: "My schedule", ar: "جدولي", zh: "我的日程", tr: "Programım" },
  "Activités": { en: "Activities", ar: "الأنشطة", zh: "活动", tr: "Etkinlikler" },
  "Visites": { en: "Visits", ar: "الزيارات", zh: "探访", tr: "Ziyaretler" },
  "Messages": { en: "Messages", ar: "الرسائل", zh: "消息", tr: "Mesajlar" },
  "Mes contacts": { en: "My contacts", ar: "جهات اتصالي", zh: "我的联系人", tr: "Kişilerim" },
  "Menus": { en: "Menus", ar: "القوائم", zh: "菜单", tr: "Menüler" },
  "Infos pratiques": { en: "Useful information", ar: "معلومات عملية", zh: "实用信息", tr: "Pratik bilgiler" },
  "Hôtellerie": { en: "Hospitality", ar: "الخدمات الفندقية", zh: "住院服务", tr: "Konaklama hizmetleri" },
  "Réglages": { en: "Settings", ar: "الإعدادات", zh: "设置", tr: "Ayarlar" },
  "Plus": { en: "More", ar: "المزيد", zh: "更多", tr: "Daha fazla" },
  "Retour accueil": { en: "Back home", ar: "العودة للرئيسية", zh: "返回首页", tr: "Ana sayfaya dön" },
  "Retour à l’accueil": { en: "Back home", ar: "العودة للرئيسية", zh: "返回首页", tr: "Ana sayfaya dön" },
  "Se déconnecter": { en: "Sign out", ar: "تسجيل الخروج", zh: "退出登录", tr: "Çıkış yap" },
  "Déconnexion": { en: "Sign out", ar: "تسجيل الخروج", zh: "退出登录", tr: "Çıkış yap" },

  "À FAIRE MAINTENANT": { en: "TO DO NOW", ar: "ما يجب فعله الآن", zh: "现在待办", tr: "ŞİMDİ YAPILACAKLAR" },
  "À faire maintenant": { en: "To do now", ar: "ما يجب فعله الآن", zh: "现在待办", tr: "Şimdi yapılacaklar" },
  "3 repères utiles": { en: "3 useful indicators", ar: "3 مؤشرات مفيدة", zh: "3 个实用指标", tr: "3 faydalı gösterge" },
  "repères utiles": { en: "useful indicators", ar: "مؤشرات مفيدة", zh: "实用指标", tr: "faydalı göstergeler" },
  "permissions à décider": { en: "leave requests to decide", ar: "طلبات خروج تحتاج قراراً", zh: "待审批外出申请", tr: "karar bekleyen izin talepleri" },
  "prochain RDV": { en: "next appointment", ar: "الموعد القادم", zh: "下一次预约", tr: "sonraki randevu" },
  "Prochain RDV": { en: "Next appointment", ar: "الموعد القادم", zh: "下一次预约", tr: "Sonraki randevu" },
  "passages d’étage": { en: "floor rounds", ar: "جولات الطابق", zh: "楼层巡视", tr: "kat turları" },
  "passages d'etage": { en: "floor rounds", ar: "جولات الطابق", zh: "楼层巡视", tr: "kat turları" },
  "Ouvrir": { en: "Open", ar: "فتح", zh: "打开", tr: "Aç" },
  "DÉCISIONS": { en: "DECISIONS", ar: "القرارات", zh: "决策", tr: "KARARLAR" },
  "Décisions": { en: "Decisions", ar: "القرارات", zh: "决策", tr: "Kararlar" },
  "Permissions en attente": { en: "Pending leave requests", ar: "طلبات خروج معلقة", zh: "待处理外出申请", tr: "Bekleyen izin talepleri" },
  "Leave requests en attente": { en: "Pending leave requests", ar: "طلبات خروج معلقة", zh: "待处理外出申请", tr: "Bekleyen izin talepleri" },
  "SCHEDULE": { en: "SCHEDULE", ar: "الجدول", zh: "日程", tr: "PROGRAM" },
  "Prochains patients": { en: "Upcoming patients", ar: "المرضى القادمون", zh: "下一批患者", tr: "Sıradaki hastalar" },
  "Schedule": { en: "Schedule", ar: "الجدول", zh: "日程", tr: "Program" },
  "Départ": { en: "Departure", ar: "المغادرة", zh: "离院", tr: "Çıkış" },
  "Retour": { en: "Return", ar: "العودة", zh: "返回", tr: "Dönüş" },
  "Valider": { en: "Approve", ar: "موافقة", zh: "批准", tr: "Onayla" },
  "Refuser": { en: "Reject", ar: "رفض", zh: "拒绝", tr: "Reddet" },
  "Motif non renseigné": { en: "Reason not provided", ar: "السبب غير مذكور", zh: "未填写原因", tr: "Gerekçe belirtilmedi" },
  "rendez-vous extérieur": { en: "external appointment", ar: "موعد خارجي", zh: "院外预约", tr: "dış randevu" },
  "promenade avec proche": { en: "walk with a relative", ar: "نزهة مع قريب", zh: "与亲属散步", tr: "yakınla yürüyüş" },

  "Coordonnées": { en: "Contact details", ar: "بيانات الاتصال", zh: "联系方式", tr: "İletişim bilgileri" },
  "Personne de confiance": { en: "Trusted contact", ar: "الشخص الموثوق", zh: "信任联系人", tr: "Güvenilir kişi" },
  "Portail actif": { en: "Portal active", ar: "البوابة مفعلة", zh: "门户已启用", tr: "Portal aktif" },
  "Contact uniquement": { en: "Contact only", ar: "اتصال فقط", zh: "仅联系人", tr: "Yalnızca iletişim" },
  "Prochainement": { en: "Upcoming", ar: "قريباً", zh: "即将进行", tr: "Yaklaşan" },
  "Voir tout": { en: "View all", ar: "عرض الكل", zh: "查看全部", tr: "Tümünü gör" },
  "Traiter": { en: "Review", ar: "معالجة", zh: "处理", tr: "İşle" },
  "En attente de validation": { en: "Awaiting approval", ar: "بانتظار الموافقة", zh: "等待审批", tr: "Onay bekliyor" },
  "En attente": { en: "Pending", ar: "قيد الانتظار", zh: "待处理", tr: "Bekliyor" },
  "Validée": { en: "Approved", ar: "تمت الموافقة", zh: "已批准", tr: "Onaylandı" },
  "Validé": { en: "Approved", ar: "تمت الموافقة", zh: "已批准", tr: "Onaylandı" },
  "En cours": { en: "In progress", ar: "قيد التنفيذ", zh: "进行中", tr: "Devam ediyor" },
  "À traiter": { en: "To review", ar: "للمعالجة", zh: "待处理", tr: "İşlenecek" },
  "Aucune": { en: "None", ar: "لا يوجد", zh: "无", tr: "Yok" },
  "Aucun": { en: "None", ar: "لا يوجد", zh: "无", tr: "Yok" },
  "Refusée": { en: "Rejected", ar: "مرفوض", zh: "已拒绝", tr: "Reddedildi" },
  "Refusé": { en: "Rejected", ar: "مرفوض", zh: "已拒绝", tr: "Reddedildi" },
  "Présent": { en: "Present", ar: "موجود", zh: "在院", tr: "Mevcut" },
  "Sorti": { en: "Away", ar: "خارج المؤسسة", zh: "离院", tr: "Dışarıda" },
  "Hors établissement": { en: "Outside facility", ar: "خارج المؤسسة", zh: "院外", tr: "Kurum dışında" },
  "Contact d’urgence": { en: "Emergency contact", ar: "جهة اتصال للطوارئ", zh: "紧急联系人", tr: "Acil durum kişisi" },
  "Frère": { en: "Brother", ar: "أخ", zh: "兄弟", tr: "Erkek kardeş" },
  "Sœur": { en: "Sister", ar: "أخت", zh: "姐妹", tr: "Kız kardeş" },
  "Père": { en: "Father", ar: "أب", zh: "父亲", tr: "Baba" },
  "Mère": { en: "Mother", ar: "أم", zh: "母亲", tr: "Anne" },
  "Conjoint": { en: "Partner", ar: "الزوج/الزوجة", zh: "配偶", tr: "Eş" },

  "Médecin référent": { en: "Primary doctor", ar: "الطبيب المرجعي", zh: "主治医生", tr: "Sorumlu doktor" },
  "Fiche patient": { en: "Patient record", ar: "ملف المريض", zh: "患者档案", tr: "Hasta kaydı" },
  "Chambre": { en: "Room", ar: "الغرفة", zh: "房间", tr: "Oda" },
  "Message": { en: "Message", ar: "رسالة", zh: "消息", tr: "Mesaj" },
  "Sortie prévue": { en: "Planned discharge", ar: "الخروج المقرر", zh: "计划出院", tr: "Planlanan taburcu" },
  "Non prévue": { en: "Not planned", ar: "غير مقرر", zh: "未计划", tr: "Planlanmadı" },
  "Téléphone non renseigné": { en: "Phone not provided", ar: "رقم الهاتف غير مذكور", zh: "未填写电话", tr: "Telefon belirtilmedi" },
  "Email non renseigné": { en: "Email not provided", ar: "البريد الإلكتروني غير مذكور", zh: "未填写邮箱", tr: "E-posta belirtilmedi" },
  "Adresse non renseignée": { en: "Address not provided", ar: "العنوان غير مذكور", zh: "未填写地址", tr: "Adres belirtilmedi" },
  "Non renseignée": { en: "Not provided", ar: "غير مذكور", zh: "未填写", tr: "Belirtilmedi" },
  "Non renseigné": { en: "Not provided", ar: "غير مذكور", zh: "未填写", tr: "Belirtilmedi" },
  "Lieu à confirmer": { en: "Location to be confirmed", ar: "المكان قيد التأكيد", zh: "地点待确认", tr: "Konum onaylanacak" },
  "Aucun rendez-vous à venir.": { en: "No upcoming appointments.", ar: "لا توجد مواعيد قادمة.", zh: "暂无后续预约。", tr: "Yaklaşan randevu yok." },
  "Aucune permission.": { en: "No leave request.", ar: "لا توجد طلبات خروج.", zh: "无外出申请。", tr: "İzin talebi yok." },
  "Plus d’informations": { en: "More information", ar: "معلومات إضافية", zh: "更多信息", tr: "Daha fazla bilgi" },
  "Activités inscrites": { en: "Registered activities", ar: "الأنشطة المسجلة", zh: "已报名活动", tr: "Kayıtlı etkinlikler" },
  "Aucune activité.": { en: "No activity.", ar: "لا توجد أنشطة.", zh: "暂无活动。", tr: "Etkinlik yok." },
  "Partage avec le proche": { en: "Sharing with relative", ar: "المشاركة مع القريب", zh: "与亲属共享", tr: "Yakınla paylaşım" },

  "Ma journée": { en: "My day", ar: "يومي", zh: "我的一天", tr: "Günüm" },
  "Bonjour": { en: "Hello", ar: "مرحباً", zh: "你好", tr: "Merhaba" },
  "AUJOURD’HUI": { en: "TODAY", ar: "اليوم", zh: "今天", tr: "BUGÜN" },
  "DEMAIN": { en: "TOMORROW", ar: "غداً", zh: "明天", tr: "YARIN" },
  "Journée calme": { en: "Quiet day", ar: "يوم هادئ", zh: "轻松的一天", tr: "Sakin bir gün" },
  "Tout voir": { en: "View all", ar: "عرض الكل", zh: "查看全部", tr: "Tümünü gör" },
  "Rien de prévu pour le moment.": { en: "Nothing scheduled for now.", ar: "لا شيء مجدول حالياً.", zh: "目前没有安排。", tr: "Şimdilik planlanmış bir şey yok." },
  "Voir demain": { en: "View tomorrow", ar: "عرض الغد", zh: "查看明天", tr: "Yarını gör" },
  "PROCHAIN REPAS": { en: "NEXT MEAL", ar: "الوجبة القادمة", zh: "下一餐", tr: "SONRAKİ ÖĞÜN" },
  "Petit-déjeuner": { en: "Breakfast", ar: "الإفطار", zh: "早餐", tr: "Kahvaltı" },
  "Déjeuner": { en: "Lunch", ar: "الغداء", zh: "午餐", tr: "Öğle yemeği" },
  "Dîner": { en: "Dinner", ar: "العشاء", zh: "晚餐", tr: "Akşam yemeği" },
  "Menu à confirmer": { en: "Menu to be confirmed", ar: "القائمة قيد التأكيد", zh: "菜单待确认", tr: "Menü onaylanacak" },
  "MÉDECIN RÉFÉRENT": { en: "PRIMARY DOCTOR", ar: "الطبيب المرجعي", zh: "主治医生", tr: "SORUMLU DOKTOR" },
  "Demander ou gérer": { en: "Request or manage", ar: "طلب أو إدارة", zh: "申请或管理", tr: "Talep et veya yönet" },
  "Voir mes horaires": { en: "View my schedule", ar: "عرض جدولي", zh: "查看我的时间表", tr: "Programımı gör" },
  "M’inscrire / voir": { en: "Join / view", ar: "التسجيل / العرض", zh: "报名 / 查看", tr: "Katıl / görüntüle" },
  "Prévenir l’accueil": { en: "Notify reception", ar: "إبلاغ الاستقبال", zh: "通知接待处", tr: "Resepsiyona bildir" },
  "Sortie prévue aujourd’hui": { en: "Discharge planned today", ar: "الخروج مقرر اليوم", zh: "计划今天出院", tr: "Taburcu bugün planlandı" },
  "Préparer ma sortie": { en: "Prepare my discharge", ar: "الاستعداد للخروج", zh: "准备出院", tr: "Taburcumu hazırla" },
  "Citation du jour": { en: "Quote of the day", ar: "اقتباس اليوم", zh: "每日一句", tr: "Günün sözü" },
  "Document administratif": { en: "Administrative document", ar: "وثيقة إدارية", zh: "行政文件", tr: "İdari belge" },
  "Bulletin de situation": { en: "Status certificate", ar: "شهادة وضعية", zh: "住院情况证明", tr: "Durum belgesi" },
  "Autres services": { en: "Other services", ar: "خدمات أخرى", zh: "其他服务", tr: "Diğer hizmetler" },
  "Infos utiles": { en: "Useful information", ar: "معلومات مفيدة", zh: "实用信息", tr: "Faydalı bilgiler" },

  "Entretien diététique": { en: "Dietitian appointment", ar: "موعد مع أخصائي التغذية", zh: "营养师咨询", tr: "Diyetisyen görüşmesi" },
  "Bureau nutrition": { en: "Nutrition office", ar: "مكتب التغذية", zh: "营养办公室", tr: "Beslenme ofisi" },
  "Point médical": { en: "Medical review", ar: "مراجعة طبية", zh: "医疗评估", tr: "Tıbbi değerlendirme" },
  "Bureau médical": { en: "Medical office", ar: "العيادة الطبية", zh: "医疗办公室", tr: "Tıbbi ofis" },
  "Entretien de suivi": { en: "Follow-up appointment", ar: "موعد متابعة", zh: "随访", tr: "Takip görüşmesi" },
  "Bureau": { en: "Office", ar: "مكتب", zh: "办公室", tr: "Ofis" },

  "AURA Impact · Démonstration": { en: "AURA Impact · Demo", ar: "AURA Impact · عرض تجريبي", zh: "AURA Impact · 演示", tr: "AURA Impact · Demo" },
  "Données de démonstration": { en: "Demo data", ar: "بيانات تجريبية", zh: "演示数据", tr: "Demo verileri" },
  "DOCUMENTS NUMÉRIQUES": { en: "DIGITAL DOCUMENTS", ar: "المستندات الرقمية", zh: "数字文档", tr: "DİJİTAL BELGELER" },
  "PAGES ÉVITÉES · EST.": { en: "PAGES AVOIDED · EST.", ar: "صفحات تم تجنبها · تقديري", zh: "减少纸张页数 · 估算", tr: "ÖNLENEN SAYFALAR · TAH." },
  "ÉCHANGES NUMÉRIQUES": { en: "DIGITAL INTERACTIONS", ar: "التفاعلات الرقمية", zh: "数字互动", tr: "DİJİTAL ETKİLEŞİMLER" },
  "DÉPLACEMENTS ÉVITÉS · EST.": { en: "TRIPS AVOIDED · EST.", ar: "تنقلات تم تجنبها · تقديري", zh: "减少出行 · 估算", tr: "ÖNLENEN YOLCULUKLAR · TAH." },
  "CO₂e ÉVITÉ · EST.": { en: "CO₂e AVOIDED · EST.", ar: "مكافئ CO₂ المتجنب · تقديري", zh: "减少 CO₂e · 估算", tr: "ÖNLENEN CO₂e · TAH." },
  "Tendance": { en: "Trend", ar: "الاتجاه", zh: "趋势", tr: "Eğilim" },
  "Progression sur 6 mois": { en: "6-month progress", ar: "التقدم خلال 6 أشهر", zh: "6个月进展", tr: "6 aylık ilerleme" },
  "Leviers": { en: "Drivers", ar: "العوامل", zh: "驱动因素", tr: "Etkileyen faktörler" },
  "Valeur établissement": { en: "Facility value", ar: "قيمة للمؤسسة", zh: "机构价值", tr: "Kurum değeri" },
  "Mesurer": { en: "Measure", ar: "قياس", zh: "衡量", tr: "Ölç" },
  "Réduire": { en: "Reduce", ar: "خفض", zh: "减少", tr: "Azalt" },
  "Valoriser": { en: "Showcase", ar: "إبراز القيمة", zh: "价值展示", tr: "Değer yarat" },

  "janv.": { en: "Jan", ar: "يناير", zh: "1月", tr: "Oca" },
  "févr.": { en: "Feb", ar: "فبراير", zh: "2月", tr: "Şub" },
  "mars": { en: "Mar", ar: "مارس", zh: "3月", tr: "Mar" },
  "avr.": { en: "Apr", ar: "أبريل", zh: "4月", tr: "Nis" },
  "mai": { en: "May", ar: "مايو", zh: "5月", tr: "May" },
  "juin": { en: "Jun", ar: "يونيو", zh: "6月", tr: "Haz" },
  "juil.": { en: "Jul", ar: "يوليو", zh: "7月", tr: "Tem" },
  "août": { en: "Aug", ar: "أغسطس", zh: "8月", tr: "Ağu" },
  "sept.": { en: "Sep", ar: "سبتمبر", zh: "9月", tr: "Eyl" },
  "oct.": { en: "Oct", ar: "أكتوبر", zh: "10月", tr: "Eki" },
  "nov.": { en: "Nov", ar: "نوفمبر", zh: "11月", tr: "Kas" },
  "déc.": { en: "Dec", ar: "ديسمبر", zh: "12月", tr: "Ara" },
};

const originalText = new WeakMap<Text, string>();
const originalAttrs = new WeakMap<Element, Record<string, string>>();
const sortedKeys = Object.keys(t).sort((a, b) => b.length - a.length);

function looksLikeUserData(value: string) {
  const v = value.trim();
  if (!v) return true;
  if (/\S+@\S+\.\S+/.test(v)) return true;
  if (/^\+?[\d\s().-]{7,}$/.test(v)) return true;
  if (/^[A-ZÀ-ÖØ-Ý][\p{L}'’-]+(?:\s+[A-ZÀ-ÖØ-Ý][\p{L}'’-]+){1,3}$/u.test(v) && !t[v]) return true;
  return false;
}

function translateString(source: string, locale: Locale) {
  if (locale === "fr" || !source.trim() || looksLikeUserData(source)) return source;
  const trimmed = source.trim();
  const exact = t[trimmed]?.[locale];
  if (exact) {
    const start = source.indexOf(trimmed);
    return `${source.slice(0, start)}${exact}${source.slice(start + trimmed.length)}`;
  }
  let result = source;
  for (const key of sortedKeys) {
    const translated = t[key]?.[locale];
    if (translated && result.includes(key)) result = result.split(key).join(translated);
  }
  return result;
}

function translateElement(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const parent = node.parentElement;
    if (parent && !parent.closest("script,style,[data-no-i18n],input,textarea,select,option")) {
      const source = originalText.get(node) ?? node.nodeValue ?? "";
      if (!originalText.has(node)) originalText.set(node, source);
      const translated = translateString(source, locale);
      if (node.nodeValue !== translated) node.nodeValue = translated;
    }
    node = walker.nextNode() as Text | null;
  }

  root.querySelectorAll?.("[placeholder],[title],[aria-label]").forEach((element) => {
    if (element.closest("[data-no-i18n]")) return;
    const saved = originalAttrs.get(element) || {};
    for (const attr of ["placeholder", "title", "aria-label"]) {
      const current = element.getAttribute(attr);
      if (!current) continue;
      if (!(attr in saved)) saved[attr] = current;
      element.setAttribute(attr, translateString(saved[attr], locale));
    }
    originalAttrs.set(element, saved);
  });
}

export function AuraLanguage() {
  const [locale, setLocale] = useState<Locale>("fr");
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("aura-language") as Locale | null;
    if (stored && locales.some((item) => item.code === stored)) setLocale(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("aura-language", locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.body.dataset.auraLocale = locale;

    observerRef.current?.disconnect();
    translateElement(document.body, locale);

    const observer = new MutationObserver((records) => {
      observer.disconnect();
      for (const record of records) {
        if (record.type === "characterData" && record.target.parentElement) translateElement(record.target.parentElement, locale);
        record.addedNodes.forEach((added) => {
          if (added.nodeType === Node.ELEMENT_NODE) translateElement(added as Element, locale);
          if (added.nodeType === Node.TEXT_NODE && added.parentElement) translateElement(added.parentElement, locale);
        });
      }
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [locale]);

  return (
    <div className="aura-language" data-no-i18n aria-label="Language selector">
      {locales.map((item) => (
        <button
          key={item.code}
          type="button"
          className={locale === item.code ? "active" : ""}
          onClick={() => setLocale(item.code)}
          title={item.label}
          aria-pressed={locale === item.code}
        >
          {item.native}
        </button>
      ))}
    </div>
  );
}
