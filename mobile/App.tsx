import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  cancelActivity,
  defaultFutureDate,
  enrollActivity,
  facilityNumber,
  facilityText,
  fetchActivities,
  fetchNotifications,
  fetchPermissions,
  fetchPlanning,
  fetchVisits,
  formatDateOnly,
  formatDateTime,
  loadPatientContext,
  markClinicalSenderRead,
  submitPermission,
  submitVisit,
  todayKey,
  zonedDateTimeToIso,
} from "./src/aura";
import { supabase } from "./src/supabase";
import { colors, radius } from "./src/theme";
import type {
  ActivityItem,
  NotificationItem,
  PatientContext,
  PermissionItem,
  PlanningEvent,
  VisitItem,
} from "./src/types";

type ScreenName = "home" | "planning" | "activities" | "visits" | "permissions" | "notifications" | "documents" | "profile";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [context, setContext] = useState<PatientContext | null>(null);
  const [contextError, setContextError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    if (!session) {
      setContext(null);
      setContextError("");
      return;
    }

    setContext(null);
    setContextError("");
    loadPatientContext()
      .then((value) => {
        if (active) setContext(value);
      })
      .catch((error: unknown) => {
        if (active) setContextError(error instanceof Error ? error.message : "Accès AURA impossible.");
      });

    return () => {
      active = false;
    };
  }, [session]);

  if (session === undefined) return <Splash label="Initialisation d’AURA…" />;
  if (!session) return <LoginScreen />;

  if (contextError) {
    return (
      <SafeAreaView style={styles.appShell}>
        <View style={styles.centerBox}>
          <Brand />
          <Text style={styles.errorTitle}>Accès mobile indisponible</Text>
          <Text style={styles.centerText}>{contextError}</Text>
          <PrimaryButton label="Se déconnecter" onPress={() => supabase.auth.signOut()} />
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (!context) return <Splash label="Chargement de votre espace patient…" />;

  return <PatientApp context={context} />;
}

function Splash({ label }: { label: string }) {
  return (
    <SafeAreaView style={styles.appShell}>
      <View style={styles.centerBox}>
        <Brand />
        <ActivityIndicator color={colors.teal} size="large" />
        <Text style={styles.centerText}>{label}</Text>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}><Text style={styles.brandMarkText}>A</Text></View>
      <View>
        <Text style={styles.brandName}>AURA</Text>
        <Text style={styles.brandSub}>Digital Healthcare</Text>
      </View>
    </View>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) setMessage("Connexion impossible. Vérifiez votre e-mail et votre mot de passe.");
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.loginShell}>
      <KeyboardAvoidingView
        style={styles.loginKeyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.loginCard}>
            <Brand />
            <View style={styles.patientPill}><Text style={styles.patientPillText}>♡ Espace patient</Text></View>
            <Text style={styles.loginTitle}>Votre séjour, simplement.</Text>
            <Text style={styles.loginCopy}>
              Planning, activités, visites et permissions AURA dans une application pensée pour le mobile.
            </Text>
            {message ? <Text style={styles.formError}>{message}</Text> : null}
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
            />
            <PrimaryButton
              label={loading ? "Connexion…" : "Se connecter"}
              onPress={login}
              disabled={loading || !email.trim() || !password}
            />
            <Text style={styles.loginFoot}>Votre compte est créé ou invité par votre établissement.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

function PatientApp({ context }: { context: PatientContext }) {
  const [screen, setScreen] = useState<ScreenName>("home");

  return (
    <SafeAreaView style={styles.appShell}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Brand />
        <View style={styles.topAccount}>
          <Text style={styles.topAccountName}>{context.fullName.split(" ")[0]}</Text>
          <Text style={styles.topAccountMeta}>Ch. {context.stay?.room_number || "—"}</Text>
        </View>
      </View>

      <View style={styles.contentShell}>
        {screen === "home" && <HomeScreen context={context} onNavigate={setScreen} />}
        {screen === "planning" && <PlanningScreen context={context} />}
        {screen === "activities" && <ActivitiesScreen context={context} />}
        {screen === "visits" && <VisitsScreen context={context} />}
        {screen === "permissions" && <PermissionsScreen context={context} onBack={() => setScreen("home")} />}
        {screen === "notifications" && <NotificationsScreen context={context} />}
        {screen === "documents" && <DocumentsScreen />}
        {screen === "profile" && <ProfileScreen context={context} onNavigate={setScreen} />}
      </View>

      <BottomNav screen={screen} onNavigate={setScreen} />
    </SafeAreaView>
  );
}

