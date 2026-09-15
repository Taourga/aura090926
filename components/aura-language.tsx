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
  "AURA Pulse": { en: "AURA Pulse", ar: "AURA Pulse", zh: "AURA Pulse", tr: "AURA Pulse" },
  "Relève": { en: "Handover", ar: "تسليم المناوبة", zh: "交接班", tr: "Devir teslim" },
  "Pilotage ROI": { en: "ROI Dashboard", ar: "لوحة العائد على الاستثمار", zh: "投资回报驾驶舱", tr: "ROI Paneli" },
  "AURA Impact": { en: "AURA Impact", ar: "AURA Impact", zh: "AURA Impact", tr: "AURA Impact" },
  "Séjours": { en: "Stays", ar: "الإقامات", zh: "住院", tr: "Yatışlar" },
  "Sorties": { en: "Discharges", ar: "الخروج", zh: "出院", tr: "Taburcu" },
  "Mes patients": { en: "My patients", ar: "مرضاي", zh: "我的患者", tr: "Hastalarım" },
  "Mes absences": { en: "My absences", ar: "غيابي", zh: "我的缺勤", tr: "Devamsızlıklarım" },
  "Permissions": { en: "Leave requests", ar: "تصاريح الخروج", zh: "外出许可", tr: "İzinler" },
  "Planning": { en: "Schedule", ar: "الجدول", zh: "日程", tr: "Planlama" },
  "Activités": { en: "Activities", ar: "الأنشطة", zh: "活动", tr: "Etkinlikler" },
  "Visites": { en: "Visits", ar: "الزيارات", zh: "探访", tr: "Ziyaretler" },
  "Messages": { en: "Messages", ar: "الرسائل", zh: "消息", tr: "Mesajlar" },
  "Mes contacts": { en: "My contacts", ar: "جهات اتصالي", zh: "我的联系人", tr: "Kişilerim" },
  "Menus": { en: "Menus", ar: "القوائم", zh: "菜单", tr: "Menüler" },
  "Infos pratiques": { en: "Practical info", ar: "معلومات عملية", zh: "实用信息", tr: "Pratik bilgiler" },
  "Hôtellerie": { en: "Hospitality", ar: "الخدمات الفندقية", zh: "后勤服务", tr: "Otelcilik" },
  "Réglages": { en: "Settings", ar: "الإعدادات", zh: "设置", tr: "Ayarlar" },
  "Mon proche": { en: "My relative", ar: "قريبي", zh: "我的亲属", tr: "Yakınım" },
  "Mes sorties": { en: "My leave", ar: "خروجي", zh: "我的外出", tr: "İzinlerim" },
  "Mon planning": { en: "My schedule", ar: "جدولي", zh: "我的日程", tr: "Programım" },
  "Mes visites": { en: "My visits", ar: "زياراتي", zh: "我的探访", tr: "Ziyaretlerim" },
  "Mes menus": { en: "My menus", ar: "قوائمي", zh: "我的菜单", tr: "Menülerim" },
  "Configurer": { en: "Configure", ar: "إعداد", zh: "配置", tr: "Yapılandır" },
  "Aide & infos": { en: "Help & info", ar: "المساعدة والمعلومات", zh: "帮助与信息", tr: "Yardım ve bilgi" },
  "Retour accueil": { en: "Back home", ar: "العودة للرئيسية", zh: "返回首页", tr: "Ana sayfaya dön" },
  "Accès sécurisé": { en: "Secure access", ar: "دخول آمن", zh: "安全访问", tr: "Güvenli erişim" },
  "Données fictives": { en: "Demo data", ar: "بيانات تجريبية", zh: "演示数据", tr: "Demo verileri" },
  "Aller au contenu": { en: "Skip to content", ar: "الانتقال إلى المحتوى", zh: "跳到内容", tr: "İçeriğe geç" },
  "Navigation principale": { en: "Main navigation", ar: "التنقل الرئيسي", zh: "主导航", tr: "Ana gezinme" },
  "Module non activé": { en: "Module not enabled", ar: "الوحدة غير مفعلة", zh: "模块未启用", tr: "Modül etkin değil" },
  "Ouvrir les réglages": { en: "Open settings", ar: "فتح الإعدادات", zh: "打开设置", tr: "Ayarları aç" },
  "Patient": { en: "Patient", ar: "مريض", zh: "患者", tr: "Hasta" },
  "Médecin": { en: "Doctor", ar: "طبيب", zh: "医生", tr: "Doktor" },
  "Cadre": { en: "Manager", ar: "إطار إداري", zh: "管理人员", tr: "Yönetici" },
  "Psychologue": { en: "Psychologist", ar: "أخصائي نفسي", zh: "心理医生", tr: "Psikolog" },
  "Gouvernance": { en: "Governance", ar: "الحوكمة", zh: "治理", tr: "Yönetişim" },
  "Personnel technique": { en: "Technical staff", ar: "الطاقم التقني", zh: "技术人员", tr: "Teknik personel" },
  "Coach sportif": { en: "Sports coach", ar: "مدرب رياضي", zh: "运动教练", tr: "Spor koçu" },
  "Infirmier": { en: "Nurse", ar: "ممرض", zh: "护士", tr: "Hemşire" },
  "Administrateur": { en: "Administrator", ar: "مسؤول", zh: "管理员", tr: "Yönetici" },
  "Intervenant": { en: "Provider", ar: "متدخل", zh: "服务人员", tr: "Hizmet sağlayıcı" },
  "Proche autorisé": { en: "Authorized relative", ar: "قريب مخول", zh: "授权亲属", tr: "Yetkili yakını" },
  "Connexion": { en: "Sign in", ar: "تسجيل الدخول", zh: "登录", tr: "Giriş" },
  "Se connecter": { en: "Sign in", ar: "تسجيل الدخول", zh: "登录", tr: "Giriş yap" },
  "Se déconnecter": { en: "Sign out", ar: "تسجيل الخروج", zh: "退出登录", tr: "Çıkış yap" },
  "Adresse e-mail": { en: "Email address", ar: "البريد الإلكتروني", zh: "电子邮箱", tr: "E-posta adresi" },
  "Mot de passe": { en: "Password", ar: "كلمة المرور", zh: "密码", tr: "Şifre" },
  "Mot de passe oublié ?": { en: "Forgot password?", ar: "نسيت كلمة المرور؟", zh: "忘记密码？", tr: "Şifrenizi mi unuttunuz?" },
  "Réinitialiser le mot de passe": { en: "Reset password", ar: "إعادة تعيين كلمة المرور", zh: "重置密码", tr: "Şifreyi sıfırla" },
  "Choisir un mot de passe": { en: "Choose a password", ar: "اختر كلمة مرور", zh: "设置密码", tr: "Şifre seç" },
  "Nouveau mot de passe": { en: "New password", ar: "كلمة مرور جديدة", zh: "新密码", tr: "Yeni şifre" },
  "Confirmer le mot de passe": { en: "Confirm password", ar: "تأكيد كلمة المرور", zh: "确认密码", tr: "Şifreyi doğrula" },
  "Enregistrer et accéder à mon espace": { en: "Save and open my space", ar: "حفظ والدخول إلى مساحتي", zh: "保存并进入我的空间", tr: "Kaydet ve alanıma git" },
  "Retour à la connexion": { en: "Back to sign in", ar: "العودة لتسجيل الدخول", zh: "返回登录", tr: "Girişe dön" },
  "Recevoir un lien": { en: "Send me a link", ar: "إرسال الرابط", zh: "发送链接", tr: "Bağlantı gönder" },

  "Ma journée": { en: "My day", ar: "يومي", zh: "我的一天", tr: "Günüm" },
  "Bonjour": { en: "Hello", ar: "مرحباً", zh: "你好", tr: "Merhaba" },
  "Chambre": { en: "Room", ar: "الغرفة", zh: "房间", tr: "Oda" },
  "Entrée le": { en: "Admitted on", ar: "تاريخ الدخول", zh: "入院日期", tr: "Giriş tarihi" },
  "Vous êtes actuellement hors de l’établissement": { en: "You are currently outside the facility", ar: "أنت حالياً خارج المؤسسة", zh: "您目前不在机构内", tr: "Şu anda kurum dışındasınız" },
  "Vous êtes présent dans l’établissement": { en: "You are currently in the facility", ar: "أنت موجود حالياً في المؤسسة", zh: "您目前在机构内", tr: "Şu anda kurumdasınız" },
  "Mon planning": { en: "My schedule", ar: "جدولي", zh: "我的日程", tr: "Programım" },
  "AUJOURD’HUI": { en: "TODAY", ar: "اليوم", zh: "今天", tr: "BUGÜN" },
  "DEMAIN": { en: "TOMORROW", ar: "غداً", zh: "明天", tr: "YARIN" },
  "Journée calme": { en: "Quiet day", ar: "يوم هادئ", zh: "轻松的一天", tr: "Sakin bir gün" },
  "Tout voir": { en: "View all", ar: "عرض الكل", zh: "查看全部", tr: "Tümünü gör" },
  "Rien de prévu pour le moment.": { en: "Nothing scheduled for now.", ar: "لا شيء مجدول حالياً.", zh: "目前没有安排。", tr: "Şimdilik planlanmış bir şey yok." },
  "événement": { en: "event", ar: "حدث", zh: "个事件", tr: "etkinlik" },
  "événements": { en: "events", ar: "أحداث", zh: "个事件", tr: "etkinlik" },
  "Voir demain": { en: "View tomorrow", ar: "عرض الغد", zh: "查看明天", tr: "Yarını gör" },
  "PROCHAIN REPAS": { en: "NEXT MEAL", ar: "الوجبة القادمة", zh: "下一餐", tr: "SONRAKİ ÖĞÜN" },
  "Menu à confirmer": { en: "Menu to be confirmed", ar: "القائمة قيد التأكيد", zh: "菜单待确认", tr: "Menü onaylanacak" },
  "MÉDECIN RÉFÉRENT": { en: "PRIMARY DOCTOR", ar: "الطبيب المرجعي", zh: "主治医生", tr: "SORUMLU DOKTOR" },
  "Médecin référent": { en: "Primary doctor", ar: "الطبيب المرجعي", zh: "主治医生", tr: "Sorumlu doktor" },
  "Permission": { en: "Leave", ar: "تصريح خروج", zh: "外出许可", tr: "İzin" },
  "Demander ou gérer": { en: "Request or manage", ar: "طلب أو إدارة", zh: "申请或管理", tr: "Talep et veya yönet" },
  "Voir mes horaires": { en: "View my schedule", ar: "عرض جدولي", zh: "查看我的时间表", tr: "Programımı gör" },
  "M’inscrire / voir": { en: "Join / view", ar: "التسجيل / العرض", zh: "报名 / 查看", tr: "Katıl / görüntüle" },
  "Prévenir l’accueil": { en: "Notify reception", ar: "إبلاغ الاستقبال", zh: "通知接待处", tr: "Resepsiyona bildir" },
  "Sortie prévue aujourd’hui": { en: "Discharge planned today", ar: "الخروج مقرر اليوم", zh: "计划今天出院", tr: "Taburcu bugün planlandı" },
  "avant votre sortie": { en: "before your discharge", ar: "قبل خروجك", zh: "距离出院", tr: "taburcu olmanıza" },
  "Préparer ma sortie": { en: "Prepare my discharge", ar: "الاستعداد للخروج", zh: "准备出院", tr: "Taburcumu hazırla" },
  "Citation du jour": { en: "Quote of the day", ar: "اقتباس اليوم", zh: "每日一句", tr: "Günün sözü" },
  "Document administratif": { en: "Administrative document", ar: "وثيقة إدارية", zh: "行政文件", tr: "İdari belge" },
  "Bulletin de situation": { en: "Status certificate", ar: "شهادة وضعية", zh: "住院情况证明", tr: "Durum belgesi" },
  "Autres services": { en: "Other services", ar: "خدمات أخرى", zh: "其他服务", tr: "Diğer hizmetler" },
  "Infos utiles": { en: "Useful information", ar: "معلومات مفيدة", zh: "实用信息", tr: "Faydalı bilgiler" },
  "ACTIVITÉ": { en: "ACTIVITY", ar: "نشاط", zh: "活动", tr: "ETKİNLİK" },
  "RDV": { en: "APPOINTMENT", ar: "موعد", zh: "预约", tr: "RANDEVU" },
  "MÉDECIN": { en: "DOCTOR", ar: "الطبيب", zh: "医生", tr: "DOKTOR" },
  "PERMISSION": { en: "LEAVE", ar: "تصريح", zh: "外出", tr: "İZİN" },
  "Passage du médecin": { en: "Doctor round", ar: "مرور الطبيب", zh: "医生查房", tr: "Doktor viziti" },
  "Permission de sortie": { en: "Leave permission", ar: "تصريح خروج", zh: "外出许可", tr: "Çıkış izni" },
  "Retour": { en: "Return", ar: "العودة", zh: "返回", tr: "Dönüş" },
  "Étage": { en: "Floor", ar: "الطابق", zh: "楼层", tr: "Kat" },
  "Activité annulée": { en: "Activity cancelled", ar: "تم إلغاء النشاط", zh: "活动已取消", tr: "Etkinlik iptal edildi" },
  "Activité modifiée": { en: "Activity updated", ar: "تم تعديل النشاط", zh: "活动已更新", tr: "Etkinlik güncellendi" },
  "Médecin référent absent prochainement": { en: "Primary doctor unavailable soon", ar: "الطبيب المرجعي سيغيب قريباً", zh: "主治医生近期不在", tr: "Sorumlu doktor yakında yok" },
  "relais": { en: "cover", ar: "البديل", zh: "代班", tr: "yerine" },

  "AURA Impact · Démonstration": { en: "AURA Impact · Demo", ar: "AURA Impact · عرض تجريبي", zh: "AURA Impact · 演示", tr: "AURA Impact · Demo" },
  "Mesurer l’impact positif du parcours numérique": { en: "Measure the positive impact of the digital patient journey", ar: "قياس الأثر الإيجابي للمسار الرقمي", zh: "衡量数字化患者旅程的积极影响", tr: "Dijital hasta yolculuğunun olumlu etkisini ölçün" },
  "AURA Impact transforme les usages numériques de l’établissement en indicateurs simples de dématérialisation et d’impact environnemental.": { en: "AURA Impact turns the facility’s digital usage into clear indicators for paperless processes and environmental impact.", ar: "يحوّل AURA Impact الاستخدامات الرقمية للمؤسسة إلى مؤشرات واضحة للرقمنة والأثر البيئي.", zh: "AURA Impact 将机构的数字化使用情况转化为无纸化和环境影响的清晰指标。", tr: "AURA Impact, kurumun dijital kullanımını kağıtsız süreçler ve çevresel etki için anlaşılır göstergelere dönüştürür." },
  "Indice de maturité numérique responsable": { en: "Responsible digital maturity index", ar: "مؤشر النضج الرقمي المسؤول", zh: "负责任数字成熟度指数", tr: "Sorumlu dijital olgunluk endeksi" },
  "Données de démonstration": { en: "Demo data", ar: "بيانات تجريبية", zh: "演示数据", tr: "Demo verileri" },
  "Les valeurs ci-dessous sont fictives et servent uniquement à illustrer le potentiel du module. Les estimations CO₂e ne constituent pas un bilan carbone certifié.": { en: "The values below are fictitious and only illustrate the module’s potential. CO₂e estimates are not a certified carbon assessment.", ar: "القيم أدناه افتراضية وتهدف فقط إلى توضيح إمكانات الوحدة. تقديرات مكافئ ثاني أكسيد الكربون ليست تقييماً كربونياً معتمداً.", zh: "以下数值为演示数据，仅用于展示模块潜力。CO₂e 估算不构成经认证的碳核算。", tr: "Aşağıdaki değerler kurgusaldır ve yalnızca modülün potansiyelini gösterir. CO₂e tahminleri sertifikalı bir karbon bilançosu değildir." },
  "DOCUMENTS NUMÉRIQUES": { en: "DIGITAL DOCUMENTS", ar: "المستندات الرقمية", zh: "数字文档", tr: "DİJİTAL BELGELER" },
  "PAGES ÉVITÉES · EST.": { en: "PAGES AVOIDED · EST.", ar: "صفحات تم تجنبها · تقديري", zh: "减少纸张页数 · 估算", tr: "ÖNLENEN SAYFALAR · TAH." },
  "ÉCHANGES NUMÉRIQUES": { en: "DIGITAL INTERACTIONS", ar: "التفاعلات الرقمية", zh: "数字互动", tr: "DİJİTAL ETKİLEŞİMLER" },
  "DÉPLACEMENTS ÉVITÉS · EST.": { en: "TRIPS AVOIDED · EST.", ar: "تنقلات تم تجنبها · تقديري", zh: "减少出行 · 估算", tr: "ÖNLENEN YOLCULUKLAR · TAH." },
  "CO₂e ÉVITÉ · EST.": { en: "CO₂e AVOIDED · EST.", ar: "مكافئ CO₂ المتجنب · تقديري", zh: "减少 CO₂e · 估算", tr: "ÖNLENEN CO₂e · TAH." },
  "interactions documentaires dématérialisées": { en: "paperless document interactions", ar: "تفاعلات مستندية رقمية", zh: "无纸化文档交互", tr: "kağıtsız belge etkileşimleri" },
  "selon l’hypothèse de démonstration": { en: "based on the demo assumption", ar: "وفق فرضية العرض", zh: "基于演示假设", tr: "demo varsayımına göre" },
  "notifications et échanges AURA": { en: "AURA notifications and interactions", ar: "إشعارات وتفاعلات AURA", zh: "AURA 通知与互动", tr: "AURA bildirimleri ve etkileşimleri" },
  "déplacements administratifs potentiellement évités": { en: "administrative trips potentially avoided", ar: "تنقلات إدارية تم تجنبها بشكل محتمل", zh: "可能减少的行政出行", tr: "potansiyel olarak önlenen idari yolculuklar" },
  "simulation non certifiée": { en: "non-certified simulation", ar: "محاكاة غير معتمدة", zh: "非认证模拟", tr: "sertifikasız simülasyon" },
  "Tendance": { en: "Trend", ar: "الاتجاه", zh: "趋势", tr: "Eğilim" },
  "Progression sur 6 mois": { en: "6-month progress", ar: "التقدم خلال 6 أشهر", zh: "6个月进展", tr: "6 aylık ilerleme" },
  "Leviers": { en: "Drivers", ar: "العوامل", zh: "驱动因素", tr: "Etkileyen faktörler" },
  "Ce qui contribue le plus": { en: "Top contributors", ar: "أهم المساهمات", zh: "主要贡献因素", tr: "En çok katkı sağlayanlar" },
  "Dématérialisation documentaire": { en: "Paperless documentation", ar: "رقمنة المستندات", zh: "文档无纸化", tr: "Belge dijitalleştirme" },
  "Notifications & informations patient": { en: "Patient notifications & information", ar: "إشعارات ومعلومات المريض", zh: "患者通知与信息", tr: "Hasta bildirimleri ve bilgileri" },
  "Coordination interne numérique": { en: "Digital internal coordination", ar: "التنسيق الداخلي الرقمي", zh: "内部数字协同", tr: "Dijital iç koordinasyon" },
  "Échanges administratifs à distance": { en: "Remote administrative interactions", ar: "تفاعلات إدارية عن بُعد", zh: "远程行政互动", tr: "Uzaktan idari etkileşimler" },
  "Valeur établissement": { en: "Facility value", ar: "قيمة للمؤسسة", zh: "机构价值", tr: "Kurum değeri" },
  "Un indicateur lisible pour la direction, la qualité et la RSE": { en: "A clear indicator for management, quality and CSR", ar: "مؤشر واضح للإدارة والجودة والمسؤولية الاجتماعية", zh: "面向管理、质量与企业社会责任的清晰指标", tr: "Yönetim, kalite ve KSS için anlaşılır bir gösterge" },
  "Mesurer": { en: "Measure", ar: "قياس", zh: "衡量", tr: "Ölç" },
  "Réduire": { en: "Reduce", ar: "خفض", zh: "减少", tr: "Azalt" },
  "Valoriser": { en: "Showcase", ar: "إبراز القيمة", zh: "价值展示", tr: "Değer yarat" },
  "Suivre l’adoption des parcours numériques et les usages réellement réalisés dans AURA.": { en: "Track adoption of digital pathways and actual usage in AURA.", ar: "متابعة اعتماد المسارات الرقمية والاستخدام الفعلي داخل AURA.", zh: "跟踪数字化流程采用情况和 AURA 中的实际使用。", tr: "Dijital süreçlerin benimsenmesini ve AURA’daki gerçek kullanımı izleyin." },
  "Identifier les processus encore très dépendants du papier ou des échanges manuels.": { en: "Identify processes that still rely heavily on paper or manual exchanges.", ar: "تحديد العمليات التي لا تزال تعتمد بشكل كبير على الورق أو التبادل اليدوي.", zh: "识别仍高度依赖纸张或人工交互的流程。", tr: "Hâlâ kağıda veya manuel iletişime yoğun şekilde bağımlı süreçleri belirleyin." },
  "Produire des indicateurs communicables en interne dans une démarche numérique responsable.": { en: "Produce internal indicators for a responsible digital strategy.", ar: "إنتاج مؤشرات داخلية ضمن نهج رقمي مسؤول.", zh: "为负责任的数字化战略生成可内部沟通的指标。", tr: "Sorumlu dijital yaklaşım için kurum içinde paylaşılabilir göstergeler üretin." },
  "Méthodologie & hypothèses de démonstration": { en: "Methodology & demo assumptions", ar: "المنهجية وافتراضات العرض", zh: "方法与演示假设", tr: "Metodoloji ve demo varsayımları" },
  "Documents dématérialisés": { en: "Paperless documents", ar: "مستندات رقمية", zh: "无纸化文档", tr: "Dijital belgeler" },
  "Pages évitées": { en: "Pages avoided", ar: "صفحات تم تجنبها", zh: "减少纸张页数", tr: "Önlenen sayfalar" },
  "Déplacements évités": { en: "Trips avoided", ar: "تنقلات تم تجنبها", zh: "减少出行", tr: "Önlenen yolculuklar" },
  "CO₂e évité": { en: "CO₂e avoided", ar: "مكافئ CO₂ المتجنب", zh: "减少 CO₂e", tr: "Önlenen CO₂e" },
  "Avr": { en: "Apr", ar: "أبر", zh: "4月", tr: "Nis" },
  "Mai": { en: "May", ar: "ماي", zh: "5月", tr: "May" },
  "Juin": { en: "Jun", ar: "يون", zh: "6月", tr: "Haz" },
  "Juil": { en: "Jul", ar: "يول", zh: "7月", tr: "Tem" },
  "Août": { en: "Aug", ar: "أغس", zh: "8月", tr: "Ağu" },
  "Sept": { en: "Sep", ar: "سبت", zh: "9月", tr: "Eyl" }
};

