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

const t: Record<string, Translation> = Object.assign({} as Record<string, Translation>,
  {
    "Accueil": { en: "Home", ar: "الرئيسية", zh: "首页", tr: "Ana sayfa" },
    "Réception": { en: "Reception", ar: "الاستقبال", zh: "接待", tr: "Resepsiyon" },
    "Mes patients": { en: "My patients", ar: "مرضاي", zh: "我的患者", tr: "Hastalarım" },
    "Permissions": { en: "Leave requests", ar: "طلبات الخروج", zh: "外出申请", tr: "İzin talepleri" },
    "Permission": { en: "Leave request", ar: "طلب خروج", zh: "外出申请", tr: "İzin talebi" },
    "Mes permissions": { en: "My leave requests", ar: "طلبات خروجي", zh: "我的外出申请", tr: "İzin taleplerim" },
    "Planning": { en: "Schedule", ar: "الجدول", zh: "日程", tr: "Program" },
    "Mon planning": { en: "My schedule", ar: "جدولي", zh: "我的日程", tr: "Programım" },
    "Activités": { en: "Activities", ar: "الأنشطة", zh: "活动", tr: "Etkinlikler" },
    "Visites": { en: "Visits", ar: "الزيارات", zh: "探访", tr: "Ziyaretler" },
    "Messages": { en: "Messages", ar: "الرسائل", zh: "消息", tr: "Mesajlar" },
    "Messagerie": { en: "Messages", ar: "الرسائل", zh: "消息", tr: "Mesajlar" },
    "Mes contacts": { en: "My contacts", ar: "جهات اتصالي", zh: "我的联系人", tr: "Kişilerim" },
    "Menus": { en: "Menus", ar: "القوائم", zh: "菜单", tr: "Menüler" },
    "Infos pratiques": { en: "Useful information", ar: "معلومات عملية", zh: "实用信息", tr: "Pratik bilgiler" },
    "Hôtellerie": { en: "Hospitality", ar: "الخدمات الفندقية", zh: "住院服务", tr: "Konaklama" },
    "Réglages": { en: "Settings", ar: "الإعدادات", zh: "设置", tr: "Ayarlar" },
    "Plus": { en: "More", ar: "المزيد", zh: "更多", tr: "Daha fazla" },
    "Retour accueil": { en: "Back home", ar: "العودة للرئيسية", zh: "返回首页", tr: "Ana sayfaya dön" },
    "Retour à l’accueil": { en: "Back home", ar: "العودة للرئيسية", zh: "返回首页", tr: "Ana sayfaya dön" },
    "Se déconnecter": { en: "Sign out", ar: "تسجيل الخروج", zh: "退出登录", tr: "Çıkış yap" },
    "Déconnexion": { en: "Sign out", ar: "تسجيل الخروج", zh: "退出登录", tr: "Çıkış yap" },
    "Accès sécurisé": { en: "Secure access", ar: "وصول آمن", zh: "安全访问", tr: "Güvenli erişim" },
    "Données fictives": { en: "Demo data", ar: "بيانات تجريبية", zh: "演示数据", tr: "Demo verileri" },
    "Données de démonstration": { en: "Demo data", ar: "بيانات تجريبية", zh: "演示数据", tr: "Demo verileri" },
    "Ch.": { en: "Rm.", ar: "غرفة", zh: "病房", tr: "Oda" },
    "Chambre": { en: "Room", ar: "الغرفة", zh: "房间", tr: "Oda" },
    "Patient": { en: "Patient", ar: "المريض", zh: "患者", tr: "Hasta" },
    "Médecin": { en: "Doctor", ar: "الطبيب", zh: "医生", tr: "Doktor" },
    "MÉDECIN": { en: "DOCTOR", ar: "الطبيب", zh: "医生", tr: "DOKTOR" },
    "Cadre": { en: "Manager", ar: "المشرف", zh: "主管", tr: "Yönetici" },
    "Infirmier": { en: "Nurse", ar: "الممرض", zh: "护士", tr: "Hemşire" },
    "Psychologue": { en: "Psychologist", ar: "الأخصائي النفسي", zh: "心理医生", tr: "Psikolog" },
    "Gouvernance": { en: "Governance", ar: "الإدارة", zh: "管理层", tr: "Yönetim" },
    "Administrateur": { en: "Administrator", ar: "المسؤول", zh: "管理员", tr: "Yönetici" },
    "Personnel technique": { en: "Technical staff", ar: "الطاقم التقني", zh: "技术人员", tr: "Teknik personel" },
    "Coach sportif": { en: "Sports coach", ar: "المدرب الرياضي", zh: "运动教练", tr: "Spor koçu" },
    "Intervenant": { en: "Provider", ar: "مقدم الخدمة", zh: "服务人员", tr: "Uzman" },
    "Proche autorisé": { en: "Authorized relative", ar: "القريب المصرح له", zh: "授权亲属", tr: "Yetkili yakını" }
  },
  {
    "ESPACE MÉDICAL": { en: "MEDICAL SPACE", ar: "المساحة الطبية", zh: "医疗空间", tr: "TIBBİ ALAN" },
    "Espace médical": { en: "Medical space", ar: "المساحة الطبية", zh: "医疗空间", tr: "Tıbbi alan" },
    "Vos décisions d’abord, le reste ensuite.": { en: "Your decisions first, everything else second.", ar: "قراراتك أولاً، ثم الباقي.", zh: "先做决策，其余随后。", tr: "Önce kararlarınız, sonra geri kalanı." },
    "Validez, voyez le prochain patient et préparez votre tournée sans chercher.": { en: "Approve, see the next patient and prepare your rounds without searching.", ar: "اعتمد القرارات، واطلع على المريض التالي وجهّز جولتك دون بحث.", zh: "完成审批、查看下一位患者并快速准备查房。", tr: "Onaylayın, sıradaki hastayı görün ve turunuzu kolayca hazırlayın." },
    "Uniquement les patients dont vous assurez le suivi référent.": { en: "Only patients for whom you are the primary physician.", ar: "فقط المرضى الذين تتولى متابعتهم كطبيب مرجعي.", zh: "仅显示由您担任主要负责医生的患者。", tr: "Yalnızca sorumlu doktoru olduğunuz hastalar gösterilir." },
    "Médecin référent": { en: "Primary doctor", ar: "الطبيب المرجعي", zh: "主治医生", tr: "Sorumlu doktor" },
    "Fiche patient": { en: "Patient record", ar: "ملف المريض", zh: "患者档案", tr: "Hasta kaydı" },
    "Coordonnées": { en: "Contact details", ar: "بيانات الاتصال", zh: "联系方式", tr: "İletişim bilgileri" },
    "Personne de confiance": { en: "Trusted contact", ar: "الشخص الموثوق", zh: "信任联系人", tr: "Güvenilir kişi" },
    "Portail actif": { en: "Portal active", ar: "البوابة مفعلة", zh: "门户已启用", tr: "Portal aktif" },
    "Contact uniquement": { en: "Contact only", ar: "اتصال فقط", zh: "仅联系人", tr: "Yalnızca iletişim" },
    "Contact d’urgence": { en: "Emergency contact", ar: "جهة اتصال للطوارئ", zh: "紧急联系人", tr: "Acil durum kişisi" },
    "Téléphone non renseigné": { en: "Phone not provided", ar: "رقم الهاتف غير مذكور", zh: "未填写电话", tr: "Telefon belirtilmedi" },
    "Email non renseigné": { en: "Email not provided", ar: "البريد الإلكتروني غير مذكور", zh: "未填写邮箱", tr: "E-posta belirtilmedi" },
    "Adresse non renseignée": { en: "Address not provided", ar: "العنوان غير مذكور", zh: "未填写地址", tr: "Adres belirtilmedi" },
    "Non renseignée": { en: "Not provided", ar: "غير مذكور", zh: "未填写", tr: "Belirtilmedi" },
    "Non renseigné": { en: "Not provided", ar: "غير مذكور", zh: "未填写", tr: "Belirtilmedi" },
    "Prochainement": { en: "Upcoming", ar: "قريباً", zh: "即将进行", tr: "Yaklaşan" },
    "Voir tout": { en: "View all", ar: "عرض الكل", zh: "查看全部", tr: "Tümünü gör" },
    "Traiter": { en: "Review", ar: "معالجة", zh: "处理", tr: "İşle" },
    "Prochain RDV": { en: "Next appointment", ar: "الموعد القادم", zh: "下一次预约", tr: "Sonraki randevu" },
    "prochain RDV": { en: "next appointment", ar: "الموعد القادم", zh: "下一次预约", tr: "sonraki randevu" },
    "Sortie prévue": { en: "Planned discharge", ar: "الخروج المقرر", zh: "计划出院", tr: "Planlanan taburcu" },
    "Non prévue": { en: "Not planned", ar: "غير مقرر", zh: "未计划", tr: "Planlanmadı" },
    "Lieu à confirmer": { en: "Location to be confirmed", ar: "المكان قيد التأكيد", zh: "地点待确认", tr: "Konum onaylanacak" },
    "Aucun rendez-vous à venir.": { en: "No upcoming appointments.", ar: "لا توجد مواعيد قادمة.", zh: "暂无后续预约。", tr: "Yaklaşan randevu yok." },
    "Aucune permission.": { en: "No leave request.", ar: "لا توجد طلبات خروج.", zh: "无外出申请。", tr: "İzin talebi yok." },
    "Plus d’informations": { en: "More information", ar: "معلومات إضافية", zh: "更多信息", tr: "Daha fazla bilgi" },
    "Activités inscrites": { en: "Registered activities", ar: "الأنشطة المسجلة", zh: "已报名活动", tr: "Kayıtlı etkinlikler" },
    "Aucune activité.": { en: "No activity.", ar: "لا توجد أنشطة.", zh: "暂无活动。", tr: "Etkinlik yok." },
    "Partage avec le proche": { en: "Sharing with relative", ar: "المشاركة مع القريب", zh: "与亲属共享", tr: "Yakınla paylaşım" },
    "Aucun patient référent.": { en: "No assigned patient.", ar: "لا يوجد مريض مرجعي.", zh: "暂无负责患者。", tr: "Sorumlu olduğunuz hasta yok." },
    "Aucun patient à afficher.": { en: "No patient to display.", ar: "لا يوجد مريض للعرض.", zh: "无患者可显示。", tr: "Gösterilecek hasta yok." },
    "Frère": { en: "Brother", ar: "أخ", zh: "兄弟", tr: "Erkek kardeş" },
    "Sœur": { en: "Sister", ar: "أخت", zh: "姐妹", tr: "Kız kardeş" },
    "Père": { en: "Father", ar: "أب", zh: "父亲", tr: "Baba" },
    "Mère": { en: "Mother", ar: "أم", zh: "母亲", tr: "Anne" },
    "Conjoint": { en: "Partner", ar: "الزوج/الزوجة", zh: "配偶", tr: "Eş" }
  },
  {
    "TOURNÉE": { en: "ROUNDS", ar: "الجولات", zh: "巡视", tr: "TURLAR" },
    "Tournée": { en: "Rounds", ar: "الجولات", zh: "巡视", tr: "Turlar" },
    "Passages par étage": { en: "Floor rounds", ar: "جولات حسب الطابق", zh: "楼层巡视", tr: "Kat turları" },
    "passages d’étage": { en: "floor rounds", ar: "جولات الطابق", zh: "楼层巡视", tr: "kat turları" },
    "Étage": { en: "Floor", ar: "الطابق", zh: "楼层", tr: "Kat" },
    "Heure de passage": { en: "Round time", ar: "وقت الجولة", zh: "巡视时间", tr: "Tur saati" },
    "Publier le passage": { en: "Publish round", ar: "نشر الجولة", zh: "发布巡视", tr: "Turu yayınla" },
    "Choisir l’étage": { en: "Select floor", ar: "اختر الطابق", zh: "选择楼层", tr: "Kat seç" },
    "Choisir l'étage": { en: "Select floor", ar: "اختر الطابق", zh: "选择楼层", tr: "Kat seç" },
    "Aucun passage publié.": { en: "No round published.", ar: "لم يتم نشر أي جولة.", zh: "尚未发布巡视。", tr: "Yayınlanmış tur yok." }
  },
  {
    "Sorties temporaires": { en: "Temporary leave", ar: "الخروج المؤقت", zh: "临时外出", tr: "Geçici çıkışlar" },
    "Consultez et traitez les demandes selon votre périmètre.": { en: "Review and process requests within your scope.", ar: "راجع الطلبات وعالجها ضمن نطاق صلاحياتك.", zh: "查看并处理您权限范围内的申请。", tr: "Yetki alanınızdaki talepleri inceleyin ve işleyin." },
    "Enregistrez l’heure réelle au moment du départ et du retour.": { en: "Record the actual time at departure and return.", ar: "سجّل الوقت الفعلي عند المغادرة والعودة.", zh: "记录实际离院和返回时间。", tr: "Çıkış ve dönüşte gerçek saati kaydedin." },
    "Vue filtrée sur le patient sélectionné : décision et historique restent au même endroit.": { en: "Filtered view for the selected patient: decisions and history stay in one place.", ar: "عرض مفلتر للمريض المحدد: القرارات والسجل في مكان واحد.", zh: "所选患者的筛选视图：决策和历史记录集中显示。", tr: "Seçilen hasta için filtreli görünüm: kararlar ve geçmiş tek yerde." },
    "Votre calendrier d’abord : cliquez sur un jour pour demander, consulter, modifier ou annuler une permission.": { en: "Start with your calendar: click a day to request, view, edit or cancel leave.", ar: "ابدأ بالتقويم: اضغط على يوم لطلب خروج أو عرضه أو تعديله أو إلغائه.", zh: "先看日历：点击日期即可申请、查看、修改或取消外出。", tr: "Önce takviminiz: izin istemek, görüntülemek, değiştirmek veya iptal etmek için bir güne tıklayın." },
    "Liste des permissions": { en: "Leave request list", ar: "قائمة طلبات الخروج", zh: "外出申请列表", tr: "İzin talepleri listesi" },
    "Détail et état actuel des demandes.": { en: "Request details and current status.", ar: "تفاصيل الطلبات وحالتها الحالية.", zh: "申请详情及当前状态。", tr: "Taleplerin ayrıntıları ve güncel durumu." },
    "Historique de mes demandes": { en: "My request history", ar: "سجل طلباتي", zh: "我的申请历史", tr: "Talep geçmişim" },
    "Départs et retours": { en: "Departures and returns", ar: "المغادرات والعودات", zh: "离院与返回", tr: "Çıkışlar ve dönüşler" },
    "Départ prévu": { en: "Planned departure", ar: "المغادرة المقررة", zh: "计划离院", tr: "Planlanan çıkış" },
    "Retour prévu": { en: "Planned return", ar: "العودة المقررة", zh: "计划返回", tr: "Planlanan dönüş" },
    "Statut": { en: "Status", ar: "الحالة", zh: "状态", tr: "Durum" },
    "Action": { en: "Action", ar: "الإجراء", zh: "操作", tr: "İşlem" },
    "Accord": { en: "Approved", ar: "موافقة", zh: "同意", tr: "Onay" },
    "Refus": { en: "Rejected", ar: "رفض", zh: "拒绝", tr: "Ret" },
    "Clôturée": { en: "Closed", ar: "مغلقة", zh: "已关闭", tr: "Kapalı" },
    "Patient sorti": { en: "Patient away", ar: "المريض خارج المؤسسة", zh: "患者已离院", tr: "Hasta dışarıda" },
    "Gérer dans le calendrier": { en: "Manage in calendar", ar: "الإدارة من التقويم", zh: "在日历中管理", tr: "Takvimden yönet" },
    "Aucune action": { en: "No action", ar: "لا إجراء", zh: "无需操作", tr: "İşlem yok" },
    "Aucune permission à afficher": { en: "No leave request to display", ar: "لا توجد طلبات خروج للعرض", zh: "无外出申请可显示", tr: "Gösterilecek izin talebi yok" },
    "Cliquez sur un jour": { en: "Click a day", ar: "اضغط على يوم", zh: "点击日期", tr: "Bir güne tıklayın" },
    "Un jour vide crée une nouvelle demande.": { en: "An empty day creates a new request.", ar: "اليوم الفارغ ينشئ طلباً جديداً.", zh: "空白日期可创建新申请。", tr: "Boş bir gün yeni talep oluşturur." },
    "Un clic suffit": { en: "One click is enough", ar: "نقرة واحدة تكفي", zh: "一次点击即可", tr: "Tek tık yeter" },
    "10 h → 17 h par défaut, ou jusqu’à 24 h avec une nuit.": { en: "10am → 5pm by default, or up to 24 hours with one overnight stay.", ar: "من 10:00 إلى 17:00 افتراضياً، أو حتى 24 ساعة مع ليلة واحدة.", zh: "默认10:00至17:00，也可含一晚最长24小时。", tr: "Varsayılan 10:00 → 17:00, bir gecelik izinle 24 saate kadar." },
    "Gérez depuis le calendrier": { en: "Manage from the calendar", ar: "أدر الطلب من التقويم", zh: "从日历管理", tr: "Takvimden yönetin" },
    "Orange = attente · Vert = validée · refus masqués.": { en: "Orange = pending · Green = approved · rejected requests hidden.", ar: "البرتقالي = انتظار · الأخضر = موافق عليه · الطلبات المرفوضة مخفية.", zh: "橙色=待处理 · 绿色=已批准 · 拒绝项隐藏。", tr: "Turuncu = bekliyor · Yeşil = onaylı · reddedilenler gizli." },
    "Valider": { en: "Approve", ar: "موافقة", zh: "批准", tr: "Onayla" },
    "Refuser": { en: "Reject", ar: "رفض", zh: "拒绝", tr: "Reddet" },
    "Valider la sortie": { en: "Confirm departure", ar: "تأكيد المغادرة", zh: "确认离院", tr: "Çıkışı onayla" },
    "Valider le retour": { en: "Confirm return", ar: "تأكيد العودة", zh: "确认返回", tr: "Dönüşü onayla" },
    "Validation...": { en: "Confirming...", ar: "جارٍ التأكيد...", zh: "确认中...", tr: "Onaylanıyor..." },
    "Soumise": { en: "Submitted", ar: "مقدمة", zh: "已提交", tr: "Gönderildi" },
    "En attente de validation": { en: "Awaiting approval", ar: "بانتظار الموافقة", zh: "等待审批", tr: "Onay bekliyor" },
    "Autorisée": { en: "Approved", ar: "مصرح بها", zh: "已批准", tr: "Onaylandı" },
    "Refusée": { en: "Rejected", ar: "مرفوضة", zh: "已拒绝", tr: "Reddedildi" },
    "Annulée": { en: "Cancelled", ar: "ملغاة", zh: "已取消", tr: "İptal edildi" },
    "Retour enregistré": { en: "Return recorded", ar: "تم تسجيل العودة", zh: "已记录返回", tr: "Dönüş kaydedildi" },
    "Validée": { en: "Approved", ar: "تمت الموافقة", zh: "已批准", tr: "Onaylandı" },
    "En attente": { en: "Pending", ar: "قيد الانتظار", zh: "待处理", tr: "Bekliyor" },
    "En cours": { en: "In progress", ar: "قيد التنفيذ", zh: "进行中", tr: "Devam ediyor" },
    "À traiter": { en: "To review", ar: "للمعالجة", zh: "待处理", tr: "İşlenecek" },
    "Aucune": { en: "None", ar: "لا يوجد", zh: "无", tr: "Yok" },
    "Aucun": { en: "None", ar: "لا يوجد", zh: "无", tr: "Yok" },
    "Présent": { en: "Present", ar: "موجود", zh: "在院", tr: "Mevcut" },
    "Sorti": { en: "Away", ar: "خارج المؤسسة", zh: "离院", tr: "Dışarıda" },
    "Hors établissement": { en: "Outside facility", ar: "خارج المؤسسة", zh: "院外", tr: "Kurum dışında" }
  },
  {
    "Calendrier de mes permissions": { en: "My leave calendar", ar: "تقويم طلبات خروجي", zh: "我的外出日历", tr: "İzin takvimim" },
    "Cliquez sur un jour pour créer, consulter, modifier ou annuler. Une permission peut durer jusqu’à 24 h, avec une seule nuit.": { en: "Click a day to create, view, edit or cancel. Leave can last up to 24 hours with one overnight stay.", ar: "اضغط على يوم للإنشاء أو العرض أو التعديل أو الإلغاء. يمكن أن يستمر الخروج حتى 24 ساعة مع ليلة واحدة.", zh: "点击日期可创建、查看、修改或取消。外出最长24小时，可过夜一次。", tr: "Oluşturmak, görüntülemek, değiştirmek veya iptal etmek için güne tıklayın. İzin en fazla 24 saat ve bir gece olabilir." },
    "Nouvelle permission": { en: "New leave request", ar: "طلب خروج جديد", zh: "新外出申请", tr: "Yeni izin talebi" },
    "Ma permission": { en: "My leave request", ar: "طلب خروجي", zh: "我的外出申请", tr: "İzin talebim" },
    "Dans la journée": { en: "Same day", ar: "خلال اليوم", zh: "当天", tr: "Aynı gün" },
    "Avec une nuit": { en: "With one overnight stay", ar: "مع ليلة واحدة", zh: "含一晚", tr: "Bir gece ile" },
    "Motif": { en: "Reason", ar: "السبب", zh: "原因", tr: "Gerekçe" },
    "(facultatif)": { en: "(optional)", ar: "(اختياري)", zh: "（可选）", tr: "(isteğe bağlı)" },
    "Ex. sortie familiale": { en: "E.g. family outing", ar: "مثال: خروج عائلي", zh: "例如：家庭外出", tr: "Örn. aile gezisi" },
    "Maximum 24 heures. Une seule nuit est possible. Les horaires restent modifiables.": { en: "Maximum 24 hours. One overnight stay is allowed. Times remain editable.", ar: "الحد الأقصى 24 ساعة. يسمح بليلة واحدة. يمكن تعديل الأوقات.", zh: "最长24小时，仅可过夜一次，时间可修改。", tr: "En fazla 24 saat. Bir geceye izin verilir. Saatler değiştirilebilir." },
    "Enregistrer les modifications": { en: "Save changes", ar: "حفظ التعديلات", zh: "保存修改", tr: "Değişiklikleri kaydet" },
    "Envoyer ma demande": { en: "Submit my request", ar: "إرسال طلبي", zh: "提交申请", tr: "Talebimi gönder" },
    "Annuler cette permission": { en: "Cancel this leave", ar: "إلغاء طلب الخروج", zh: "取消此申请", tr: "Bu izni iptal et" },
    "Aucun motif renseigné.": { en: "No reason provided.", ar: "لم يتم ذكر سبب.", zh: "未填写原因。", tr: "Gerekçe belirtilmedi." },
    "Fermer": { en: "Close", ar: "إغلاق", zh: "关闭", tr: "Kapat" }
  },
  {
    "Ma journée": { en: "My day", ar: "يومي", zh: "我的一天", tr: "Günüm" },
    "Rendez-vous": { en: "Appointment", ar: "موعد", zh: "预约", tr: "Randevu" },
    "Activité": { en: "Activity", ar: "نشاط", zh: "活动", tr: "Etkinlik" },
    "Passage médecin": { en: "Doctor round", ar: "جولة الطبيب", zh: "医生查房", tr: "Doktor turu" },
    "Passage du médecin": { en: "Doctor round", ar: "جولة الطبيب", zh: "医生查房", tr: "Doktor turu" },
    "Permission de sortie": { en: "Leave request", ar: "طلب خروج", zh: "外出申请", tr: "Çıkış izni" },
    "Vous êtes inscrit": { en: "You are registered", ar: "أنت مسجل", zh: "您已报名", tr: "Kayıtlısınız" },
    "Inscrit": { en: "Registered", ar: "مسجل", zh: "已报名", tr: "Kayıtlı" },
    "Prévu": { en: "Scheduled", ar: "مقرر", zh: "已安排", tr: "Planlandı" },
    "Tout au même endroit, avec les conflits visibles immédiatement.": { en: "Everything in one place, with conflicts visible immediately.", ar: "كل شيء في مكان واحد مع إظهار التعارضات فوراً.", zh: "所有事项集中一处，冲突即时可见。", tr: "Her şey tek yerde, çakışmalar anında görünür." },
    "Prochain": { en: "Next", ar: "التالي", zh: "下一个", tr: "Sonraki" },
    "Aujourd’hui": { en: "Today", ar: "اليوم", zh: "今天", tr: "Bugün" },
    "Demain": { en: "Tomorrow", ar: "غداً", zh: "明天", tr: "Yarın" },
    "À venir": { en: "Upcoming", ar: "قادم", zh: "即将进行", tr: "Yaklaşan" },
    "Chevauchements": { en: "Conflicts", ar: "التعارضات", zh: "冲突", tr: "Çakışmalar" },
    "Chronologie": { en: "Timeline", ar: "التسلسل الزمني", zh: "时间线", tr: "Zaman çizelgesi" },
    "Les chevauchements sont signalés automatiquement.": { en: "Conflicts are flagged automatically.", ar: "يتم تنبيهك إلى التعارضات تلقائياً.", zh: "系统会自动提示冲突。", tr: "Çakışmalar otomatik olarak işaretlenir." },
    "⚠ Chevauchement": { en: "⚠ Conflict", ar: "⚠ تعارض", zh: "⚠ 冲突", tr: "⚠ Çakışma" },
    "Avec :": { en: "With:", ar: "مع:", zh: "与：", tr: "Şununla:" },
    "Aucun événement prévu.": { en: "No event scheduled.", ar: "لا يوجد حدث مقرر.", zh: "暂无安排。", tr: "Planlanmış etkinlik yok." },
    "Rien de prévu.": { en: "Nothing scheduled.", ar: "لا شيء مقرر.", zh: "暂无安排。", tr: "Plan yok." },
    "Planning des patients": { en: "Patient schedule", ar: "جدول المرضى", zh: "患者日程", tr: "Hasta programı" },
    "Le planning est filtré sur ce patient et le formulaire est déjà prérempli.": { en: "The schedule is filtered for this patient and the form is pre-filled.", ar: "تمت تصفية الجدول لهذا المريض والنموذج معبأ مسبقاً.", zh: "日程已按该患者筛选，表单已预填。", tr: "Program bu hasta için filtrelendi ve form önceden dolduruldu." },
    "Les prochains rendez-vous et la création de créneaux au même endroit.": { en: "Upcoming appointments and slot creation in one place.", ar: "المواعيد القادمة وإنشاء الفترات في مكان واحد.", zh: "即将到来的预约和时段创建集中一处。", tr: "Yaklaşan randevular ve zaman oluşturma tek yerde." },
    "Rendez-vous du patient": { en: "Patient appointments", ar: "مواعيد المريض", zh: "患者预约", tr: "Hasta randevuları" },
    "Rendez-vous à venir": { en: "Upcoming appointments", ar: "المواعيد القادمة", zh: "即将到来的预约", tr: "Yaklaşan randevular" },
    "Créneaux externes": { en: "External slots", ar: "الفترات الخارجية", zh: "外部时段", tr: "Harici zamanlar" },
    "RDV externe": { en: "External appointment", ar: "موعد خارجي", zh: "外部预约", tr: "Harici randevu" },
    "Créneau réservé": { en: "Reserved slot", ar: "فترة محجوزة", zh: "已预留时段", tr: "Ayrılmış zaman" },
    "Nouveau rendez-vous": { en: "New appointment", ar: "موعد جديد", zh: "新预约", tr: "Yeni randevu" }
  },
  {
    "Bien-être & vie du séjour": { en: "Well-being & stay life", ar: "الرفاهية وحياة الإقامة", zh: "身心健康与住院生活", tr: "İyi yaşam ve konaklama" },
    "Inscrivez-vous en un clic. Pour chaque activité, vous savez où aller et avec qui.": { en: "Register in one click. For each activity, you know where to go and with whom.", ar: "سجّل بنقرة واحدة. لكل نشاط تعرف أين تذهب ومع من.", zh: "一键报名，每项活动都清楚地点和陪同人员。", tr: "Tek tıkla kaydolun. Her etkinlikte nereye ve kiminle gideceğinizi bilirsiniz." },
    "Gérez les activités et informez immédiatement les patients concernés.": { en: "Manage activities and immediately inform the patients concerned.", ar: "أدر الأنشطة وأبلغ المرضى المعنيين فوراً.", zh: "管理活动并即时通知相关患者。", tr: "Etkinlikleri yönetin ve ilgili hastaları hemen bilgilendirin." },
    "Voir dans mon planning": { en: "View in my schedule", ar: "عرض في جدولي", zh: "在我的日程中查看", tr: "Programımda gör" },
    "Sur inscription": { en: "Registration required", ar: "بالتسجيل", zh: "需报名", tr: "Kayıtlı" },
    "Libres & collectives": { en: "Open & group", ar: "حرة وجماعية", zh: "自由与集体", tr: "Serbest ve grup" },
    "Cette semaine": { en: "This week", ar: "هذا الأسبوع", zh: "本周", tr: "Bu hafta" },
    "Pas d’inscription : venez simplement au créneau indiqué.": { en: "No registration: simply come at the indicated time.", ar: "لا حاجة للتسجيل: احضر في الوقت المحدد.", zh: "无需报名：按指定时间到场即可。", tr: "Kayıt gerekmez: belirtilen saatte gelin." },
    "Temps libre au jardin": { en: "Free time in the garden", ar: "وقت حر في الحديقة", zh: "花园自由活动", tr: "Bahçede serbest zaman" },
    "Sans inscription": { en: "No registration", ar: "دون تسجيل", zh: "无需报名", tr: "Kayıtsız" },
    "Modifier un créneau libre": { en: "Edit an open slot", ar: "تعديل فترة حرة", zh: "修改开放时段", tr: "Serbest zamanı düzenle" },
    "Activités programmées": { en: "Scheduled activities", ar: "الأنشطة المبرمجة", zh: "已安排活动", tr: "Planlı etkinlikler" },
    "Une carte = l’essentiel : horaire, lieu, intervenant, statut.": { en: "One card = the essentials: time, location, facilitator, status.", ar: "بطاقة واحدة = الأساسيات: الوقت والمكان والمشرف والحالة.", zh: "一张卡片呈现关键信息：时间、地点、负责人、状态。", tr: "Bir kart = temel bilgiler: saat, yer, sorumlu, durum." },
    "Disponible": { en: "Available", ar: "متاح", zh: "可用", tr: "Müsait" },
    "Activité proposée pendant votre séjour.": { en: "Activity offered during your stay.", ar: "نشاط مقترح أثناء إقامتك.", zh: "住院期间提供的活动。", tr: "Konaklamanız sırasında sunulan etkinlik." },
    "Intervenant à confirmer": { en: "Facilitator to be confirmed", ar: "المشرف قيد التأكيد", zh: "负责人待确认", tr: "Sorumlu onaylanacak" },
    "Absence": { en: "Absence", ar: "غياب", zh: "缺席", tr: "Devamsızlık" },
    "Modification": { en: "Change", ar: "تعديل", zh: "变更", tr: "Değişiklik" },
    "Information": { en: "Information", ar: "معلومة", zh: "信息", tr: "Bilgi" },
    "Informer les inscrits": { en: "Notify registered patients", ar: "إبلاغ المسجلين", zh: "通知已报名人员", tr: "Kayıtlıları bilgilendir" },
    "Présences": { en: "Attendance", ar: "الحضور", zh: "出席", tr: "Katılım" },
    "Aucune activité programmée.": { en: "No scheduled activity.", ar: "لا توجد أنشطة مبرمجة.", zh: "暂无已安排活动。", tr: "Planlı etkinlik yok." },
    "Ajouter une activité": { en: "Add activity", ar: "إضافة نشاط", zh: "添加活动", tr: "Etkinlik ekle" },
    "Atelier individuel": { en: "Individual workshop", ar: "ورشة فردية", zh: "个人活动", tr: "Bireysel atölye" },
    "Salle": { en: "Room", ar: "الغرفة", zh: "房间", tr: "Oda" },
    "rdv medical": { en: "medical appointment", ar: "موعد طبي", zh: "医疗预约", tr: "tıbbi randevu" },
    "Entretien diététique": { en: "Dietitian appointment", ar: "موعد مع أخصائي التغذية", zh: "营养师咨询", tr: "Diyetisyen görüşmesi" },
    "Bureau nutrition": { en: "Nutrition office", ar: "مكتب التغذية", zh: "营养办公室", tr: "Beslenme ofisi" },
    "Point médical": { en: "Medical review", ar: "مراجعة طبية", zh: "医疗评估", tr: "Tıbbi değerlendirme" },
    "Bureau médical": { en: "Medical office", ar: "المكتب الطبي", zh: "医疗办公室", tr: "Tıbbi ofis" },
    "Entretien de suivi": { en: "Follow-up appointment", ar: "موعد متابعة", zh: "随访", tr: "Takip görüşmesi" },
    "Bureau": { en: "Office", ar: "مكتب", zh: "办公室", tr: "Ofis" },
    "Présent": { en: "Present", ar: "حاضر", zh: "出席", tr: "Katıldı" },
    "Absent": { en: "Absent", ar: "غائب", zh: "缺席", tr: "Katılmadı" },
    "Absence signalée": { en: "Absence reported", ar: "تم تسجيل الغياب", zh: "已记录缺席", tr: "Devamsızlık bildirildi" }
  },
  {
    "Visiteurs": { en: "Visitors", ar: "الزوار", zh: "访客", tr: "Ziyaretçiler" },
    "Mes visites": { en: "My visits", ar: "زياراتي", zh: "我的探访", tr: "Ziyaretlerim" },
    "Visiteurs attendus": { en: "Expected visitors", ar: "الزوار المتوقعون", zh: "预计访客", tr: "Beklenen ziyaretçiler" },
    "Choisissez un jour, renseignez votre visiteur et l’accueil est prévenu.": { en: "Choose a day, enter your visitor and reception is notified.", ar: "اختر يوماً وأدخل بيانات الزائر وسيتم إبلاغ الاستقبال.", zh: "选择日期并填写访客信息，前台会收到通知。", tr: "Bir gün seçin, ziyaretçinizi girin ve resepsiyon bilgilendirilsin." },
    "Les visites de ce patient sont regroupées ici.": { en: "This patient's visits are grouped here.", ar: "تم تجميع زيارات هذا المريض هنا.", zh: "该患者的探访集中显示在这里。", tr: "Bu hastanın ziyaretleri burada toplanır." },
    "Les arrivées et départs se traitent en un clic.": { en: "Arrivals and departures are handled in one click.", ar: "تتم معالجة الوصول والمغادرة بنقرة واحدة.", zh: "到访和离开可一键处理。", tr: "Geliş ve ayrılışlar tek tıkla işlenir." },
    "Toutes les visites": { en: "All visits", ar: "كل الزيارات", zh: "全部探访", tr: "Tüm ziyaretler" },
    "Mes prochaines visites": { en: "My upcoming visits", ar: "زياراتي القادمة", zh: "我即将到来的探访", tr: "Yaklaşan ziyaretlerim" },
    "Prochaines visites": { en: "Upcoming visits", ar: "الزيارات القادمة", zh: "即将到来的探访", tr: "Yaklaşan ziyaretler" },
    "À accueillir": { en: "To welcome", ar: "بانتظار الاستقبال", zh: "待接待", tr: "Karşılanacak" },
    "Seulement les informations utiles.": { en: "Only useful information.", ar: "المعلومات المفيدة فقط.", zh: "仅显示有用信息。", tr: "Yalnızca gerekli bilgiler." },
    "Aucune visite à venir.": { en: "No upcoming visit.", ar: "لا توجد زيارة قادمة.", zh: "暂无探访。", tr: "Yaklaşan ziyaret yok." },
    "Voir l’historique": { en: "View history", ar: "عرض السجل", zh: "查看历史", tr: "Geçmişi gör" },
    "Visite prévue": { en: "Scheduled visit", ar: "زيارة مقررة", zh: "已安排探访", tr: "Planlı ziyaret" },
    "Prévue": { en: "Scheduled", ar: "مقررة", zh: "已安排", tr: "Planlandı" },
    "Visiteur arrivé": { en: "Visitor arrived", ar: "وصل الزائر", zh: "访客已到", tr: "Ziyaretçi geldi" },
    "Visite terminée": { en: "Visit completed", ar: "انتهت الزيارة", zh: "探访结束", tr: "Ziyaret tamamlandı" },
    "Sur site": { en: "On site", ar: "في الموقع", zh: "在院", tr: "Tesiste" },
    "Terminée": { en: "Completed", ar: "منتهية", zh: "已完成", tr: "Tamamlandı" }
  },
  {
    "Aucun nouveau message": { en: "No new messages", ar: "لا توجد رسائل جديدة", zh: "暂无新消息", tr: "Yeni mesaj yok" },
    "Messagerie patient": { en: "Patient messages", ar: "رسائل المريض", zh: "患者消息", tr: "Hasta mesajları" },
    "Messagerie d’équipe": { en: "Team messages", ar: "رسائل الفريق", zh: "团队消息", tr: "Ekip mesajları" },
    "Échangez directement avec votre équipe soignante pendant votre séjour.": { en: "Communicate directly with your care team during your stay.", ar: "تواصل مباشرة مع فريق الرعاية أثناء إقامتك.", zh: "住院期间可直接与护理团队沟通。", tr: "Konaklamanız sırasında bakım ekibinizle doğrudan iletişim kurun." },
    "Le patient sélectionné est déjà ouvert : vous pouvez écrire directement.": { en: "The selected patient is already open: you can write directly.", ar: "المريض المحدد مفتوح بالفعل: يمكنك الكتابة مباشرة.", zh: "已打开所选患者，可直接发送消息。", tr: "Seçilen hasta açık: doğrudan yazabilirsiniz." },
    "Échanges privés et tracés entre l’équipe soignante et les patients autorisés.": { en: "Private, traceable exchanges between the care team and authorized patients.", ar: "مراسلات خاصة وقابلة للتتبع بين فريق الرعاية والمرضى المصرح لهم.", zh: "护理团队与授权患者之间的私密可追踪沟通。", tr: "Bakım ekibi ve yetkili hastalar arasında özel ve izlenebilir iletişim." }
  },
  {
    "Coordonnées & consentement": { en: "Contact details & consent", ar: "بيانات الاتصال والموافقة", zh: "联系方式与同意", tr: "İletişim ve onay" },
    "Mes contacts & mon proche": { en: "My contacts & relative", ar: "جهات اتصالي وقريبي", zh: "我的联系人与亲属", tr: "Kişilerim ve yakınım" },
    "Contacts patients": { en: "Patient contacts", ar: "جهات اتصال المرضى", zh: "患者联系人", tr: "Hasta iletişim bilgileri" },
    "Retrouvez vos coordonnées, votre personne de confiance et les informations de séjour que vous choisissez de partager.": { en: "Find your contact details, trusted contact and the stay information you choose to share.", ar: "اعثر على بيانات اتصالك والشخص الموثوق ومعلومات الإقامة التي تختار مشاركتها.", zh: "查看您的联系方式、信任联系人以及您选择共享的住院信息。", tr: "İletişim bilgilerinizi, güvenilir kişinizi ve paylaşmayı seçtiğiniz konaklama bilgilerini görün." },
    "Une lecture claire : d’abord le patient, puis sa personne de confiance, puis les droits de partage.": { en: "A clear view: patient first, then trusted contact, then sharing rights.", ar: "عرض واضح: المريض أولاً، ثم الشخص الموثوق، ثم صلاحيات المشاركة.", zh: "清晰展示：先患者，再信任联系人，最后共享权限。", tr: "Net görünüm: önce hasta, sonra güvenilir kişi, ardından paylaşım izinleri." },
    "Coordonnées personnelles du patient": { en: "Patient personal contact details", ar: "بيانات الاتصال الشخصية للمريض", zh: "患者个人联系方式", tr: "Hastanın kişisel iletişim bilgileri" },
    "Téléphone du patient": { en: "Patient phone", ar: "هاتف المريض", zh: "患者电话", tr: "Hasta telefonu" },
    "Email du patient": { en: "Patient email", ar: "بريد المريض الإلكتروني", zh: "患者邮箱", tr: "Hasta e-postası" },
    "Adresse du patient": { en: "Patient address", ar: "عنوان المريض", zh: "患者地址", tr: "Hasta adresi" },
    "PERSONNE DE CONFIANCE": { en: "TRUSTED CONTACT", ar: "الشخص الموثوق", zh: "信任联系人", tr: "GÜVENİLİR KİŞİ" },
    "Téléphone de la personne de confiance": { en: "Trusted contact phone", ar: "هاتف الشخص الموثوق", zh: "信任联系人电话", tr: "Güvenilir kişi telefonu" },
    "Email de la personne de confiance": { en: "Trusted contact email", ar: "بريد الشخص الموثوق الإلكتروني", zh: "信任联系人邮箱", tr: "Güvenilir kişi e-postası" },
    "Rôle": { en: "Role", ar: "الدور", zh: "角色", tr: "Rol" },
    "Oui": { en: "Yes", ar: "نعم", zh: "是", tr: "Evet" },
    "Non": { en: "No", ar: "لا", zh: "否", tr: "Hayır" },
    "Accès expiré": { en: "Access expired", ar: "انتهت صلاحية الوصول", zh: "访问已过期", tr: "Erişim süresi doldu" },
    "Portail désactivé": { en: "Portal disabled", ar: "البوابة معطلة", zh: "门户已停用", tr: "Portal devre dışı" },
    "Consentement :": { en: "Consent:", ar: "الموافقة:", zh: "同意：", tr: "Onay:" },
    "Fin d’accès :": { en: "Access ends:", ar: "نهاية الوصول:", zh: "访问截止：", tr: "Erişim bitişi:" },
    "Aucune personne de confiance": { en: "No trusted contact", ar: "لا يوجد شخص موثوق", zh: "无信任联系人", tr: "Güvenilir kişi yok" },
    "Aucun contact de confiance n’est encore renseigné pour ce patient.": { en: "No trusted contact has been provided for this patient yet.", ar: "لم يتم تسجيل شخص موثوق لهذا المريض بعد.", zh: "该患者尚未填写信任联系人。", tr: "Bu hasta için henüz güvenilir kişi belirtilmedi." },
    "PARTAGE & CONSENTEMENT": { en: "SHARING & CONSENT", ar: "المشاركة والموافقة", zh: "共享与同意", tr: "PAYLAŞIM VE ONAY" },
    "Consultation uniquement": { en: "View only", ar: "عرض فقط", zh: "仅查看", tr: "Salt okunur" }
  },
  {
    "Entrées & hospitalisations": { en: "Admissions & stays", ar: "الدخول والإقامة", zh: "入院与住院", tr: "Yatış ve konaklama" },
    "Séjours": { en: "Stays", ar: "الإقامات", zh: "住院", tr: "Konaklamalar" },
    "Trois informations seulement : qui arrive, qui est présent, qui sort bientôt.": { en: "Only three things: who is arriving, who is present, who is leaving soon.", ar: "ثلاث معلومات فقط: من سيصل، من هو موجود، ومن سيغادر قريباً.", zh: "只需三项信息：谁将入院、谁在院、谁即将出院。", tr: "Sadece üç bilgi: kim geliyor, kim içeride, kim yakında çıkıyor." },
    "+ Prévoir une entrée": { en: "+ Plan admission", ar: "+ تخطيط دخول", zh: "+ 安排入院", tr: "+ Yatış planla" },
    "Entrées prévues": { en: "Planned admissions", ar: "الدخول المقرر", zh: "计划入院", tr: "Planlı yatışlar" },
    "Séjours actifs": { en: "Active stays", ar: "الإقامات النشطة", zh: "在院患者", tr: "Aktif konaklamalar" },
    "Sorties prévues": { en: "Planned discharges", ar: "الخروج المقرر", zh: "计划出院", tr: "Planlı taburcular" },
    "Prochaines entrées": { en: "Upcoming admissions", ar: "الدخول القادم", zh: "即将入院", tr: "Yaklaşan yatışlar" },
    "Ce que l’accueil doit anticiper.": { en: "What reception needs to anticipate.", ar: "ما يجب أن يستعد له الاستقبال.", zh: "前台需要提前准备的事项。", tr: "Resepsiyonun önceden hazırlaması gerekenler." },
    "Entrée prévue": { en: "Planned admission", ar: "دخول مقرر", zh: "计划入院", tr: "Planlı yatış" },
    "Aucune entrée prévue.": { en: "No planned admission.", ar: "لا يوجد دخول مقرر.", zh: "暂无计划入院。", tr: "Planlı yatış yok." },
    "Patients hospitalisés": { en: "Inpatients", ar: "المرضى المقيمون", zh: "住院患者", tr: "Yatan hastalar" },
    "Les actions de sortie restent disponibles sans alourdir l’écran.": { en: "Discharge actions remain available without cluttering the screen.", ar: "تبقى إجراءات الخروج متاحة دون ازدحام الشاشة.", zh: "出院操作保持可用，同时不增加界面负担。", tr: "Taburcu işlemleri ekranı kalabalıklaştırmadan kullanılabilir." },
    "Sorti temporairement": { en: "Temporarily away", ar: "خارج المؤسسة مؤقتاً", zh: "临时离院", tr: "Geçici olarak dışarıda" },
    "Sortie définitive": { en: "Final discharge", ar: "الخروج النهائي", zh: "正式出院", tr: "Kesin taburcu" },
    "Non planifiée": { en: "Not planned", ar: "غير مخطط", zh: "未计划", tr: "Planlanmadı" },
    "Gérer": { en: "Manage", ar: "إدارة", zh: "管理", tr: "Yönet" },
    "Prévoir une autre entrée": { en: "Plan another admission", ar: "تخطيط دخول آخر", zh: "安排另一入院", tr: "Başka yatış planla" },
    "Fin d’hospitalisation": { en: "End of stay", ar: "نهاية الإقامة", zh: "住院结束", tr: "Konaklama sonu" },
    "Toutes les actions de sortie de ce patient sont regroupées ici.": { en: "All discharge actions for this patient are grouped here.", ar: "جميع إجراءات خروج هذا المريض مجمعة هنا.", zh: "该患者的所有出院操作集中在此。", tr: "Bu hastanın tüm taburcu işlemleri burada toplanır." },
    "Renseignez une seule date : AURA prévient les équipes et génère automatiquement les tâches de préparation.": { en: "Enter one date: AURA notifies teams and automatically generates preparation tasks.", ar: "أدخل تاريخاً واحداً: تقوم AURA بإبلاغ الفرق وإنشاء مهام التحضير تلقائياً.", zh: "只需输入一个日期：AURA会通知团队并自动生成准备任务。", tr: "Tek bir tarih girin: AURA ekipleri bilgilendirir ve hazırlık görevlerini otomatik oluşturur." },
    "Chaque service voit ce qu’il doit préparer, sans recopier la date de sortie.": { en: "Each department sees what it must prepare without re-entering the discharge date.", ar: "يرى كل قسم ما يجب تحضيره دون إعادة إدخال تاريخ الخروج.", zh: "各部门可直接看到需准备事项，无需重复输入出院日期。", tr: "Her birim, çıkış tarihini yeniden girmeden ne hazırlaması gerektiğini görür." },
    "Toutes les sorties": { en: "All discharges", ar: "كل حالات الخروج", zh: "全部出院", tr: "Tüm taburcular" },
    "Séjour": { en: "Stay", ar: "إقامة", zh: "住院", tr: "Konaklama" },
    "Tâches à préparer": { en: "Tasks to prepare", ar: "مهام للتحضير", zh: "待准备任务", tr: "Hazırlanacak görevler" },
    "Tâches terminées": { en: "Completed tasks", ar: "المهام المكتملة", zh: "已完成任务", tr: "Tamamlanan görevler" },
    "Préparation de la sortie": { en: "Discharge preparation", ar: "تحضير الخروج", zh: "出院准备", tr: "Taburcu hazırlığı" },
    "Planning de sortie orchestré": { en: "Coordinated discharge plan", ar: "خطة خروج منسقة", zh: "协同出院计划", tr: "Koordine taburcu planı" },
    "À planifier": { en: "To plan", ar: "للتخطيط", zh: "待计划", tr: "Planlanacak" },
    "Renseignée par": { en: "Entered by", ar: "أدخلها", zh: "录入人", tr: "Giren" },
    "Échéance": { en: "Due", ar: "الموعد النهائي", zh: "截止", tr: "Son tarih" },
    "Terminé": { en: "Completed", ar: "مكتمل", zh: "已完成", tr: "Tamamlandı" },
    "À faire": { en: "To do", ar: "للإنجاز", zh: "待办", tr: "Yapılacak" },
    "Aucun séjour actif.": { en: "No active stay.", ar: "لا توجد إقامة نشطة.", zh: "无当前住院。", tr: "Aktif konaklama yok." }
  },
  {
    "Relève infirmière": { en: "Nursing handoff", ar: "تسليم التمريض", zh: "护理交接", tr: "Hemşire devir teslimi" },
    "Prendre le service en 60 secondes": { en: "Start your shift in 60 seconds", ar: "ابدأ خدمتك خلال 60 ثانية", zh: "60秒掌握交班重点", tr: "Vardiyayı 60 saniyede devral" },
    "Retards, mouvements, sorties et changements importants des prochaines 24 heures.": { en: "Delays, movements, discharges and key changes for the next 24 hours.", ar: "التأخيرات والتحركات والخروج والتغييرات المهمة خلال الـ24 ساعة القادمة.", zh: "未来24小时的延误、进出、出院及重要变化。", tr: "Önümüzdeki 24 saatin gecikmeleri, hareketleri, taburcuları ve önemli değişiklikleri." },
    "Ouvrir Pulse": { en: "Open Pulse", ar: "فتح Pulse", zh: "打开 Pulse", tr: "Pulse'ı aç" },
    "À surveiller": { en: "Watch", ar: "للمراقبة", zh: "需关注", tr: "İzlenecek" },
    "Départs autorisés": { en: "Approved departures", ar: "المغادرات المصرح بها", zh: "已批准离院", tr: "Onaylı çıkışlar" },
    "Visites prévues": { en: "Scheduled visits", ar: "الزيارات المقررة", zh: "计划探访", tr: "Planlı ziyaretler" },
    "Sorties définitives": { en: "Final discharges", ar: "الخروج النهائي", zh: "正式出院", tr: "Kesin taburcular" },
    "Priorités": { en: "Priorities", ar: "الأولويات", zh: "优先事项", tr: "Öncelikler" },
    "À connaître maintenant": { en: "What you need to know now", ar: "ما يجب معرفته الآن", zh: "当前须知", tr: "Şimdi bilinmesi gerekenler" },
    "Retour en retard": { en: "Late return", ar: "عودة متأخرة", zh: "逾期未归", tr: "Geciken dönüş" },
    "Retour attendu à": { en: "Expected back at", ar: "العودة متوقعة عند", zh: "预计返回时间", tr: "Beklenen dönüş" },
    "Permission en attente": { en: "Pending leave request", ar: "طلب خروج قيد الانتظار", zh: "待处理外出申请", tr: "Bekleyen izin talebi" },
    "Départ souhaité": { en: "Requested departure", ar: "المغادرة المطلوبة", zh: "申请离院时间", tr: "İstenen çıkış" },
    "Aucun point critique.": { en: "No critical issue.", ar: "لا توجد نقاط حرجة.", zh: "无关键问题。", tr: "Kritik nokta yok." },
    "Mes tâches": { en: "My tasks", ar: "مهامي", zh: "我的任务", tr: "Görevlerim" },
    "Coordination de sortie": { en: "Discharge coordination", ar: "تنسيق الخروج", zh: "出院协调", tr: "Taburcu koordinasyonu" },
    "Sans échéance": { en: "No due date", ar: "دون موعد نهائي", zh: "无截止日期", tr: "Son tarih yok" },
    "Changements": { en: "Changes", ar: "التغييرات", zh: "变化", tr: "Değişiklikler" },
    "Ce qui a bougé": { en: "What changed", ar: "ما الذي تغير", zh: "近期变化", tr: "Neler değişti" },
    "Absence médecin": { en: "Doctor absence", ar: "غياب الطبيب", zh: "医生缺勤", tr: "Doktor yokluğu" },
    "Relais": { en: "Cover", ar: "البديل", zh: "替班", tr: "Yedek" },
    "Activité annulée": { en: "Activity cancelled", ar: "تم إلغاء النشاط", zh: "活动已取消", tr: "Etkinlik iptal edildi" },
    "Activité modifiée": { en: "Activity changed", ar: "تم تعديل النشاط", zh: "活动已变更", tr: "Etkinlik değiştirildi" },
    "Information activité": { en: "Activity update", ar: "معلومة عن النشاط", zh: "活动通知", tr: "Etkinlik bilgisi" },
    "Aucun changement récent.": { en: "No recent change.", ar: "لا توجد تغييرات حديثة.", zh: "暂无近期变化。", tr: "Yakın zamanda değişiklik yok." },
    "Tour de contrôle de la journée": { en: "Daily control tower", ar: "مركز متابعة اليوم", zh: "今日运营总览", tr: "Günün kontrol merkezi" },
    "Voir, comprendre et agir sans chercher l’information dans plusieurs écrans.": { en: "See, understand and act without searching across multiple screens.", ar: "شاهد وافهم واتخذ إجراءً دون البحث في عدة شاشات.", zh: "无需跨多个页面查找，即可查看、理解并行动。", tr: "Birden fazla ekranda aramadan görün, anlayın ve harekete geçin." },
    "En temps réel": { en: "Real time", ar: "في الوقت الفعلي", zh: "实时", tr: "Gerçek zamanlı" },
    "Patients actifs": { en: "Active patients", ar: "المرضى النشطون", zh: "当前患者", tr: "Aktif hastalar" },
    "Permissions à traiter": { en: "Leave requests to review", ar: "طلبات خروج للمعالجة", zh: "待处理外出申请", tr: "İşlenecek izinler" },
    "Rendez-vous à venir": { en: "Upcoming appointments", ar: "المواعيد القادمة", zh: "即将到来的预约", tr: "Yaklaşan randevular" },
    "Visiteurs sur site": { en: "Visitors on site", ar: "الزوار في الموقع", zh: "院内访客", tr: "Tesisteki ziyaretçiler" },
    "Points d’attention": { en: "Attention points", ar: "نقاط الانتباه", zh: "关注事项", tr: "Dikkat noktaları" },
    "Sous contrôle": { en: "Under control", ar: "تحت السيطرة", zh: "一切正常", tr: "Kontrol altında" },
    "Préparer les sorties": { en: "Prepare discharges", ar: "تحضير حالات الخروج", zh: "准备出院", tr: "Taburcuları hazırla" },
    "Voir toutes": { en: "View all", ar: "عرض الكل", zh: "查看全部", tr: "Tümünü gör" },
    "Aucune visite aujourd’hui.": { en: "No visit today.", ar: "لا توجد زيارة اليوم.", zh: "今天暂无探访。", tr: "Bugün ziyaret yok." },
    "Accès direct aux écrans concernés": { en: "Direct access to relevant screens", ar: "وصول مباشر إلى الشاشات المعنية", zh: "直接进入相关页面", tr: "İlgili ekranlara doğrudan erişim" },
    "Tout est sous contrôle": { en: "Everything is under control", ar: "كل شيء تحت السيطرة", zh: "一切正常", tr: "Her şey kontrol altında" },
    "Aucun point critique détecté.": { en: "No critical issue detected.", ar: "لم يتم اكتشاف نقطة حرجة.", zh: "未检测到关键问题。", tr: "Kritik sorun tespit edilmedi." },
    "Tâches du jour": { en: "Today's tasks", ar: "مهام اليوم", zh: "今日任务", tr: "Bugünün görevleri" },
    "Hôtellerie & exploitation": { en: "Hospitality & operations", ar: "الخدمات الفندقية والتشغيل", zh: "后勤与运营", tr: "Konaklama ve operasyon" }
  },
  {
    "Pilotage direction · 30 derniers jours": { en: "Executive dashboard · Last 30 days", ar: "لوحة الإدارة · آخر 30 يوماً", zh: "管理驾驶舱 · 最近30天", tr: "Yönetim paneli · Son 30 gün" },
    "Pilotage ROI": { en: "ROI dashboard", ar: "لوحة العائد على الاستثمار", zh: "ROI驾驶舱", tr: "ROI paneli" },
    "Voir l’activité": { en: "View activity", ar: "عرض النشاط", zh: "查看活动", tr: "Aktiviteyi gör" },
    "Suivre les sorties": { en: "Track discharges", ar: "متابعة حالات الخروج", zh: "跟踪出院", tr: "Taburcuları takip et" },
    "Démarches digitalisées": { en: "Digitized processes", ar: "الإجراءات الرقمية", zh: "数字化流程", tr: "Dijitalleştirilen işlemler" },
    "Mouvements tracés": { en: "Tracked movements", ar: "التحركات المتتبعة", zh: "已追踪进出", tr: "İzlenen hareketler" },
    "Temps moyen d’approbation": { en: "Average approval time", ar: "متوسط وقت الموافقة", zh: "平均审批时间", tr: "Ortalama onay süresi" },
    "Tâches de sortie terminées": { en: "Completed discharge tasks", ar: "مهام الخروج المكتملة", zh: "已完成出院任务", tr: "Tamamlanan taburcu görevleri" },
    "Flux mesurés": { en: "Measured flows", ar: "التدفقات المقاسة", zh: "已测流程", tr: "Ölçülen akışlar" },
    "Ce qu’AURA simplifie": { en: "What AURA simplifies", ar: "ما الذي تبسطه AURA", zh: "AURA简化的流程", tr: "AURA'nın basitleştirdikleri" },
    "Demandes de permissions": { en: "Leave requests", ar: "طلبات الخروج", zh: "外出申请", tr: "İzin talepleri" },
    "Décisions tracées": { en: "Tracked decisions", ar: "القرارات المتتبعة", zh: "已追踪决策", tr: "İzlenen kararlar" },
    "Visites annoncées": { en: "Visits announced", ar: "الزيارات المعلنة", zh: "已通知探访", tr: "Bildirilen ziyaretler" },
    "Bulletins demandés": { en: "Certificates requested", ar: "الشهادات المطلوبة", zh: "已申请证明", tr: "İstenen belgeler" },
    "Modifications d’activités": { en: "Activity changes", ar: "تعديلات الأنشطة", zh: "活动变更", tr: "Etkinlik değişiklikleri" },
    "Coordination mesurée": { en: "Measured coordination", ar: "التنسيق المقاس", zh: "协调度量", tr: "Ölçülen koordinasyon" },
    "Automatisation": { en: "Automation", ar: "الأتمتة", zh: "自动化", tr: "Otomasyon" },
    "Tâches générées": { en: "Tasks generated", ar: "المهام المنشأة", zh: "生成任务", tr: "Oluşturulan görevler" },
    "Utilisateurs actifs": { en: "Active users", ar: "المستخدمون النشطون", zh: "活跃用户", tr: "Aktif kullanıcılar" },
    "Estimation indicative": { en: "Indicative estimate", ar: "تقدير إرشادي", zh: "参考估算", tr: "Gösterge tahmini" },
    "Temps potentiellement rendu": { en: "Potential time saved", ar: "الوقت المحتمل توفيره", zh: "潜在节省时间", tr: "Potansiyel zaman kazancı" }
  },
  {
    "AURA Impact · Démonstration": { en: "AURA Impact · Demo", ar: "AURA Impact · عرض تجريبي", zh: "AURA Impact · 演示", tr: "AURA Impact · Demo" },
    "AURA Impact · Méthodologie paramétrable": { en: "AURA Impact · Configurable methodology", ar: "AURA Impact · منهجية قابلة للضبط", zh: "AURA Impact · 可配置方法", tr: "AURA Impact · Yapılandırılabilir metodoloji" },
    "Indice de maturité numérique responsable": { en: "Responsible digital maturity index", ar: "مؤشر النضج الرقمي المسؤول", zh: "负责任数字成熟度指数", tr: "Sorumlu dijital olgunluk endeksi" },
    "DOCUMENTS NUMÉRIQUES": { en: "DIGITAL DOCUMENTS", ar: "المستندات الرقمية", zh: "数字文档", tr: "DİJİTAL BELGELER" },
    "PAGES ÉVITÉES · EST.": { en: "PAGES AVOIDED · EST.", ar: "الصفحات المتجنبة · تقديري", zh: "减少纸张页数 · 估算", tr: "ÖNLENEN SAYFALAR · TAH." },
    "ÉCHANGES NUMÉRIQUES": { en: "DIGITAL INTERACTIONS", ar: "التفاعلات الرقمية", zh: "数字互动", tr: "DİJİTAL ETKİLEŞİMLER" },
    "DÉPLACEMENTS ÉVITÉS · EST.": { en: "TRIPS AVOIDED · EST.", ar: "التنقلات المتجنبة · تقديري", zh: "减少出行 · 估算", tr: "ÖNLENEN YOLCULUKLAR · TAH." },
    "CO₂e ÉVITÉ · EST.": { en: "CO₂e AVOIDED · EST.", ar: "مكافئ CO₂ المتجنب · تقديري", zh: "减少 CO₂e · 估算", tr: "ÖNLENEN CO₂e · TAH." },
    "Tendance": { en: "Trend", ar: "الاتجاه", zh: "趋势", tr: "Eğilim" },
    "Progression sur 6 mois": { en: "6-month progress", ar: "التقدم خلال 6 أشهر", zh: "6个月进展", tr: "6 aylık ilerleme" },
    "Leviers": { en: "Drivers", ar: "العوامل", zh: "驱动因素", tr: "Etkileyen faktörler" },
    "Ce qui contribue le plus": { en: "Top contributors", ar: "أهم المساهمات", zh: "主要贡献因素", tr: "En çok katkı sağlayanlar" },
    "Dématérialisation documentaire": { en: "Document digitization", ar: "رقمنة الوثائق", zh: "文档数字化", tr: "Belge dijitalleştirme" },
    "Notifications & informations patient": { en: "Patient notifications & information", ar: "إشعارات ومعلومات المريض", zh: "患者通知与信息", tr: "Hasta bildirimleri ve bilgileri" },
    "Coordination interne numérique": { en: "Digital internal coordination", ar: "التنسيق الداخلي الرقمي", zh: "内部数字协同", tr: "Dijital iç koordinasyon" },
    "Échanges administratifs à distance": { en: "Remote administrative exchanges", ar: "التبادلات الإدارية عن بُعد", zh: "远程行政沟通", tr: "Uzaktan idari iletişim" },
    "Valeur établissement": { en: "Facility value", ar: "قيمة للمؤسسة", zh: "机构价值", tr: "Kurum değeri" },
    "Mesurer": { en: "Measure", ar: "قياس", zh: "衡量", tr: "Ölç" },
    "Réduire": { en: "Reduce", ar: "خفض", zh: "减少", tr: "Azalt" },
    "Calibrer": { en: "Calibrate", ar: "معايرة", zh: "校准", tr: "Kalibre et" },
    "Méthodologie & facteurs actifs": { en: "Methodology & active factors", ar: "المنهجية والعوامل النشطة", zh: "方法与当前系数", tr: "Metodoloji ve aktif faktörler" },
    "Documents dématérialisés": { en: "Digitized documents", ar: "الوثائق الرقمية", zh: "数字化文档", tr: "Dijital belgeler" },
    "Pages évitées": { en: "Pages avoided", ar: "الصفحات المتجنبة", zh: "减少纸张页数", tr: "Önlenen sayfalar" },
    "Déplacements évités": { en: "Trips avoided", ar: "التنقلات المتجنبة", zh: "减少出行", tr: "Önlenen yolculuklar" },
    "CO₂e évité": { en: "CO₂e avoided", ar: "مكافئ CO₂ المتجنب", zh: "减少 CO₂e", tr: "Önlenen CO₂e" },
    "Avr": { en: "Apr", ar: "أبريل", zh: "4月", tr: "Nis" },
    "Mai": { en: "May", ar: "مايو", zh: "5月", tr: "May" },
    "Juin": { en: "Jun", ar: "يونيو", zh: "6月", tr: "Haz" },
    "Juil": { en: "Jul", ar: "يوليو", zh: "7月", tr: "Tem" },
    "Août": { en: "Aug", ar: "أغسطس", zh: "8月", tr: "Ağu" },
    "Sept": { en: "Sep", ar: "سبتمبر", zh: "9月", tr: "Eyl" }
  },
  {
    "Hôtellerie & ménage": { en: "Hospitality & housekeeping", ar: "الخدمات الفندقية والتنظيف", zh: "后勤与清洁", tr: "Konaklama ve temizlik" },
    "Feuille de service": { en: "Service sheet", ar: "ورقة الخدمة", zh: "服务单", tr: "Görev listesi" },
    "Pilotage hôtelier": { en: "Hospitality management", ar: "إدارة الخدمات الفندقية", zh: "后勤管理", tr: "Konaklama yönetimi" },
    "Mes nettoyages": { en: "My cleaning tasks", ar: "مهام التنظيف الخاصة بي", zh: "我的清洁任务", tr: "Temizlik görevlerim" },
    "Gouvernance hôtelière": { en: "Hospitality governance", ar: "إدارة الخدمات الفندقية", zh: "后勤管理", tr: "Konaklama yönetimi" },
    "Date": { en: "Date", ar: "التاريخ", zh: "日期", tr: "Tarih" },
    "Consulter": { en: "View", ar: "عرض", zh: "查看", tr: "Görüntüle" },
    "Actualiser": { en: "Refresh", ar: "تحديث", zh: "刷新", tr: "Yenile" },
    "Nettoyages validés": { en: "Cleaning completed", ar: "عمليات التنظيف المعتمدة", zh: "已完成清洁", tr: "Onaylı temizlikler" },
    "Chambres faites": { en: "Rooms cleaned", ar: "الغرف المنظفة", zh: "已清洁房间", tr: "Temizlenen odalar" },
    "Espaces communs": { en: "Common areas", ar: "المساحات المشتركة", zh: "公共区域", tr: "Ortak alanlar" },
    "Chambres occupées / disponibles": { en: "Occupied / available rooms", ar: "الغرف المشغولة / المتاحة", zh: "已占用 / 可用房间", tr: "Dolu / müsait odalar" },
    "Repas à prévoir": { en: "Meals to prepare", ar: "الوجبات المطلوب تجهيزها", zh: "需准备餐食", tr: "Hazırlanacak öğünler" },
    "Chambres disponibles, occupées et mouvements prévus": { en: "Available, occupied rooms and planned movements", ar: "الغرف المتاحة والمشغولة والتحركات المقررة", zh: "可用/占用房间及计划进出", tr: "Müsait, dolu odalar ve planlı hareketler" },
    "Occupée": { en: "Occupied", ar: "مشغولة", zh: "已占用", tr: "Dolu" },
    "Disponible": { en: "Available", ar: "متاحة", zh: "可用", tr: "Müsait" },
    "Feuille de ménage": { en: "Cleaning sheet", ar: "ورقة التنظيف", zh: "清洁任务单", tr: "Temizlik listesi" },
    "Historique du ménage": { en: "Cleaning history", ar: "سجل التنظيف", zh: "清洁历史", tr: "Temizlik geçmişi" },
    "À faire uniquement": { en: "Pending only", ar: "المهام المتبقية فقط", zh: "仅待办", tr: "Yalnızca bekleyenler" },
    "Valider le nettoyage": { en: "Confirm cleaning", ar: "تأكيد التنظيف", zh: "确认清洁", tr: "Temizliği onayla" },
    "Choisir un agent": { en: "Select an agent", ar: "اختر موظفاً", zh: "选择人员", tr: "Personel seç" },
    "Aucune affectation": { en: "No assignment", ar: "لا يوجد تكليف", zh: "暂无分配", tr: "Atama yok" },
    "Tous les nettoyages de cette zone sont validés.": { en: "All cleaning tasks in this area are completed.", ar: "تم اعتماد جميع مهام التنظيف في هذه المنطقة.", zh: "该区域所有清洁任务均已完成。", tr: "Bu alandaki tüm temizlikler tamamlandı." },
    "Aucune tâche enregistrée pour cette date.": { en: "No task recorded for this date.", ar: "لا توجد مهمة مسجلة لهذا التاريخ.", zh: "该日期无记录任务。", tr: "Bu tarih için görev yok." }
  },
  {
    "Repères du séjour": { en: "Stay essentials", ar: "معلومات الإقامة", zh: "住院须知", tr: "Konaklama bilgileri" },
    "Informations utiles": { en: "Useful information", ar: "معلومات مفيدة", zh: "实用信息", tr: "Faydalı bilgiler" },
    "Les horaires, règles pratiques et annonces importantes, présentés simplement.": { en: "Schedules, practical rules and important notices, presented simply.", ar: "المواعيد والقواعد العملية والإعلانات المهمة بشكل مبسط.", zh: "清晰呈现时间、实用规则和重要通知。", tr: "Saatler, pratik kurallar ve önemli duyurular sade şekilde sunulur." },
    "Repas": { en: "Meals", ar: "الوجبات", zh: "餐食", tr: "Öğünler" },
    "Jardin": { en: "Garden", ar: "الحديقة", zh: "花园", tr: "Bahçe" },
    "Patio": { en: "Patio", ar: "الفناء", zh: "庭院", tr: "Avlu" },
    "Ascenseurs": { en: "Elevators", ar: "المصاعد", zh: "电梯", tr: "Asansörler" },
    "À retenir en ce moment": { en: "Current highlights", ar: "أهم المعلومات حالياً", zh: "当前重点", tr: "Şu an bilinmesi gerekenler" },
    "Les dernières informations publiées par la clinique.": { en: "Latest information published by the clinic.", ar: "أحدث المعلومات التي نشرتها العيادة.", zh: "诊所最新发布的信息。", tr: "Kliniğin yayınladığı son bilgiler." },
    "Valable jusqu’au": { en: "Valid until", ar: "صالح حتى", zh: "有效至", tr: "Şu tarihe kadar geçerli" },
    "Aucune information publiée pour le moment.": { en: "No information published for now.", ar: "لا توجد معلومات منشورة حالياً.", zh: "目前暂无发布信息。", tr: "Şu anda yayınlanmış bilgi yok." },
    "Prochains repas": { en: "Upcoming meals", ar: "الوجبات القادمة", zh: "接下来的餐食", tr: "Yaklaşan öğünler" },
    "Voir tous les menus": { en: "View all menus", ar: "عرض كل القوائم", zh: "查看全部菜单", tr: "Tüm menüleri gör" },
    "Aucun menu publié à venir.": { en: "No upcoming menu published.", ar: "لا توجد قائمة طعام قادمة منشورة.", zh: "暂无已发布的后续菜单。", tr: "Yayınlanmış yaklaşan menü yok." },
    "Publier une information": { en: "Publish information", ar: "نشر معلومة", zh: "发布信息", tr: "Bilgi yayınla" },
    "Mettre à jour un menu": { en: "Update a menu", ar: "تحديث قائمة طعام", zh: "更新菜单", tr: "Menüyü güncelle" },
    "Restauration": { en: "Catering", ar: "الوجبات", zh: "餐饮", tr: "Yemek hizmeti" },
    "Menus de la semaine": { en: "Weekly menus", ar: "قوائم الأسبوع", zh: "本周菜单", tr: "Haftalık menüler" },
    "Les repas proposés pour les sept jours à venir, selon la date locale de l’établissement.": { en: "Meals offered for the next seven days, based on the facility's local date.", ar: "الوجبات المقترحة للأيام السبعة القادمة حسب التاريخ المحلي للمؤسسة.", zh: "按机构当地日期显示未来七天餐食。", tr: "Kurumun yerel tarihine göre önümüzdeki yedi günün öğünleri." },
    "Repas à venir": { en: "Upcoming meals", ar: "الوجبات القادمة", zh: "即将提供的餐食", tr: "Yaklaşan öğünler" },
    "Sous réserve des adaptations individuelles décidées par l’équipe soignante.": { en: "Subject to individual adjustments decided by the care team.", ar: "مع مراعاة التعديلات الفردية التي يقررها فريق الرعاية.", zh: "具体以护理团队决定的个体调整为准。", tr: "Bakım ekibinin bireysel düzenlemelerine tabidir." },
    "Menu en cours de préparation.": { en: "Menu being prepared.", ar: "القائمة قيد التحضير.", zh: "菜单准备中。", tr: "Menü hazırlanıyor." },
    "La modification est publiée immédiatement pour les patients concernés.": { en: "The change is published immediately for affected patients.", ar: "يتم نشر التعديل فوراً للمرضى المعنيين.", zh: "修改会立即向相关患者发布。", tr: "Değişiklik ilgili hastalara hemen yayınlanır." },
    "Petit-déjeuner": { en: "Breakfast", ar: "الإفطار", zh: "早餐", tr: "Kahvaltı" },
    "Déjeuner": { en: "Lunch", ar: "الغداء", zh: "午餐", tr: "Öğle yemeği" },
    "Dîner": { en: "Dinner", ar: "العشاء", zh: "晚餐", tr: "Akşam yemeği" }
  },
  {
    "Mon proche": { en: "My relative", ar: "قريبي", zh: "我的亲属", tr: "Yakınım" },
    "Portail proche autorisé": { en: "Authorized relative portal", ar: "بوابة القريب المصرح له", zh: "授权亲属门户", tr: "Yetkili yakın portalı" },
    "Vous voyez uniquement les informations de séjour que le patient a choisi de partager avec vous. Le dossier médical et les échanges internes restent privés.": { en: "You only see stay information the patient chose to share. Medical records and internal exchanges remain private.", ar: "ترى فقط معلومات الإقامة التي اختار المريض مشاركتها معك. يبقى الملف الطبي والمراسلات الداخلية خاصة.", zh: "您只能看到患者选择共享的住院信息；病历和内部沟通保持私密。", tr: "Yalnızca hastanın paylaşmayı seçtiği konaklama bilgilerini görürsünüz. Tıbbi dosya ve iç iletişim gizli kalır." },
    "MON PROCHE": { en: "MY RELATIVE", ar: "قريبي", zh: "我的亲属", tr: "YAKINIM" },
    "Présence": { en: "Presence", ar: "الحضور", zh: "在院状态", tr: "Durum" },
    "Présent dans l’établissement": { en: "Present in facility", ar: "موجود في المؤسسة", zh: "在院", tr: "Kurumda" },
    "Non partagé": { en: "Not shared", ar: "غير مشارك", zh: "未共享", tr: "Paylaşılmıyor" },
    "Prochains rendez-vous": { en: "Upcoming appointments", ar: "المواعيد القادمة", zh: "即将到来的预约", tr: "Yaklaşan randevular" },
    "Récentes et à venir": { en: "Recent and upcoming", ar: "الأخيرة والقادمة", zh: "近期与后续", tr: "Yakın geçmiş ve gelecek" },
    "Sortie définitive prévue": { en: "Planned final discharge", ar: "الخروج النهائي المقرر", zh: "计划正式出院", tr: "Planlı kesin taburcu" },
    "Accès autorisé": { en: "Authorized access", ar: "وصول مصرح به", zh: "授权访问", tr: "Yetkili erişim" },
    "Sans date de fin": { en: "No end date", ar: "دون تاريخ انتهاء", zh: "无截止日期", tr: "Bitiş tarihi yok" },
    "Révocable à tout moment": { en: "Can be revoked at any time", ar: "يمكن إلغاؤه في أي وقت", zh: "可随时撤销", tr: "Her zaman iptal edilebilir" },
    "Sorties temporaires": { en: "Temporary leave", ar: "الخروج المؤقت", zh: "临时外出", tr: "Geçici çıkışlar" },
    "Vie du séjour": { en: "Stay life", ar: "حياة الإقامة", zh: "住院生活", tr: "Konaklama yaşamı" },
    "Visites enregistrées": { en: "Recorded visits", ar: "الزيارات المسجلة", zh: "已记录探访", tr: "Kayıtlı ziyaretler" },
    "Aucun menu publié.": { en: "No menu published.", ar: "لا توجد قائمة منشورة.", zh: "暂无菜单。", tr: "Yayınlanmış menü yok." },
    "Établissement": { en: "Facility", ar: "المؤسسة", zh: "机构", tr: "Kurum" },
    "Informations pratiques": { en: "Practical information", ar: "معلومات عملية", zh: "实用信息", tr: "Pratik bilgiler" },
    "Journal famille": { en: "Family journal", ar: "سجل العائلة", zh: "家庭日志", tr: "Aile günlüğü" },
    "Derniers changements partagés": { en: "Latest shared changes", ar: "آخر التغييرات المشتركة", zh: "最近共享变化", tr: "Son paylaşılan değişiklikler" },
    "Accès sous consentement": { en: "Consent-based access", ar: "وصول قائم على الموافقة", zh: "基于同意的访问", tr: "Onaya dayalı erişim" }
  },
  {
    "Continuité du suivi": { en: "Continuity of care", ar: "استمرارية المتابعة", zh: "连续照护", tr: "Bakım sürekliliği" },
    "Mes absences & relais": { en: "My absences & cover", ar: "غياباتي والبدلاء", zh: "我的缺勤与替班", tr: "Devamsızlık ve yedeklerim" },
    "Prévenez suffisamment tôt pour que les patients sachent qui assure le relais.": { en: "Notify early enough so patients know who is covering.", ar: "أبلغ مبكراً بما يكفي ليعرف المرضى من سيتولى المتابعة.", zh: "请提前通知，让患者知道由谁接替。", tr: "Hastaların kimin devralacağını bilmesi için yeterince erken bildirin." },
    "Absences à venir": { en: "Upcoming absences", ar: "الغيابات القادمة", zh: "即将缺勤", tr: "Yaklaşan devamsızlıklar" },
    "Les patients rattachés sont informés depuis leur accueil AURA.": { en: "Assigned patients are informed from their AURA home screen.", ar: "يتم إبلاغ المرضى المرتبطين من شاشة AURA الرئيسية.", zh: "相关患者会在AURA首页收到通知。", tr: "Bağlı hastalar AURA ana ekranından bilgilendirilir." },
    "Absence planifiée": { en: "Planned absence", ar: "غياب مخطط", zh: "计划缺勤", tr: "Planlı devamsızlık" },
    "Relais à définir": { en: "Cover to be assigned", ar: "البديل غير محدد", zh: "替班待定", tr: "Yedek belirlenecek" },
    "Planifiée": { en: "Planned", ar: "مخططة", zh: "已计划", tr: "Planlandı" },
    "Aucune absence planifiée.": { en: "No planned absence.", ar: "لا يوجد غياب مخطط.", zh: "暂无计划缺勤。", tr: "Planlı devamsızlık yok." },
    "Déclarer une absence": { en: "Report an absence", ar: "تسجيل غياب", zh: "申报缺勤", tr: "Devamsızlık bildir" },
    "Choisissez si possible un médecin relais.": { en: "Choose a covering doctor if possible.", ar: "اختر طبيباً بديلاً إن أمكن.", zh: "如可能请选择替班医生。", tr: "Mümkünse yedek bir doktor seçin." }
  },
  {
    "Configuration établissement": { en: "Facility configuration", ar: "إعدادات المؤسسة", zh: "机构配置", tr: "Kurum yapılandırması" },
    "Administration": { en: "Administration", ar: "الإدارة", zh: "管理", tr: "Yönetim" },
    "Voir l’activité": { en: "View activity", ar: "عرض النشاط", zh: "查看活动", tr: "Aktiviteyi gör" },
    "Admissions, chambres et présence": { en: "Admissions, rooms and presence", ar: "الدخول والغرف والحضور", zh: "入院、房间与在院状态", tr: "Yatış, odalar ve durum" },
    "Sorties": { en: "Discharges", ar: "الخروج", zh: "出院", tr: "Taburcular" },
    "Suivi des sorties à préparer": { en: "Track discharges to prepare", ar: "متابعة حالات الخروج للتحضير", zh: "跟踪待准备出院", tr: "Hazırlanacak taburcuları takip et" },
    "Chambres et tâches opérationnelles": { en: "Rooms and operational tasks", ar: "الغرف والمهام التشغيلية", zh: "房间与运营任务", tr: "Odalar ve operasyon görevleri" },
    "Utilisateurs": { en: "Users", ar: "المستخدمون", zh: "用户", tr: "Kullanıcılar" },
    "Rôles et accès": { en: "Roles and access", ar: "الأدوار والوصول", zh: "角色与访问", tr: "Roller ve erişim" },
    "Rendez-vous": { en: "Appointments", ar: "المواعيد", zh: "预约", tr: "Randevular" },
    "Invitations": { en: "Invitations", ar: "الدعوات", zh: "邀请", tr: "Davetler" },
    "En attente d’acceptation": { en: "Awaiting acceptance", ar: "بانتظار القبول", zh: "等待接受", tr: "Kabul bekliyor" },
    "Mode présentation verrouillé": { en: "Locked presentation mode", ar: "وضع العرض المقفل", zh: "锁定演示模式", tr: "Kilitli sunum modu" },
    "Démo sécurisée": { en: "Secure demo", ar: "عرض تجريبي آمن", zh: "安全演示", tr: "Güvenli demo" },
    "Utilisateurs et rôles": { en: "Users and roles", ar: "المستخدمون والأدوار", zh: "用户与角色", tr: "Kullanıcılar ve roller" },
    "Utilisateur": { en: "User", ar: "المستخدم", zh: "用户", tr: "Kullanıcı" },
    "Rôle dans cette clinique": { en: "Role in this clinic", ar: "الدور في هذه العيادة", zh: "在本诊所的角色", tr: "Bu klinikteki rol" },
    "Accès": { en: "Access", ar: "الوصول", zh: "访问", tr: "Erişim" },
    "Actif": { en: "Active", ar: "نشط", zh: "启用", tr: "Aktif" },
    "Aucun utilisateur pour le moment.": { en: "No user for now.", ar: "لا يوجد مستخدم حالياً.", zh: "目前暂无用户。", tr: "Şimdilik kullanıcı yok." }
  },
  {
    "Tests navigation · 30 derniers jours": { en: "Navigation tests · Last 30 days", ar: "اختبارات التنقل · آخر 30 يوماً", zh: "导航测试 · 最近30天", tr: "Navigasyon testleri · Son 30 gün" },
    "Mesure UX": { en: "UX measurement", ar: "قياس تجربة المستخدم", zh: "UX测量", tr: "UX ölçümü" },
    "Démarrer un test": { en: "Start a test", ar: "بدء اختبار", zh: "开始测试", tr: "Test başlat" },
    "Arrêter le test": { en: "Stop test", ar: "إيقاف الاختبار", zh: "停止测试", tr: "Testi durdur" },
    "Sessions testées": { en: "Test sessions", ar: "جلسات الاختبار", zh: "测试会话", tr: "Test oturumları" },
    "Pages vues": { en: "Page views", ar: "الصفحات المعروضة", zh: "页面浏览", tr: "Görüntülenen sayfalar" },
    "Clics navigation": { en: "Navigation clicks", ar: "نقرات التنقل", zh: "导航点击", tr: "Navigasyon tıklamaları" },
    "Clics / session": { en: "Clicks / session", ar: "النقرات / الجلسة", zh: "点击 / 会话", tr: "Tıklama / oturum" },
    "Lecture par profil": { en: "Breakdown by profile", ar: "القراءة حسب الملف", zh: "按角色分析", tr: "Profile göre görünüm" },
    "Profil": { en: "Profile", ar: "الملف", zh: "角色", tr: "Profil" },
    "Sessions": { en: "Sessions", ar: "الجلسات", zh: "会话", tr: "Oturumlar" },
    "Clics": { en: "Clicks", ar: "النقرات", zh: "点击", tr: "Tıklamalar" },
    "Destinations les plus utilisées": { en: "Most used destinations", ar: "الوجهات الأكثر استخداماً", zh: "最常用目标页面", tr: "En çok kullanılan hedefler" },
    "Destination": { en: "Destination", ar: "الوجهة", zh: "目标", tr: "Hedef" },
    "Aucune session de test mesurée pour le moment.": { en: "No measured test session for now.", ar: "لا توجد جلسة اختبار مقاسة حالياً.", zh: "目前暂无已测测试会话。", tr: "Şimdilik ölçülmüş test oturumu yok." }
  },
  {
    "Ouvrir": { en: "Open", ar: "فتح", zh: "打开", tr: "Aç" },
    "Voir": { en: "View", ar: "عرض", zh: "查看", tr: "Gör" },
    "Lire": { en: "Read", ar: "قراءة", zh: "阅读", tr: "Oku" },
    "Retour": { en: "Return", ar: "العودة", zh: "返回", tr: "Dönüş" },
    "Départ": { en: "Departure", ar: "المغادرة", zh: "离院", tr: "Çıkış" },
    "Message": { en: "Message", ar: "رسالة", zh: "消息", tr: "Mesaj" },
    "Enregistrement…": { en: "Saving…", ar: "جارٍ الحفظ…", zh: "保存中…", tr: "Kaydediliyor…" },
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
    "déc.": { en: "Dec", ar: "ديسمبر", zh: "12月", tr: "Ara" }
  }
);

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