function BottomNav({
  screen,
  onNavigate,
}: {
  screen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
}) {
  const tabs: { key: ScreenName; icon: string; label: string }[] = [
    { key: "home", icon: "⌂", label: "Accueil" },
    { key: "planning", icon: "◷", label: "Planning" },
    { key: "activities", icon: "✦", label: "Activités" },
    { key: "visits", icon: "♧", label: "Visites" },
    { key: "profile", icon: "○", label: "Profil" },
  ];

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const active = screen === tab.key || (["permissions", "notifications", "documents"].includes(screen) && tab.key === "home");
        return (
          <Pressable key={tab.key} style={styles.navItem} onPress={() => onNavigate(tab.key)}>
            <Text style={[styles.navIcon, active && styles.navIconActive]}>{tab.icon}</Text>
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function HomeScreen({
  context,
  onNavigate,
}: {
  context: PatientContext;
  onNavigate: (screen: ScreenName) => void;
}) {
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEvents(await fetchPlanning(context, 7));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    void load();
  }, [load]);

  const now = Date.now();
  const today = todayKey(context);
  const todayEvents = events.filter((event) => dateKeyForEvent(event, context) === today);
  const nextEvents = events.filter((event) => new Date(event.startsAt).getTime() >= now).slice(0, 4);
  const alerts = nextEvents.filter((event) => ["VISITE", "PERMISSION", "ACTIVITÉ"].includes(event.kind)).slice(0, 2);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.teal} />}
    >
      <View style={styles.heroBlock}>
        <Text style={styles.kicker}>MA JOURNÉE</Text>
        <Text style={styles.heroTitle}>Bonjour {context.fullName.split(" ")[0]}</Text>
        <Text style={styles.heroMeta}>
          {context.facility.name} · Chambre {context.stay?.room_number || "—"} · {context.stay?.presence === "out" ? "Hors établissement" : "Présent"}
        </Text>
      </View>

      {error ? <ErrorBox message={error} /> : null}

      {alerts.length ? (
        <View style={styles.alertPanel}>
          <Text style={styles.sectionTitle}>À ne pas manquer</Text>
          {alerts.map((event) => (
            <View key={event.id} style={styles.alertRow}>
              <Text style={styles.alertIcon}>{event.kind === "VISITE" ? "♧" : event.kind === "PERMISSION" ? "✓" : "✦"}</Text>
              <View style={styles.flexOne}>
                <Text style={styles.alertTitle}>{event.title}</Text>
                <Text style={styles.alertText}>{formatDateTime(event.startsAt, context)} · {event.meta}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.quickGrid}>
        <QuickAction icon="◷" title="Planning" subtitle="Mon calendrier" onPress={() => onNavigate("planning")} />
        <QuickAction icon="✦" title="Activités" subtitle="Avec / sans prescription" onPress={() => onNavigate("activities")} />
        <QuickAction icon="♧" title="Visites" subtitle="Prévenir l’accueil" onPress={() => onNavigate("visits")} />
        <QuickAction icon="✓" title="Permissions" subtitle="Demander ou suivre" onPress={() => onNavigate("permissions")} />
        <QuickAction icon="●" title="Notifications" subtitle="Messages et changements" onPress={() => onNavigate("notifications")} />
        <QuickAction icon="▤" title="Documents" subtitle="Mon espace documentaire" onPress={() => onNavigate("documents")} />
      </View>

      <Card>
        <View style={styles.sectionHead}>
          <View>
            <Text style={styles.kicker}>AUJOURD’HUI</Text>
            <Text style={styles.sectionTitle}>
              {todayEvents.length ? todayEvents.length + " événement" + (todayEvents.length > 1 ? "s" : "") : "Journée calme"}
            </Text>
          </View>
          <Pressable onPress={() => onNavigate("planning")}><Text style={styles.linkText}>Calendrier →</Text></Pressable>
        </View>
        {todayEvents.length ? todayEvents.slice(0, 5).map((event) => (
          <EventRow key={event.id} event={event} context={context} />
        )) : <Text style={styles.emptyText}>Rien de prévu pour le moment.</Text>}
      </Card>

      <Card>
        <Text style={styles.kicker}>PROCHAINS RENDEZ-VOUS</Text>
        {nextEvents.length ? nextEvents.map((event) => (
          <EventRow key={event.id} event={event} context={context} />
        )) : <Text style={styles.emptyText}>Aucun événement à venir.</Text>}
      </Card>
    </ScrollView>
  );
}

function PlanningScreen({ context }: { context: PatientContext }) {
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEvents(await fetchPlanning(context, 7));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, PlanningEvent[]>();
    events.forEach((event) => {
      const key = dateKeyForEvent(event, context);
      map.set(key, [...(map.get(key) || []), event]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events, context]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.teal} />}
    >
      <PageTitle kicker="7 PROCHAINS JOURS" title="Mon planning" subtitle="Rendez-vous, activités, visites, permissions et passages médicaux au même endroit." />
      {error ? <ErrorBox message={error} /> : null}
      {groups.length ? groups.map(([key, items]) => (
        <Card key={key}>
          <Text style={styles.dayTitle}>{formatDateOnly(items[0].startsAt, context)}</Text>
          {items.map((event) => <EventRow key={event.id} event={event} context={context} />)}
        </Card>
      )) : !loading ? <Card><Text style={styles.emptyText}>Aucun événement planifié sur les 7 prochains jours.</Text></Card> : null}
    </ScrollView>
  );
}

function ActivitiesScreen({ context }: { context: PatientContext }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchActivities(context));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(item: ActivityItem) {
    setBusyId(item.id);
    try {
      const next = item.enrolled
        ? await cancelActivity(context, item.id)
        : await enrollActivity(context, item.id);
      setItems(next);
    } catch (e) {
      Alert.alert("Activité", messageOf(e));
    } finally {
      setBusyId("");
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.teal} />}
    >
      <PageTitle kicker="BIEN-ÊTRE & SÉJOUR" title="Activités" subtitle="Repérez les activités avec ou sans prescription et inscrivez-vous depuis l’application." />
      {error ? <ErrorBox message={error} /> : null}
      {items.map((item) => (
        <Card key={item.id}>
          <View style={styles.activityTop}>
            <Badge
              label={item.requiresPrescription ? "Avec prescription" : "Sans prescription"}
              tone={item.requiresPrescription ? "warning" : "success"}
            />
            {item.enrolled ? <Badge label="Inscrit" tone="success" /> : <Badge label="Disponible" tone="neutral" />}
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardText}>{item.description || "Activité proposée pendant votre séjour."}</Text>
          <Text style={styles.metaLine}>◷ {formatDateTime(item.startsAt, context)}</Text>
          <Text style={styles.metaLine}>⌖ {item.location || "Lieu à confirmer"}</Text>
          <Text style={styles.metaLine}>◎ Capacité : {item.capacity} places</Text>
          <PrimaryButton
            label={busyId === item.id ? "Mise à jour…" : item.enrolled ? "Se désinscrire" : "S’inscrire"}
            onPress={() => void toggle(item)}
            disabled={Boolean(busyId)}
            secondary={item.enrolled}
          />
        </Card>
      ))}
      {!items.length && !loading ? <Card><Text style={styles.emptyText}>Aucune activité à venir.</Text></Card> : null}
    </ScrollView>
  );
}