const receptionRole: Translation = { en: "Reception", ar: "الاستقبال", zh: "接待", tr: "Resepsiyon" };
const originalText = new WeakMap<Text, string>();
const originalAttrs = new WeakMap<Element, Record<string, string>>();

function translatePhrase(source: string, locale: Exclude<Locale, "fr">, parent?: HTMLElement | null) {
  const trimmed = source.trim();
  if (!trimmed) return source;
  if (trimmed === "Accueil" && parent?.classList.contains("portal-eyebrow")) {
    return source.replace(trimmed, receptionRole[locale]);
  }
  const exact = t[trimmed]?.[locale];
  if (exact) return source.replace(trimmed, exact);

  let result = source;
  const keys = Object.keys(t).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (!result.includes(key)) continue;
    const translated = t[key]?.[locale];
    if (translated) result = result.split(key).join(translated);
  }
  return result;
}

function localize(source: string, locale: Locale, parent?: HTMLElement | null) {
  if (locale === "fr") return source;
  return translatePhrase(source, locale, parent);
}

function translateElement(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const parent = node.parentElement;
    if (parent && !parent.closest("script,style,[data-no-i18n]") && !parent.matches("input,textarea,select,option")) {
      const source = originalText.get(node) ?? node.nodeValue ?? "";
      if (!originalText.has(node)) originalText.set(node, source);
      const next = localize(source, locale, parent);
      if (node.nodeValue !== next) node.nodeValue = next;
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
      element.setAttribute(attr, localize(saved[attr], locale, element as HTMLElement));
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

  return <div className="aura-language" data-no-i18n aria-label="Language selector">
    {locales.map((item) => <button key={item.code} type="button" className={locale === item.code ? "active" : ""} onClick={() => setLocale(item.code)} title={item.label} aria-pressed={locale === item.code}>{item.native}</button>)}
  </div>;
}
