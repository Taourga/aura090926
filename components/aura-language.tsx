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
  "Navigation publique": { en: "Public navigation", ar: "التنقل العام", zh: "公共导航", tr: "Genel gezinme" },
  "Navigation démo": { en: "Demo navigation", ar: "تنقل العرض", zh: "演示导航", tr: "Demo gezinme" },
  "Solution": { en: "Solution", ar: "الحل", zh: "解决方案", tr: "Çözüm" },
  "Fonctionnement": { en: "How it works", ar: "طريقة العمل", zh: "工作方式", tr: "Nasıl çalışır" },
  "Démo": { en: "Demo", ar: "عرض", zh: "演示", tr: "Demo" },
  "Se connecter": { en: "Sign in", ar: "تسجيل الدخول", zh: "登录", tr: "Giriş yap" },
  "Accéder à AURA": { en: "Open AURA", ar: "الدخول إلى AURA", zh: "进入 AURA", tr: "AURA'ya eriş" },
  "Voir la démo guidée": { en: "View guided demo", ar: "عرض الجولة الإرشادية", zh: "查看引导演示", tr: "Rehberli demoyu gör" },
  "AURA · orchestration du séjour patient": { en: "AURA · patient stay orchestration", ar: "AURA · تنسيق إقامة المريض", zh: "AURA · 患者住院旅程协调", tr: "AURA · hasta yatış süreci orkestrasyonu" },
  "Le séjour patient, simple à suivre. Simple à piloter.": { en: "The patient stay, easy to follow. Easy to manage.", ar: "إقامة المريض، سهلة المتابعة وسهلة الإدارة.", zh: "患者住院过程，易于跟踪，易于管理。", tr: "Hasta yatışı, takip etmesi kolay. Yönetmesi kolay." },
  "AURA relie le patient, les soignants, l’accueil et les équipes opérationnelles dans un même parcours : planning, permissions, présence, visites, activités et informations utiles.": { en: "AURA connects patients, care teams, reception and operations in one journey: schedules, leave requests, presence, visits, activities and useful information.", ar: "يربط AURA المريض وفرق الرعاية والاستقبال والفرق التشغيلية في مسار واحد: المواعيد والتصاريح والحضور والزيارات والأنشطة والمعلومات المفيدة.", zh: "AURA 将患者、医护团队、接待和运营团队连接在同一流程中：日程、外出许可、在院状态、探访、活动和实用信息。", tr: "AURA; hasta, bakım ekipleri, resepsiyon ve operasyon ekiplerini tek bir yolculukta birleştirir: planlama, izinler, bulunma durumu, ziyaretler, etkinlikler ve yararlı bilgiler." },
  "Marchés AURA": { en: "AURA markets", ar: "أسواق AURA", zh: "AURA 市场", tr: "AURA pazarları" },
  "France": { en: "France", ar: "فرنسا", zh: "法国", tr: "Fransa" },
  "Algérie": { en: "Algeria", ar: "الجزائر", zh: "阿尔及利亚", tr: "Cezayir" },
  "Multi-établissements": { en: "Multi-facility", ar: "متعدد المؤسسات", zh: "多机构", tr: "Çoklu kurum" },
  "Multi-clinique": { en: "Multi-clinic", ar: "متعدد العيادات", zh: "多诊所", tr: "Çoklu klinik" },
  "Aperçu d’AURA": { en: "AURA preview", ar: "معاينة AURA", zh: "AURA 预览", tr: "AURA önizlemesi" },
  "Aperçu opérationnel": { en: "Operational preview", ar: "معاينة تشغيلية", zh: "运营预览", tr: "Operasyonel önizleme" },
  "Aujourd’hui": { en: "Today", ar: "اليوم", zh: "今天", tr: "Bugün" },
  "Aujourd'hui": { en: "Today", ar: "اليوم", zh: "今天", tr: "Bugün" },
  "Le séjour en un coup d’œil": { en: "The stay at a glance", ar: "الإقامة في لمحة", zh: "住院情况一览", tr: "Yatışa genel bakış" },
  "Présent": { en: "Present", ar: "موجود", zh: "在院", tr: "Mevcut" },
  "Entretien psychologue": { en: "Psychologist appointment", ar: "موعد مع الأخصائي النفسي", zh: "心理咨询", tr: "Psikolog görüşmesi" },
  "Salle 214 · 45 min": { en: "Room 214 · 45 min", ar: "الغرفة 214 · 45 دقيقة", zh: "214室 · 45分钟", tr: "Oda 214 · 45 dk" },
  "Salle 2 · 45 min": { en: "Room 2 · 45 min", ar: "الغرفة 2 · 45 دقيقة", zh: "2室 · 45分钟", tr: "Oda 2 · 45 dk" },
  "Relaxation": { en: "Relaxation", ar: "استرخاء", zh: "放松活动", tr: "Rahatlama" },
  "Inscription confirmée": { en: "Registration confirmed", ar: "تم تأكيد التسجيل", zh: "报名已确认", tr: "Kayıt onaylandı" },
  "Permission": { en: "Leave", ar: "تصريح خروج", zh: "外出许可", tr: "İzin" },
  "Double validation": { en: "Dual approval", ar: "موافقة مزدوجة", zh: "双重审批", tr: "Çift onay" },
  "Médecin + cadre": { en: "Doctor + manager", ar: "طبيب + مسؤول", zh: "医生 + 管理人员", tr: "Doktor + yönetici" },
  "Présence": { en: "Presence", ar: "الحضور", zh: "在院状态", tr: "Bulunma" },
  "Temps réel": { en: "Real time", ar: "وقت فعلي", zh: "实时", tr: "Gerçek zamanlı" },
  "Départ et retour tracés": { en: "Departure and return tracked", ar: "تتبع المغادرة والعودة", zh: "出入均有记录", tr: "Çıkış ve dönüş izlenir" },
  "Informations partagées selon le rôle de chacun": { en: "Information shared according to each role", ar: "تُشارك المعلومات حسب دور كل شخص", zh: "根据不同角色共享信息", tr: "Bilgiler role göre paylaşılır" },
  "Principes AURA": { en: "AURA principles", ar: "مبادئ AURA", zh: "AURA 原则", tr: "AURA ilkeleri" },
  "Patient": { en: "Patient", ar: "مريض", zh: "患者", tr: "Hasta" },
  "Soins": { en: "Care", ar: "الرعاية", zh: "护理", tr: "Bakım" },
  "Accueil": { en: "Reception", ar: "الاستقبال", zh: "接待", tr: "Resepsiyon" },
  "Opérations": { en: "Operations", ar: "العمليات", zh: "运营", tr: "Operasyon" },
  "Direction": { en: "Management", ar: "الإدارة", zh: "管理层", tr: "Yönetim" },
  "Une interface, quatre bénéfices": { en: "One interface, four benefits", ar: "واجهة واحدة، أربع فوائد", zh: "一个界面，四大优势", tr: "Tek arayüz, dört fayda" },
  "Moins de friction. Plus de visibilité.": { en: "Less friction. More visibility.", ar: "احتكاك أقل. رؤية أوضح.", zh: "更少摩擦，更高可见性。", tr: "Daha az sürtüşme. Daha fazla görünürlük." },
  "AURA ne remplace pas le dossier médical. Il organise le parcours quotidien autour du séjour.": { en: "AURA does not replace the medical record. It organizes the daily journey around the stay.", ar: "لا يستبدل AURA الملف الطبي، بل ينظم المسار اليومي حول الإقامة.", zh: "AURA 不替代病历系统，而是围绕住院过程组织日常流程。", tr: "AURA tıbbi kaydın yerini almaz. Günlük yatış sürecini organize eder." },
  "Un seul planning": { en: "One shared schedule", ar: "جدول واحد", zh: "统一日程", tr: "Tek planlama" },
  "Rendez-vous, activités, visites et informations de séjour réunis dans un espace clair.": { en: "Appointments, activities, visits and stay information gathered in one clear space.", ar: "المواعيد والأنشطة والزيارات ومعلومات الإقامة مجمعة في مساحة واضحة واحدة.", zh: "预约、活动、探访和住院信息集中在一个清晰空间中。", tr: "Randevular, etkinlikler, ziyaretler ve yatış bilgileri tek ve anlaşılır bir alanda." },
  "Des permissions maîtrisées": { en: "Controlled leave requests", ar: "تصاريح خروج مضبوطة", zh: "规范的外出许可", tr: "Kontrollü izinler" },
  "Demande patient, double validation, départ et retour réels : chaque étape est tracée.": { en: "Patient request, dual approval, actual departure and return: every step is tracked.", ar: "طلب المريض، موافقة مزدوجة، مغادرة وعودة فعلية: كل خطوة موثقة.", zh: "患者申请、双重审批、实际离院和返回：每一步都有记录。", tr: "Hasta talebi, çift onay, gerçek çıkış ve dönüş: her adım izlenir." },
  "Une présence visible": { en: "Visible presence status", ar: "حالة حضور واضحة", zh: "清晰的在院状态", tr: "Görünür bulunma durumu" },
  "Les équipes savent qui est présent, sorti ou attendu, sans multiplier les appels.": { en: "Teams know who is present, away or expected without multiplying phone calls.", ar: "تعرف الفرق من هو موجود أو خارج المؤسسة أو متوقع دون كثرة الاتصالات.", zh: "团队无需反复电话即可了解谁在院、离院或即将到达。", tr: "Ekipler, telefon trafiğini artırmadan kimin içeride, dışarıda veya beklendiğini bilir." },
  "Un produit adaptable": { en: "An adaptable product", ar: "منتج قابل للتكيف", zh: "灵活可配置的产品", tr: "Uyarlanabilir ürün" },
  "AURA Core s’adapte aux établissements français et algériens sans dupliquer le logiciel.": { en: "AURA Core adapts to French and Algerian facilities without duplicating the software.", ar: "يتكيف AURA Core مع المؤسسات الفرنسية والجزائرية دون تكرار البرنامج.", zh: "AURA Core 可适配法国和阿尔及利亚机构，无需复制软件。", tr: "AURA Core, yazılımı çoğaltmadan Fransız ve Cezayir kurumlarına uyarlanır." },
  "Un fonctionnement évident": { en: "A straightforward workflow", ar: "طريقة عمل واضحة", zh: "直观的工作方式", tr: "Açık bir işleyiş" },
  "Chacun voit uniquement ce dont il a besoin.": { en: "Everyone sees only what they need.", ar: "يرى كل شخص فقط ما يحتاجه.", zh: "每个人只看到自己需要的信息。", tr: "Herkes yalnızca ihtiyaç duyduğunu görür." },
  "Consulte son séjour et fait ses demandes.": { en: "Views their stay and submits requests.", ar: "يطلع على إقامته ويقدم طلباته.", zh: "查看住院信息并提交请求。", tr: "Yatışını görüntüler ve taleplerini iletir." },
  "Soignants": { en: "Care teams", ar: "فرق الرعاية", zh: "医护人员", tr: "Bakım ekipleri" },
  "Valident et mettent à jour les informations utiles.": { en: "Validate and update useful information.", ar: "يعتمدون المعلومات المفيدة ويحدثونها.", zh: "审核并更新实用信息。", tr: "Yararlı bilgileri onaylar ve günceller." },
  "Enregistre les mouvements réels.": { en: "Records actual movements.", ar: "يسجل التحركات الفعلية.", zh: "记录实际出入。", tr: "Gerçek hareketleri kaydeder." },
  "Suit l’activité avec une vue opérationnelle commune.": { en: "Tracks activity through a shared operational view.", ar: "يتابع النشاط من خلال رؤية تشغيلية مشتركة.", zh: "通过统一运营视图跟踪活动。", tr: "Faaliyeti ortak operasyonel görünümle izler." },
  "Un même cœur produit, configuré pour chaque établissement.": { en: "One product core, configured for each facility.", ar: "نواة منتج واحدة تُهيأ لكل مؤسسة.", zh: "统一产品核心，可按机构配置。", tr: "Tek ürün çekirdeği, her kurum için yapılandırılır." },
  "Modules, règles métier, rôles, fuseau horaire et parcours peuvent être adaptés sans créer un logiciel différent pour chaque clinique.": { en: "Modules, business rules, roles, time zone and journeys can be adapted without creating different software for every clinic.", ar: "يمكن تكييف الوحدات وقواعد العمل والأدوار والمنطقة الزمنية والمسارات دون إنشاء برنامج مختلف لكل عيادة.", zh: "模块、业务规则、角色、时区和流程均可配置，无需为每家诊所开发不同软件。", tr: "Modüller, iş kuralları, roller, saat dilimi ve süreçler her klinik için ayrı yazılım oluşturmadan uyarlanabilir." },
  "Ouvrir AURA": { en: "Open AURA", ar: "فتح AURA", zh: "打开 AURA", tr: "AURA'yı aç" },
  "Plateforme d’orchestration du séjour patient.": { en: "Patient stay orchestration platform.", ar: "منصة تنسيق إقامة المريض.", zh: "患者住院旅程协调平台。", tr: "Hasta yatış süreci orkestrasyon platformu." },

  "Les rôles": { en: "Roles", ar: "الأدوار", zh: "角色", tr: "Roller" },
  "Workflow": { en: "Workflow", ar: "سير العمل", zh: "工作流", tr: "İş akışı" },
  "Tester avec un compte": { en: "Try with an account", ar: "التجربة بحساب", zh: "使用账户体验", tr: "Bir hesapla dene" },
  "Démo commerciale · données fictives": { en: "Commercial demo · fictitious data", ar: "عرض تجاري · بيانات افتراضية", zh: "商业演示 · 虚拟数据", tr: "Ticari demo · kurgusal veriler" },
  "Un séjour patient visible de bout en bout.": { en: "A patient stay visible from end to end.", ar: "إقامة المريض مرئية من البداية إلى النهاية.", zh: "患者住院全流程清晰可见。", tr: "Hasta yatışı uçtan uca görünür." },
  "AURA relie le patient, les soignants, l'accueil et les opérations autour des moments qui font perdre du temps : planning, permissions, mouvements, visites et informations de séjour.": { en: "AURA connects patients, care teams, reception and operations around the moments that waste time: schedules, leave requests, movements, visits and stay information.", ar: "يربط AURA المريض وفرق الرعاية والاستقبال والعمليات حول اللحظات التي تهدر الوقت: المواعيد والتصاريح والتحركات والزيارات ومعلومات الإقامة.", zh: "AURA 将患者、医护团队、接待和运营围绕最耗时的环节连接起来：日程、外出许可、出入、探访和住院信息。", tr: "AURA; hasta, bakım ekipleri, resepsiyon ve operasyonları zaman kaybettiren anlar etrafında birleştirir: planlama, izinler, hareketler, ziyaretler ve yatış bilgileri." },
  "Voir AURA par rôle": { en: "View AURA by role", ar: "عرض AURA حسب الدور", zh: "按角色查看 AURA", tr: "AURA'yı role göre gör" },
  "Voir le workflow permission": { en: "View leave workflow", ar: "عرض سير عمل التصريح", zh: "查看外出许可工作流", tr: "İzin iş akışını gör" },
  "Vue séjour · Clinique AURA Démo": { en: "Stay view · AURA Demo Clinic", ar: "عرض الإقامة · عيادة AURA التجريبية", zh: "住院视图 · AURA 演示诊所", tr: "Yatış görünümü · AURA Demo Kliniği" },
  "Patient présent": { en: "Patient present", ar: "المريض موجود", zh: "患者在院", tr: "Hasta mevcut" },
  "Chambre 214 · planning à jour": { en: "Room 214 · schedule up to date", ar: "الغرفة 214 · الجدول محدّث", zh: "214室 · 日程已更新", tr: "Oda 214 · program güncel" },
  "Médecin ✓ · Cadre ✓": { en: "Doctor ✓ · Manager ✓", ar: "طبيب ✓ · مسؤول ✓", zh: "医生 ✓ · 管理人员 ✓", tr: "Doktor ✓ · Yönetici ✓" },
  "Départ autorisé à 14:00": { en: "Departure authorized at 14:00", ar: "المغادرة مصرح بها الساعة 14:00", zh: "14:00 获准离院", tr: "14:00'te çıkış onaylandı" },
  "Retour attendu 18:00": { en: "Return expected at 18:00", ar: "العودة متوقعة الساعة 18:00", zh: "预计18:00返回", tr: "Dönüş 18:00'de bekleniyor" },
  "Mouvement horodaté": { en: "Timestamped movement", ar: "حركة موثقة زمنياً", zh: "出入时间已记录", tr: "Zaman damgalı hareket" },
  "Une seule information, visible par le bon rôle au bon moment.": { en: "One source of information, visible to the right role at the right time.", ar: "معلومة واحدة، تظهر للدور المناسب في الوقت المناسب.", zh: "单一信息源，在正确时间呈现给正确角色。", tr: "Tek bilgi kaynağı, doğru zamanda doğru role görünür." },
  "Une interface par métier": { en: "An interface for each role", ar: "واجهة لكل دور", zh: "每个角色一个界面", tr: "Her role özel arayüz" },
  "Moins d'écrans, moins de clics, moins d'appels. Le produit s'adapte au rôle et aux modules activés par l'établissement.": { en: "Fewer screens, fewer clicks, fewer calls. The product adapts to the role and the modules enabled by the facility.", ar: "شاشات أقل ونقرات أقل واتصالات أقل. يتكيف المنتج مع الدور والوحدات المفعلة في المؤسسة.", zh: "更少页面、更少点击、更少电话。产品根据角色和机构启用的模块自动适配。", tr: "Daha az ekran, daha az tıklama, daha az arama. Ürün role ve kurumun etkinleştirdiği modüllere uyarlanır." },
  "Je sais ce qui m'attend aujourd'hui.": { en: "I know what to expect today.", ar: "أعرف ما ينتظرني اليوم.", zh: "我知道今天有哪些安排。", tr: "Bugün beni neyin beklediğini biliyorum." },
  "Planning clair": { en: "Clear schedule", ar: "جدول واضح", zh: "清晰日程", tr: "Net planlama" },
  "Activités & visites": { en: "Activities & visits", ar: "الأنشطة والزيارات", zh: "活动与探访", tr: "Etkinlikler ve ziyaretler" },
  "Médecin & cadre": { en: "Doctor & manager", ar: "الطبيب والمسؤول", zh: "医生与管理人员", tr: "Doktor ve yönetici" },
  "Je valide sans papier ni relance.": { en: "I approve without paper or follow-up calls.", ar: "أعتمد دون ورق أو تذكير متكرر.", zh: "无需纸张或反复催办即可审批。", tr: "Kağıt ve takip araması olmadan onaylıyorum." },
  "Vue séjour": { en: "Stay view", ar: "عرض الإقامة", zh: "住院视图", tr: "Yatış görünümü" },
  "Décisions horodatées": { en: "Timestamped decisions", ar: "قرارات موثقة زمنياً", zh: "决策时间记录", tr: "Zaman damgalı kararlar" },
  "Je sais qui est présent, sorti ou revenu.": { en: "I know who is present, away or back.", ar: "أعرف من هو موجود أو خرج أو عاد.", zh: "我知道谁在院、离院或已返回。", tr: "Kimin içeride, dışarıda veya geri döndüğünü biliyorum." },
  "Départ réel": { en: "Actual departure", ar: "مغادرة فعلية", zh: "实际离院", tr: "Gerçek çıkış" },
  "Retour réel": { en: "Actual return", ar: "عودة فعلية", zh: "实际返回", tr: "Gerçek dönüş" },
  "Visiteurs attendus": { en: "Expected visitors", ar: "الزوار المتوقعون", zh: "预计访客", tr: "Beklenen ziyaretçiler" },
  "Je pilote l'établissement, pas des fichiers Excel.": { en: "I manage the facility, not spreadsheets.", ar: "أدير المؤسسة، لا ملفات Excel.", zh: "我管理的是机构，而不是 Excel 表格。", tr: "Excel dosyalarını değil kurumu yönetiyorum." },
  "Rôles & modules": { en: "Roles & modules", ar: "الأدوار والوحدات", zh: "角色与模块", tr: "Roller ve modüller" },
  "Exemple clé": { en: "Key example", ar: "مثال رئيسي", zh: "关键示例", tr: "Temel örnek" },
  "Une permission sans papier, sans zone grise.": { en: "A paperless leave workflow with no grey areas.", ar: "تصريح خروج بلا ورق وبلا مناطق غامضة.", zh: "无纸化外出许可，流程清晰无模糊地带。", tr: "Kağıtsız, belirsizliği olmayan bir izin süreci." },
  "Le workflow reste simple pour l'utilisateur et traçable pour l'établissement.": { en: "The workflow stays simple for the user and traceable for the facility.", ar: "يبقى سير العمل بسيطاً للمستخدم وقابلاً للتتبع للمؤسسة.", zh: "流程对用户保持简单，同时机构可完整追踪。", tr: "İş akışı kullanıcı için basit, kurum için izlenebilir kalır." },
  "Le patient demande": { en: "The patient requests", ar: "المريض يطلب", zh: "患者提交申请", tr: "Hasta talep eder" },
  "Date, heure de retour et motif éventuel.": { en: "Date, return time and optional reason.", ar: "التاريخ ووقت العودة والسبب إن وجد.", zh: "日期、返回时间及可选原因。", tr: "Tarih, dönüş saati ve varsa gerekçe." },
  "Le médecin décide": { en: "The doctor decides", ar: "الطبيب يقرر", zh: "医生决定", tr: "Doktor karar verir" },
  "Validation ou refus, avec horodatage.": { en: "Approval or refusal, timestamped.", ar: "موافقة أو رفض مع توثيق زمني.", zh: "审批或拒绝，并记录时间。", tr: "Onay veya ret, zaman damgalı." },
  "Le cadre confirme": { en: "The manager confirms", ar: "المسؤول يؤكد", zh: "管理人员确认", tr: "Yönetici onaylar" },
  "La sortie n'est autorisée qu'après les deux validations.": { en: "Departure is authorized only after both approvals.", ar: "لا يُسمح بالخروج إلا بعد الموافقتين.", zh: "只有完成两次审批后才允许离院。", tr: "Çıkış yalnızca iki onaydan sonra izinlidir." },
  "L'accueil trace": { en: "Reception records", ar: "الاستقبال يسجل", zh: "接待处记录", tr: "Resepsiyon kaydeder" },
  "Départ réel, retour réel et visibilité instantanée.": { en: "Actual departure, actual return and instant visibility.", ar: "مغادرة فعلية وعودة فعلية ورؤية فورية.", zh: "实际离院、实际返回，并即时可见。", tr: "Gerçek çıkış, gerçek dönüş ve anlık görünürlük." },
  "Positionnement": { en: "Positioning", ar: "التموضع", zh: "定位", tr: "Konumlandırma" },
  "AURA ne remplace pas le dossier médical.": { en: "AURA does not replace the medical record.", ar: "لا يستبدل AURA الملف الطبي.", zh: "AURA 不替代病历系统。", tr: "AURA tıbbi kaydın yerini almaz." },
  "Il orchestre le séjour quotidien autour du SI existant : patient, équipes, planning, autorisations, mouvements et vie de l'établissement.": { en: "It orchestrates the daily stay around the existing information system: patient, teams, schedule, authorizations, movements and facility life.", ar: "ينسق الإقامة اليومية حول نظام المعلومات القائم: المريض والفرق والجدول والتصاريح والتحركات وحياة المؤسسة.", zh: "它围绕现有信息系统协调日常住院流程：患者、团队、日程、授权、出入和机构生活。", tr: "Mevcut bilgi sistemi etrafında günlük yatış sürecini orkestre eder: hasta, ekipler, planlama, izinler, hareketler ve kurum yaşamı." },
  "Mobile-first": { en: "Mobile-first", ar: "مصمم للجوال أولاً", zh: "移动优先", tr: "Mobil öncelikli" },
  "Multi-rôles": { en: "Multi-role", ar: "متعدد الأدوار", zh: "多角色", tr: "Çoklu rol" },
  "Workflow auditable": { en: "Auditable workflow", ar: "سير عمل قابل للتدقيق", zh: "可审计工作流", tr: "Denetlenebilir iş akışı" },
  "Démo terminée": { en: "Demo complete", ar: "انتهى العرض", zh: "演示结束", tr: "Demo tamamlandı" },
  "Le prochain écran, c'est celui de votre clinique.": { en: "The next screen could be your clinic's.", ar: "الشاشة التالية يمكن أن تكون شاشة عيادتكم.", zh: "下一个界面，可以属于您的诊所。", tr: "Bir sonraki ekran kliniğinize ait olabilir." },
  "Le pilote se configure par établissement : modules, rôles, règles de permission, visites, fuseau, langue et Country Pack.": { en: "The pilot is configured per facility: modules, roles, leave rules, visits, time zone, language and Country Pack.", ar: "يتم إعداد المشروع التجريبي لكل مؤسسة: الوحدات والأدوار وقواعد التصاريح والزيارات والمنطقة الزمنية واللغة وحزمة البلد.", zh: "试点按机构配置：模块、角色、外出规则、探访、时区、语言和 Country Pack。", tr: "Pilot her kurum için yapılandırılır: modüller, roller, izin kuralları, ziyaretler, saat dilimi, dil ve Country Pack." },
  "Démo commerciale · aucune donnée patient réelle": { en: "Commercial demo · no real patient data", ar: "عرض تجاري · لا توجد بيانات مرضى حقيقية", zh: "商业演示 · 不含真实患者数据", tr: "Ticari demo · gerçek hasta verisi yok" },

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
  "Configurer": { en: "Configure", ar: "إعداد", zh: "配置", tr: "Yapılandır" },
  "Aide & infos": { en: "Help & info", ar: "المساعدة والمعلومات", zh: "帮助与信息", tr: "Yardım ve bilgi" },
  "Retour accueil": { en: "Back home", ar: "العودة للرئيسية", zh: "返回首页", tr: "Ana sayfaya dön" },
  "Accès sécurisé": { en: "Secure access", ar: "دخول آمن", zh: "安全访问", tr: "Güvenli erişim" },
  "Données fictives": { en: "Demo data", ar: "بيانات تجريبية", zh: "演示数据", tr: "Demo verileri" },
  "Aller au contenu": { en: "Skip to content", ar: "الانتقال إلى المحتوى", zh: "跳到内容", tr: "İçeriğe geç" },
  "Navigation principale": { en: "Main navigation", ar: "التنقل الرئيسي", zh: "主导航", tr: "Ana gezinme" },
  "Module non activé": { en: "Module not enabled", ar: "الوحدة غير مفعلة", zh: "模块未启用", tr: "Modül etkin değil" },
  "Ouvrir les réglages": { en: "Open settings", ar: "فتح الإعدادات", zh: "打开设置", tr: "Ayarları aç" },
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
  "Voir demain": { en: "View tomorrow", ar: "عرض الغد", zh: "查看明天", tr: "Yarını gör" },
  "PROCHAIN REPAS": { en: "NEXT MEAL", ar: "الوجبة القادمة", zh: "下一餐", tr: "SONRAKİ ÖĞÜN" },
  "Menu à confirmer": { en: "Menu to be confirmed", ar: "القائمة قيد التأكيد", zh: "菜单待确认", tr: "Menü onaylanacak" },
  "MÉDECIN RÉFÉRENT": { en: "PRIMARY DOCTOR", ar: "الطبيب المرجعي", zh: "主治医生", tr: "SORUMLU DOKTOR" },
  "Médecin référent": { en: "Primary doctor", ar: "الطبيب المرجعي", zh: "主治医生", tr: "Sorumlu doktor" },
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

  "AURA Impact · Démonstration": { en: "AURA Impact · Demo", ar: "AURA Impact · عرض تجريبي", zh: "AURA Impact · 演示", tr: "AURA Impact · Demo" },
  "Mesurer l’impact positif du parcours numérique": { en: "Measure the positive impact of the digital patient journey", ar: "قياس الأثر الإيجابي للمسار الرقمي", zh: "衡量数字化患者旅程的积极影响", tr: "Dijital hasta yolculuğunun olumlu etkisini ölçün" },
  "Données de démonstration": { en: "Demo data", ar: "بيانات تجريبية", zh: "演示数据", tr: "Demo verileri" },
  "DOCUMENTS NUMÉRIQUES": { en: "DIGITAL DOCUMENTS", ar: "المستندات الرقمية", zh: "数字文档", tr: "DİJİTAL BELGELER" },
  "PAGES ÉVITÉES · EST.": { en: "PAGES AVOIDED · EST.", ar: "صفحات تم تجنبها · تقديري", zh: "减少纸张页数 · 估算", tr: "ÖNLENEN SAYFALAR · TAH." },
  "ÉCHANGES NUMÉRIQUES": { en: "DIGITAL INTERACTIONS", ar: "التفاعلات الرقمية", zh: "数字互动", tr: "DİJİTAL ETKİLEŞİMLER" },
  "DÉPLACEMENTS ÉVITÉS · EST.": { en: "TRIPS AVOIDED · EST.", ar: "تنقلات تم تجنبها · تقديري", zh: "减少出行 · 估算", tr: "ÖNLENEN YOLCULUKLAR · TAH." },
  "CO₂e ÉVITÉ · EST.": { en: "CO₂e AVOIDED · EST.", ar: "مكافئ CO₂ المتجنب · تقديري", zh: "减少 CO₂e · 估算", tr: "ÖNLENEN CO₂e · TAH." },
  "Tendance": { en: "Trend", ar: "الاتجاه", zh: "趋势", tr: "Eğilim" },
  "Progression sur 6 mois": { en: "6-month progress", ar: "التقدم خلال 6 أشهر", zh: "6个月进展", tr: "6 aylık ilerleme" },
  "Leviers": { en: "Drivers", ar: "العوامل", zh: "驱动因素", tr: "Etkileyen faktörler" },
  "Ce qui contribue le plus": { en: "Top contributors", ar: "أهم المساهمات", zh: "主要贡献因素", tr: "En çok katkı sağlayanlar" },
  "Dématérialisation documentaire": { en: "Paperless documentation", ar: "رقمنة المستندات", zh: "文档无纸化", tr: "Belge dijitalleştirme" },
  "Notifications & informations patient": { en: "Patient notifications & information", ar: "إشعارات ومعلومات المريض", zh: "患者通知与信息", tr: "Hasta bildirimleri ve bilgileri" },
  "Coordination interne numérique": { en: "Digital internal coordination", ar: "التنسيق الداخلي الرقمي", zh: "内部数字协同", tr: "Dijital iç koordinasyon" },
  "Échanges administratifs à distance": { en: "Remote administrative interactions", ar: "تفاعلات إدارية عن بُعد", zh: "远程行政互动", tr: "Uzaktan idari etkileşimler" },
  "Valeur établissement": { en: "Facility value", ar: "قيمة للمؤسسة", zh: "机构价值", tr: "Kurum değeri" },
  "Mesurer": { en: "Measure", ar: "قياس", zh: "衡量", tr: "Ölç" },
  "Réduire": { en: "Reduce", ar: "خفض", zh: "减少", tr: "Azalt" },
  "Valoriser": { en: "Showcase", ar: "إبراز القيمة", zh: "价值展示", tr: "Değer yarat" },
  "Méthodologie & hypothèses de démonstration": { en: "Methodology & demo assumptions", ar: "المنهجية وافتراضات العرض", zh: "方法与演示假设", tr: "Metodoloji ve demo varsayımları" },
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