function VisitsScreen({ context }: { context: PatientContext }) {
  const [items, setItems] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState(defaultFutureDate(context, 2));
  const [startTime, setStartTime] = useState(facilityText(context, "visits.start_time", "13:00"));
  const [endTime, setEndTime] = useState("14:00");
  const [visitorOne, setVisitorOne] = useState("");
  const [visitorTwo, setVisitorTwo] = useState("");

  const visitStart = facilityText(context, "visits.start_time", "13:00");
  const visitEnd = facilityText(context, "visits.end_time", "17:00");
  const maxVisitors = facilityNumber(context, "visits.max_visitors", 2);
  const maxDuration = facilityNumber(context, "visits.max_duration_minutes", 60);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchVisits(context));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addVisit() {
    if (!visitorOne.trim()) {
      Alert.alert("Visite", "Indiquez le nom du visiteur.");
      return;
    }
    try {
      setSubmitting(true);
      const startsAt = zonedDateTimeToIso(date, startTime, context.facility.timezone);
      const endsAt = zonedDateTimeToIso(date, endTime, context.facility.timezone);
      if (new Date(endsAt) <= new Date(startsAt)) throw new Error("L’heure de fin doit être après l’heure de début.");
      await submitVisit({ startsAt, endsAt, visitorOneName: visitorOne, visitorTwoName: visitorTwo });
      setVisitorOne("");
      setVisitorTwo("");
      await load();
      Alert.alert("Visite enregistrée", "L’accueil a été prévenu.");
    } catch (e) {
      Alert.alert("Visite", messageOf(e));
    } finally {
      setSubmitting(false);
    }
  }

  const future = items.filter((item) => new Date(item.scheduledEnd).getTime() >= Date.now() && item.status !== "cancelled");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.teal} />}
    >
      <PageTitle kicker="VISITEURS" title="Mes visites" subtitle="Prévenez l’accueil et retrouvez vos prochains visiteurs." />
      {error ? <ErrorBox message={error} /> : null}

      <Card>
        <Text style={styles.cardTitle}>Ajouter une visite</Text>
        <Text style={styles.cardText}>Créneaux établissement : {visitStart}–{visitEnd} · {maxDuration} min max · {maxVisitors} visiteur{maxVisitors > 1 ? "s" : ""} max.</Text>
        <Field label="Date (AAAA-MM-JJ)" value={date} onChangeText={setDate} autoCapitalize="none" />
        <View style={styles.inlineFields}>
          <View style={styles.flexOne}><Field label="Début (HH:MM)" value={startTime} onChangeText={setStartTime} autoCapitalize="none" /></View>
          <View style={styles.flexOne}><Field label="Fin (HH:MM)" value={endTime} onChangeText={setEndTime} autoCapitalize="none" /></View>
        </View>
        <Field label="Visiteur 1" value={visitorOne} onChangeText={setVisitorOne} />
        {maxVisitors > 1 ? <Field label="Visiteur 2 (facultatif)" value={visitorTwo} onChangeText={setVisitorTwo} /> : null}
        <PrimaryButton label={submitting ? "Enregistrement…" : "Prévenir l’accueil"} onPress={() => void addVisit()} disabled={submitting} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Prochaines visites</Text>
        {future.length ? future.map((item) => (
          <View style={styles.listRow} key={item.id}>
            <View style={styles.listIcon}><Text>♧</Text></View>
            <View style={styles.flexOne}>
              <Text style={styles.listTitle}>{item.visitorOneName}{item.visitorTwoName ? " · " + item.visitorTwoName : ""}</Text>
              <Text style={styles.listMeta}>{formatDateTime(item.scheduledStart, context)}</Text>
            </View>
            <Badge label={visitStatusLabel(item.status)} tone={item.status === "arrived" ? "success" : "neutral"} />
          </View>
        )) : <Text style={styles.emptyText}>Aucune visite à venir.</Text>}
      </Card>
    </ScrollView>
  );
}

