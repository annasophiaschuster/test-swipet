import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useFocusEffect } from "expo-router";
import GradientHeader from "../../components/GradientHeader";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLanguage } from "../../contexts/LanguageContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WalkItem {
  id: string;
  ersteller_id: string;
  ort: string;
  treffpunkt: string | null;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number | null;
  max_teilnehmer: number;
  persoenlicher_text: string | null;
  created_at: string;
  organizer_name: string | null;
  organizer_avatar: string | null;
  dog_foto: string | null;
  participant_count: number;
  my_status: string | null;
  is_mine: boolean;
}

type FilterType = "all" | "mine" | "joined";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseDateDE(str: string): string | null {
  const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function parseTime(str: string): string | null {
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function formatDateDE(iso: string, lang: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(lang === "en" ? "en-US" : "de-DE", {
    weekday: "short", day: "2-digit", month: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export default function GassiEventsScreen() {
  const { t, lang } = useLanguage();

  const [walks, setWalks]           = useState<WalkItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId]         = useState<string | null>(null);
  const [isGuest, setIsGuest]       = useState(false);
  const [filter, setFilter]         = useState<FilterType>("all");
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [newOrt, setNewOrt]         = useState("");
  const [newDatum, setNewDatum]     = useState("");
  const [newUhrzeit, setNewUhrzeit] = useState("");
  const [newDauer, setNewDauer]     = useState("");
  const [newMax, setNewMax]         = useState("10");
  const [newText, setNewText]       = useState("");
  const [saving, setSaving]         = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadWalks();
    }, [])
  );

  const loadWalks = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setUserId(uid);
      setIsGuest(!uid);

      const { data: walksData, error } = await supabase
        .from("walks")
        .select(`
          id, ersteller_id, ort, treffpunkt, datum, uhrzeit,
          dauer_minuten, max_teilnehmer, persoenlicher_text, created_at,
          organizer:profiles!ersteller_id(name, avatar_url, owner_pets(foto_url)),
          teilnehmer:walk_teilnehmer(user_id, status)
        `)
        .order("datum", { ascending: true })
        .order("uhrzeit", { ascending: true });

      if (error) throw error;

      const items: WalkItem[] = (walksData ?? []).map((w: any) => {
        const teilnehmer: { user_id: string; status: string }[] = w.teilnehmer ?? [];
        const myEntry = uid ? teilnehmer.find((te) => te.user_id === uid) : null;
        const dogFotos: { foto_url: string }[] = w.organizer?.owner_pets ?? [];
        return {
          id: w.id,
          ersteller_id: w.ersteller_id,
          ort: w.ort,
          treffpunkt: w.treffpunkt,
          datum: w.datum,
          uhrzeit: w.uhrzeit,
          dauer_minuten: w.dauer_minuten,
          max_teilnehmer: w.max_teilnehmer,
          persoenlicher_text: w.persoenlicher_text,
          created_at: w.created_at,
          organizer_name: w.organizer?.name ?? null,
          organizer_avatar: w.organizer?.avatar_url ?? null,
          dog_foto: dogFotos[0]?.foto_url ?? null,
          participant_count: teilnehmer.filter((te) => te.status === "angenommen").length,
          my_status: myEntry?.status ?? null,
          is_mine: uid ? w.ersteller_id === uid : false,
        };
      });

      setWalks(items);
    } catch (e) {
      console.error("GassiEventsScreen.loadWalks", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleJoin = async (walk: WalkItem) => {
    if (isGuest) { Alert.alert("", t.walks_guest_join_msg); return; }
    if (!userId) return;
    try {
      await supabase.from("walk_teilnehmer").upsert(
        { walk_id: walk.id, user_id: userId, status: "angenommen" },
        { onConflict: "walk_id,user_id" }
      );
      loadWalks();
    } catch (e) {
      console.error("handleJoin error", e);
    }
  };

  const handleLeave = async (walk: WalkItem) => {
    if (!userId) return;
    try {
      await supabase
        .from("walk_teilnehmer")
        .delete()
        .eq("walk_id", walk.id)
        .eq("user_id", userId);
      loadWalks();
    } catch (e) {
      console.error("handleLeave error", e);
    }
  };

  const handleCreate = async () => {
    if (!newOrt.trim()) { Alert.alert("", t.walks_err_ort); return; }
    const datumISO = parseDateDE(newDatum.trim());
    if (!datumISO) { Alert.alert("", t.walks_err_date); return; }
    const time = parseTime(newUhrzeit.trim());
    if (!time) { Alert.alert("", t.walks_err_time); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("walks").insert({
        ersteller_id: user.id,
        ort: newOrt.trim(),
        datum: datumISO,
        uhrzeit: time,
        dauer_minuten: newDauer ? parseInt(newDauer) : null,
        max_teilnehmer: parseInt(newMax) || 10,
        persoenlicher_text: newText.trim() || null,
      });
      setCreateOpen(false);
      setNewOrt(""); setNewDatum(""); setNewUhrzeit("");
      setNewDauer(""); setNewMax("10"); setNewText("");
      loadWalks();
    } catch (e) {
      console.error("handleCreate error", e);
    } finally {
      setSaving(false);
    }
  };

  const filteredWalks = walks.filter((w) => {
    if (filter === "mine") return w.is_mine;
    if (filter === "joined") return w.my_status === "angenommen" && !w.is_mine;
    return true;
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <GradientHeader
        title={t.walks_title}
        rightElement={
          !isGuest ? (
            <TouchableOpacity
              onPress={() => setCreateOpen(true)}
              style={{
                backgroundColor: Colors.WHITE + "30",
                borderRadius: Sizes.RADIUS_FULL,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: Colors.WHITE + "60",
              }}
            >
              <Text style={{ color: Colors.WHITE, fontWeight: "700", fontSize: 13 }}>
                {t.walks_create_btn}
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Filter Chips */}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: Sizes.SPACING_LG, paddingVertical: 10 }}>
        {(["all", "mine", "joined"] as FilterType[]).map((f) => {
          const active = filter === f;
          const label = f === "all" ? t.walks_filter_all : f === "mine" ? t.walks_filter_mine : t.walks_filter_joined;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99,
                backgroundColor: active ? Colors.SECONDARY : Colors.SURFACE,
                borderWidth: 1, borderColor: active ? Colors.SECONDARY : Colors.BORDER,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? Colors.WHITE : Colors.TEXT_MUTED }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.SECONDARY} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredWalks}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadWalks(true)} tintColor={Colors.SECONDARY} />
          }
          contentContainerStyle={{ paddingHorizontal: Sizes.SPACING_LG, paddingTop: 4, paddingBottom: 32, gap: 10 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 52, marginBottom: 16 }}>🐾</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.TEXT, textAlign: "center", marginBottom: 8 }}>
                {t.walks_empty_title}
              </Text>
              <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
                {t.walks_empty_sub}
              </Text>
            </View>
          }
          renderItem={({ item }) => <WalkCard walk={item} t={t} lang={lang} onJoin={handleJoin} onLeave={handleLeave} />}
        />
      )}

      {/* Create Walk Modal */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={{
            paddingTop: 20, paddingHorizontal: Sizes.SPACING_LG, paddingBottom: 14,
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
          }}>
            <TouchableOpacity onPress={() => setCreateOpen(false)}>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: 15 }}>{t.walks_cancel}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: "700", color: Colors.TEXT }}>{t.walks_create_title}</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              {saving
                ? <ActivityIndicator color={Colors.SECONDARY} size="small" />
                : <Text style={{ color: Colors.SECONDARY, fontSize: 15, fontWeight: "700" }}>{t.walks_save}</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 60 }}>
            {[
              { label: t.walks_field_ort,     value: newOrt,     setter: setNewOrt,     placeholder: "z.B. Stadtpark, Nordeingang", numeric: false },
              { label: t.walks_field_datum,   value: newDatum,   setter: setNewDatum,   placeholder: "15.04.2026",                  numeric: false },
              { label: t.walks_field_uhrzeit, value: newUhrzeit, setter: setNewUhrzeit, placeholder: "09:30",                       numeric: false },
              { label: t.walks_field_dauer,   value: newDauer,   setter: setNewDauer,   placeholder: "60",                          numeric: true  },
              { label: t.walks_field_max,     value: newMax,     setter: setNewMax,     placeholder: "10",                          numeric: true  },
            ].map(({ label, value, setter, placeholder, numeric }) => (
              <View key={label} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                  {label}
                </Text>
                <TextInput
                  value={value}
                  onChangeText={setter}
                  placeholder={placeholder}
                  placeholderTextColor={Colors.TEXT_MUTED}
                  keyboardType={numeric ? "numeric" : "default"}
                  style={{
                    borderWidth: 1.5, borderColor: Colors.BORDER, borderRadius: 12,
                    paddingHorizontal: 14, paddingVertical: 11,
                    fontSize: 15, color: Colors.TEXT, backgroundColor: Colors.BACKGROUND,
                  }}
                />
              </View>
            ))}

            <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
              {t.walks_field_text}
            </Text>
            <TextInput
              value={newText}
              onChangeText={setNewText}
              placeholder="Gemütlicher Morgenspaziergang…"
              placeholderTextColor={Colors.TEXT_MUTED}
              multiline numberOfLines={3}
              style={{
                borderWidth: 1.5, borderColor: Colors.BORDER, borderRadius: 12,
                paddingHorizontal: 14, paddingVertical: 11,
                fontSize: 15, color: Colors.TEXT, backgroundColor: Colors.BACKGROUND,
                height: 80, textAlignVertical: "top",
              }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Walk Card
// ─────────────────────────────────────────────────────────────────────────────

function WalkCard({
  walk, t, lang, onJoin, onLeave,
}: {
  walk: WalkItem;
  t: any;
  lang: string;
  onJoin: (w: WalkItem) => void;
  onLeave: (w: WalkItem) => void;
}) {
  const joined = walk.my_status === "angenommen";
  const full   = walk.participant_count >= walk.max_teilnehmer && !joined && !walk.is_mine;

  return (
    <View style={{
      backgroundColor: Colors.WHITE,
      borderRadius: Sizes.RADIUS_LG,
      borderWidth: 1,
      borderColor: joined ? Colors.SECONDARY + "50" : Colors.BORDER,
      padding: 16,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    }}>
      {/* Top row: date/time + avatar circles */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.SECONDARY }}>
            {formatDateDE(walk.datum, lang)}
          </Text>
          <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED }}>
            {walk.uhrzeit.slice(0, 5)}
            {walk.dauer_minuten ? ` · ${walk.dauer_minuten} ${t.walks_min_abbr}` : ""}
          </Text>
        </View>

        {/* Avatar circles: organizer + dog */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {walk.is_mine && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: Colors.SECONDARY + "20", marginRight: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: Colors.SECONDARY }}>{t.walks_organizer}</Text>
            </View>
          )}
          {joined && !walk.is_mine && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: Colors.SUCCESS + "20", marginRight: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: Colors.SUCCESS }}>✓ {t.walks_joined_label}</Text>
            </View>
          )}
          {walk.organizer_avatar ? (
            <Image
              source={{ uri: walk.organizer_avatar }}
              style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.WHITE, backgroundColor: Colors.SURFACE }}
            />
          ) : (
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.SECONDARY + "20", borderWidth: 2, borderColor: Colors.WHITE, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 14 }}>👤</Text>
            </View>
          )}
          {walk.dog_foto ? (
            <Image
              source={{ uri: walk.dog_foto }}
              style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.WHITE, backgroundColor: Colors.SURFACE, marginLeft: -8 }}
            />
          ) : (
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.PRIMARY + "20", borderWidth: 2, borderColor: Colors.WHITE, alignItems: "center", justifyContent: "center", marginLeft: -8 }}>
              <Text style={{ fontSize: 14 }}>🐶</Text>
            </View>
          )}
        </View>
      </View>

      {/* Location */}
      <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.TEXT, marginBottom: 2 }}>
        📍 {walk.ort}
      </Text>

      {/* Participants + Join button */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED }}>
          👥 {t.walks_participants(walk.participant_count)}{walk.max_teilnehmer ? ` / ${walk.max_teilnehmer}` : ""}
        </Text>

        {!walk.is_mine && (
          <TouchableOpacity
            onPress={() => joined ? onLeave(walk) : onJoin(walk)}
            disabled={full}
            style={{
              paddingHorizontal: 16, paddingVertical: 7, borderRadius: 99,
              backgroundColor: joined ? Colors.SURFACE : full ? Colors.BORDER : Colors.SECONDARY,
              borderWidth: 1,
              borderColor: joined ? Colors.BORDER : full ? Colors.BORDER : Colors.SECONDARY,
            }}
          >
            <Text style={{
              fontSize: 13, fontWeight: "700",
              color: joined ? Colors.TEXT_MUTED : full ? Colors.TEXT_MUTED : Colors.WHITE,
            }}>
              {joined ? t.walks_leave_btn : t.walks_join_btn}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