function PermissionsScreen({
  context,
  onBack,
}: {
  context: PatientContext;
  onBack: () => void;
}) {
  const [items, setItems] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState(defaultFutureDate(context, 3));
  const [departureTime, setDepartureTime] = useState("14:00");
  const [returnTime, setReturnTime] = useState("18:00");
  const [reason, setReason] = useState("");
  const minNotice = facilityNumber(context, "permissions.min_notice_hours", 48);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchPermissions(context));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    try {
      setSubmitting(true);
      const departureAt = zonedDateTimeToIso(date, departureTime, context.facility.timezone);
      const returnAt = zonedDateTimeToIso(date, returnTime, context.facility.timezone);
      if (new Date(returnAt) <= new Date(departureAt)) throw new Error("Le retour doit être après le départ.");
      await submitPermission({ departureAt, returnAt, reason });
      setReason("");
      await load();
      Alert.alert("Demande transmise", "Votre demande a été envoyée au médecin et au cadre.");
    } catch (e) {
      Alert.alert("Permission", messageOf(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.teal} />}
    >
      <Pressable style={styles.backButton} onPress={onBack}><Text style={styles.backButtonText}>← Accueil</Text></Pressable>
      <PageTitle kicker="SORTIES TEMPORAIRES" title="Mes permissions" subtitle={"Demandez et suivez vos permissions. Préavis établissement : " + minNotice + " h."} />
      {error ? <ErrorBox message={error} /> : null}

      <Card>
        <Text style={styles.cardTitle}>Nouvelle demande</Text>
        <Field label="Date (AAAA-MM-JJ)" value={date} onChangeText={setDate} autoCapitalize="none" />
        <View style={styles.inlineFields}>
          <View style={styles.flexOne}><Field label="Départ (HH:MM)" value={departureTime} onChangeText={setDepartureTime} autoCapitalize="none" /></View>
          <View style={styles.flexOne}><Field label="Retour (HH:MM)" value={returnTime} onChangeText={setReturnTime} autoCapitalize="none" /></View>
        </View>
        <Field label="Motif (facultatif)" value={reason} onChangeText={setReason} multiline />
        <PrimaryButton label={submitting ? "Envoi…" : "Envoyer la demande"} onPress={() => void send()} disabled={submitting} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Mes demandes</Text>
        {items.length ? items.map((item) => (
          <View style={styles.permissionRow} key={item.id}>
            <View style={styles.permissionHead}>
              <Text style={styles.listTitle}>{formatDateTime(item.departureAt, context)}</Text>
              <Badge label={permissionStatusLabel(item.status)} tone={permissionTone(item.status)} />
            </View>
            <Text style={styles.listMeta}>Retour : {formatDateTime(item.returnAt, context)}</Text>
            {item.reason ? <Text style={styles.cardText}>{item.reason}</Text> : null}
            {["submitted", "waiting"].includes(item.status) ? (
              <Text style={styles.waitingText}>
                En attente : {!item.doctorDecision ? "médecin" : ""}{!item.doctorDecision && !item.managerDecision ? " + " : ""}{!item.managerDecision ? "cadre" : ""}
              </Text>
            ) : null}
          </View>
        )) : <Text style={styles.emptyText}>Aucune demande enregistrée.</Text>}
      </Card>
    </ScrollView>
  );
}


function NotificationsScreen({ context }: { context: PatientContext }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busySender, setBusySender] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchNotifications(context));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(item: NotificationItem) {
    if (!item.senderId) return;
    setBusySender(item.senderId);
    try {
      await markClinicalSenderRead(item.senderId);
      await load();
    } catch (e) {
      Alert.alert("Notifications", messageOf(e));
    } finally {
      setBusySender("");
    }
  }

  const unread = items.filter((item) => item.unread).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.teal} />}
    >
      <PageTitle
        kicker="CENTRE AURA"
        title="Notifications"
        subtitle="Messages de l’équipe et changements concernant les activités auxquelles vous êtes inscrit."
      />
      {error ? <ErrorBox message={error} /> : null}
      <View style={styles.notificationSummary}>
        <Text style={styles.notificationSummaryNumber}>{unread}</Text>
        <View style={styles.flexOne}>
          <Text style={styles.notificationSummaryTitle}>notification{unread > 1 ? "s" : ""} non lue{unread > 1 ? "s" : ""}</Text>
          <Text style={styles.notificationSummaryText}>Les messages cliniques restent en réception uniquement côté patient.</Text>
        </View>
      </View>
      <Card>
        {items.length ? items.map((item) => (
          <View key={item.id} style={[styles.notificationRow, item.unread && styles.notificationUnread]}>
            <View style={styles.notificationIcon}>
              <Text style={styles.notificationIconText}>{item.kind === "MESSAGE" ? "✉" : "✦"}</Text>
            </View>
            <View style={styles.flexOne}>
              <View style={styles.notificationHead}>
                <Text style={styles.listTitle}>{item.title}</Text>
                {item.unread ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.cardText}>{item.body}</Text>
              <Text style={styles.listMeta}>{formatDateTime(item.createdAt, context)}</Text>
              {item.unread && item.senderId ? (
                <Pressable
                  onPress={() => void markRead(item)}
                  disabled={busySender === item.senderId}
                  style={styles.markReadButton}
                >
                  <Text style={styles.markReadText}>{busySender === item.senderId ? "Mise à jour…" : "Marquer comme lu"}</Text>
                </Pressable>
              ) : null}
            </View>
            {item.priority >= 2 ? <Badge label={item.priority >= 3 ? "Prioritaire" : "Important"} tone={item.priority >= 3 ? "danger" : "warning"} /> : null}
          </View>
        )) : !loading ? <Text style={styles.emptyText}>Aucune notification pour le moment.</Text> : null}
      </Card>
    </ScrollView>
  );
}

function DocumentsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <PageTitle
        kicker="DOSSIER PATIENT"
        title="Documents"
        subtitle="L’espace destiné aux ordonnances, comptes rendus et documents de séjour."
      />
      <View style={styles.documentPlaceholder}>
        <View style={styles.documentIcon}><Text style={styles.documentIconText}>▤</Text></View>
        <Text style={styles.cardTitle}>Module prêt à connecter</Text>
        <Text style={styles.documentText}>
          Aucun document n’est exposé dans cette version du MVP : le backend AURA actuel ne possède pas encore de module documentaire patient dédié.
        </Text>
        <Text style={styles.documentNote}>
          Cette approche évite de créer une base parallèle ou de modifier les données de production. L’écran est déjà prévu pour accueillir le futur module sécurisé.
        </Text>
      </View>
    </ScrollView>
  );
}

function ProfileScreen({
  context,
  onNavigate,
}: {
  context: PatientContext;
  onNavigate: (screen: ScreenName) => void;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <PageTitle kicker="MON COMPTE" title={context.fullName} subtitle="Votre espace patient AURA et les informations de votre séjour." />
      <Card>
        <InfoRow label="Établissement" value={context.facility.name} />
        <InfoRow label="Chambre" value={context.stay?.room_number || "Non renseignée"} />
        <InfoRow label="Présence" value={context.stay?.presence === "out" ? "Hors établissement" : "Dans l’établissement"} />
        <InfoRow label="Téléphone" value={context.phone || "Non renseigné"} />
        <InfoRow label="Fuseau horaire" value={context.facility.timezone} />
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Mes services</Text>
        <SecondaryRow icon="✓" title="Permissions de sortie" onPress={() => onNavigate("permissions")} />
        <SecondaryRow icon="◷" title="Mon planning" onPress={() => onNavigate("planning")} />
        <SecondaryRow icon="♧" title="Mes visites" onPress={() => onNavigate("visits")} />
        <SecondaryRow icon="●" title="Notifications" onPress={() => onNavigate("notifications")} />
        <SecondaryRow icon="▤" title="Documents" onPress={() => onNavigate("documents")} />
      </Card>
      <PrimaryButton label="Se déconnecter" secondary onPress={() => supabase.auth.signOut()} />
      <Text style={styles.versionText}>AURA Patient · MVP mobile 0.1</Text>
    </ScrollView>
  );
}

function PageTitle({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return (
    <View style={styles.pageTitle}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.pageTitleText}>{title}</Text>
      <Text style={styles.pageSubtitle}>{subtitle}</Text>
    </View>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function QuickAction({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickCard} onPress={onPress}>
      <View style={styles.quickIcon}><Text style={styles.quickIconText}>{icon}</Text></View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function EventRow({ event, context }: { event: PlanningEvent; context: PatientContext }) {
  return (
    <View style={styles.eventRow}>
      <View style={styles.eventTime}>
        <Text style={styles.eventTimeText}>
          {new Intl.DateTimeFormat(context.facility.locale || "fr-FR", {
            timeZone: context.facility.timezone,
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(event.startsAt))}
        </Text>
      </View>
      <View style={styles.flexOne}>
        <Text style={styles.eventKind}>{event.kind}</Text>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventMeta}>{event.meta}</Text>
      </View>
    </View>
  );
}

function Field({
  label,
  multiline,
  ...props
}: {
  label: string;
  multiline?: boolean;
} & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholderTextColor="#8ca0ad"
      />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  secondary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      style={[styles.button, secondary ? styles.buttonSecondary : styles.buttonPrimary, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{label}</Text>
    </Pressable>
  );
}

function Badge({ label, tone }: { label: string; tone: "success" | "warning" | "danger" | "neutral" }) {
  const toneStyle =
    tone === "success" ? styles.badgeSuccess :
    tone === "warning" ? styles.badgeWarning :
    tone === "danger" ? styles.badgeDanger :
    styles.badgeNeutral;
  const textStyle =
    tone === "success" ? styles.badgeSuccessText :
    tone === "warning" ? styles.badgeWarningText :
    tone === "danger" ? styles.badgeDangerText :
    styles.badgeNeutralText;

  return <View style={[styles.badge, toneStyle]}><Text style={[styles.badgeText, textStyle]}>{label}</Text></View>;
}

function ErrorBox({ message }: { message: string }) {
  return <View style={styles.errorBox}><Text style={styles.errorBoxText}>{message}</Text></View>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SecondaryRow({ icon, title, onPress }: { icon: string; title: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryRow} onPress={onPress}>
      <Text style={styles.secondaryIcon}>{icon}</Text>
      <Text style={styles.secondaryTitle}>{title}</Text>
      <Text style={styles.secondaryArrow}>›</Text>
    </Pressable>
  );
}

function dateKeyForEvent(event: PlanningEvent, context: PatientContext) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: context.facility.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(event.startsAt));
}

function permissionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    submitted: "Soumise",
    waiting: "En attente",
    approved: "Autorisée",
    refused: "Refusée",
    cancelled: "Annulée",
    departed: "Sortie",
    returned: "Terminée",
  };
  return labels[status] || status;
}

function permissionTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (["approved", "departed", "returned"].includes(status)) return "success";
  if (status === "refused") return "danger";
  if (["submitted", "waiting"].includes(status)) return "warning";
  return "neutral";
}

function visitStatusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "Prévue",
    arrived: "En cours",
    departed: "Terminée",
    cancelled: "Annulée",
  };
  return labels[status] || status;
}

function messageOf(value: unknown) {
  return value instanceof Error ? value.message : "Une erreur est survenue.";
}

const styles = StyleSheet.create({
  appShell: { flex: 1, backgroundColor: colors.canvas },
  contentShell: { flex: 1 },
  screen: { flex: 1 },
  screenContent: { padding: 18, paddingBottom: 32, gap: 14 },
  topBar: {
    minHeight: 66,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topAccount: { alignItems: "flex-end" },
  topAccountName: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  topAccountMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: { color: "white", fontSize: 19, fontWeight: "900" },
  brandName: { color: colors.navy, fontSize: 16, fontWeight: "900", letterSpacing: 1.5 },
  brandSub: { color: colors.muted, fontSize: 9, marginTop: -1 },
  bottomNav: {
    minHeight: 66,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 4 : 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: "row",
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  navIcon: { fontSize: 20, color: "#8aa0ad" },
  navIconActive: { color: colors.tealDeep },
  navLabel: { fontSize: 10, color: "#7f929e", fontWeight: "700" },
  navLabelActive: { color: colors.tealDeep },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 22 },
  centerText: { color: colors.muted, textAlign: "center", lineHeight: 21 },
  errorTitle: { color: colors.ink, fontSize: 22, fontWeight: "900", textAlign: "center" },
  loginShell: { flex: 1, backgroundColor: colors.canvas },
  loginKeyboard: { flex: 1 },
  loginScroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  loginCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
    padding: 24,
    gap: 14,
  },
  patientPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.mint,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginTop: 8,
  },
  patientPillText: { color: colors.tealDeep, fontSize: 12, fontWeight: "800" },
  loginTitle: { color: colors.ink, fontSize: 30, lineHeight: 34, fontWeight: "900", letterSpacing: -0.7 },
  loginCopy: { color: colors.muted, lineHeight: 21, marginBottom: 4 },
  loginFoot: { color: colors.muted, textAlign: "center", fontSize: 12, marginTop: 4 },
  formError: {
    color: colors.danger,
    backgroundColor: "#fff1f0",
    borderWidth: 1,
    borderColor: "#fecdc9",
    borderRadius: 10,
    padding: 11,
    fontSize: 13,
  },
  heroBlock: {
    backgroundColor: colors.navy,
    borderRadius: radius.large,
    padding: 20,
  },
  kicker: { color: colors.tealDeep, fontWeight: "900", letterSpacing: 1.1, fontSize: 11 },
  heroTitle: { color: "white", fontWeight: "900", fontSize: 28, marginTop: 8, letterSpacing: -0.6 },
  heroMeta: { color: "#c7d9e1", marginTop: 7, lineHeight: 20, fontSize: 13 },
  pageTitle: { marginBottom: 2 },
  pageTitleText: { color: colors.ink, fontSize: 28, fontWeight: "900", letterSpacing: -0.6, marginTop: 5 },
  pageSubtitle: { color: colors.muted, lineHeight: 20, marginTop: 5 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.medium,
    padding: 16,
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 3 },
  dayTitle: { color: colors.ink, fontSize: 17, fontWeight: "900", textTransform: "capitalize", marginBottom: 5 },
  linkText: { color: colors.tealDeep, fontSize: 12, fontWeight: "800" },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  cardText: { color: colors.muted, lineHeight: 20, marginBottom: 9 },
  metaLine: { color: colors.ink, fontSize: 13, marginTop: 5 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  quickCard: {
    width: "50%",
    padding: 5,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickIconText: { color: colors.tealDeep, fontSize: 18, fontWeight: "900" },
  quickTitle: { color: colors.ink, fontWeight: "900", fontSize: 15 },
  quickSubtitle: { color: colors.muted, fontSize: 11, marginTop: 2, lineHeight: 15 },
  alertPanel: {
    borderRadius: radius.medium,
    backgroundColor: "#fff9e9",
    borderWidth: 1,
    borderColor: "#f2deb0",
    padding: 14,
  },
  alertRow: { flexDirection: "row", gap: 10, paddingTop: 10 },
  alertIcon: { color: colors.warning, fontSize: 18, width: 24 },
  alertTitle: { color: colors.ink, fontWeight: "800" },
  alertText: { color: colors.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  eventRow: {
    flexDirection: "row",
    gap: 11,
    alignItems: "flex-start",
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  eventTime: {
    minWidth: 55,
    borderRadius: 10,
    backgroundColor: colors.blue,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  eventTimeText: { color: colors.navy, fontSize: 12, fontWeight: "900" },
  eventKind: { color: colors.tealDeep, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  eventTitle: { color: colors.ink, fontSize: 14, fontWeight: "900", marginTop: 2 },
  eventMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  activityTop: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 10 },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, alignSelf: "flex-start" },
  badgeText: { fontSize: 10, fontWeight: "900" },
  badgeSuccess: { backgroundColor: "#ecfdf3" },
  badgeSuccessText: { color: colors.success },
  badgeWarning: { backgroundColor: "#fff7dc" },
  badgeWarningText: { color: colors.warning },
  badgeDanger: { backgroundColor: "#fff1f0" },
  badgeDangerText: { color: colors.danger },
  badgeNeutral: { backgroundColor: "#eef3f6" },
  badgeNeutralText: { color: colors.muted },
  field: { gap: 6, marginBottom: 12 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#cbd9df",
    borderRadius: radius.small,
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: "top" },
  inlineFields: { flexDirection: "row", gap: 10 },
  button: {
    minHeight: 46,
    borderRadius: radius.small,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 7,
  },
  buttonPrimary: { backgroundColor: colors.teal },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "white", fontWeight: "900" },
  buttonSecondaryText: { color: colors.navy },
  listRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  listIcon: {
    width: 36,
    height: 36,
    backgroundColor: colors.mint,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: { color: colors.ink, fontWeight: "900", fontSize: 14 },
  listMeta: { color: colors.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  permissionRow: { paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  permissionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  waitingText: { color: colors.warning, fontSize: 12, fontWeight: "700", marginTop: 7 },
  notificationSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.navy,
    borderRadius: radius.medium,
    padding: 16,
  },
  notificationSummaryNumber: { color: "white", fontSize: 30, fontWeight: "900", minWidth: 36, textAlign: "center" },
  notificationSummaryTitle: { color: "white", fontSize: 14, fontWeight: "900" },
  notificationSummaryText: { color: "#c7d9e1", fontSize: 11, marginTop: 2, lineHeight: 16 },
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  notificationUnread: { backgroundColor: "#f4fbfa", marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10 },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationIconText: { color: colors.tealDeep, fontSize: 16, fontWeight: "900" },
  notificationHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal },
  markReadButton: { alignSelf: "flex-start", marginTop: 8, paddingVertical: 5, paddingHorizontal: 8 },
  markReadText: { color: colors.tealDeep, fontSize: 12, fontWeight: "900" },
  documentPlaceholder: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.large,
    padding: 24,
    alignItems: "center",
  },
  documentIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  documentIconText: { color: colors.tealDeep, fontSize: 27, fontWeight: "900" },
  documentText: { color: colors.muted, textAlign: "center", lineHeight: 21, marginTop: 3 },
  documentNote: {
    color: colors.ink,
    textAlign: "center",
    lineHeight: 19,
    fontSize: 12,
    marginTop: 14,
    backgroundColor: colors.blue,
    borderRadius: 10,
    padding: 12,
  },
  infoRow: { paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  infoLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  infoValue: { color: colors.ink, fontSize: 15, fontWeight: "800", marginTop: 3 },
  secondaryRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  secondaryIcon: { width: 28, color: colors.tealDeep, fontSize: 17, fontWeight: "900" },
  secondaryTitle: { flex: 1, color: colors.ink, fontWeight: "800" },
  secondaryArrow: { color: colors.muted, fontSize: 22 },
  versionText: { textAlign: "center", color: colors.muted, fontSize: 11, marginTop: 5 },
  errorBox: { backgroundColor: "#fff1f0", borderColor: "#fecdc9", borderWidth: 1, borderRadius: radius.small, padding: 12 },
  errorBoxText: { color: colors.danger, fontSize: 13 },
  emptyText: { color: colors.muted, paddingVertical: 14, textAlign: "center" },
  backButton: { alignSelf: "flex-start", paddingVertical: 5 },
  backButtonText: { color: colors.tealDeep, fontWeight: "800" },
  flexOne: { flex: 1 },
});
