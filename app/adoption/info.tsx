import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLanguage } from "../../contexts/LanguageContext";

type CategoryKey = "basics" | "outdoor" | "care" | "play";

export default function InfoScreen() {
  const { t } = useLanguage();
  const [count, setCount] = useState<number | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("basics");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCount();
  }, []);

  const loadCount = async () => {
    try {
      const { count: c } = await supabase
        .from("pets")
        .select("id", { count: "exact", head: true })
        .eq("status", "vermittelt");
      setCount(c ?? 0);
    } catch {
      setCount(0);
    }
  };

  const toggleCheck = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const FAQ = [
    { q: t.info_faq_q1, a: t.info_faq_a1 },
    { q: t.info_faq_q2, a: t.info_faq_a2 },
    { q: t.info_faq_q3, a: t.info_faq_a3 },
    { q: t.info_faq_q4, a: t.info_faq_a4 },
    { q: t.info_faq_q5, a: t.info_faq_a5 },
    { q: t.info_faq_q6, a: t.info_faq_a6 },
    { q: t.info_faq_q7, a: t.info_faq_a7 },
  ];

  const CATEGORIES: { key: CategoryKey; label: string; items: string[] }[] = [
    {
      key: "basics",
      label: t.info_starter_cat_basics,
      items: [t.info_check_basics_1, t.info_check_basics_2, t.info_check_basics_3],
    },
    {
      key: "outdoor",
      label: t.info_starter_cat_outdoor,
      items: [t.info_check_outdoor_1, t.info_check_outdoor_2, t.info_check_outdoor_3],
    },
    {
      key: "care",
      label: t.info_starter_cat_care,
      items: [t.info_check_care_1, t.info_check_care_2, t.info_check_care_3, t.info_check_care_4],
    },
    {
      key: "play",
      label: t.info_starter_cat_play,
      items: [t.info_check_play_1, t.info_check_play_2, t.info_check_play_3],
    },
  ];

  const activeItems = CATEGORIES.find((c) => c.key === activeCategory)?.items ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. LIVE COUNTER ─────────────────────────────────────── */}
        <View style={{
          margin: 20,
          backgroundColor: "#FFF5F7",
          borderRadius: 24,
          paddingVertical: 32,
          paddingHorizontal: 24,
          alignItems: "center",
          shadowColor: Colors.PRIMARY,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
        }}>
          <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, textAlign: "center", marginBottom: 12 }}>
            {t.info_counter_prefix}
          </Text>

          {count === null ? (
            <ActivityIndicator color={Colors.PRIMARY} size="large" style={{ marginVertical: 8 }} />
          ) : (
            <Text style={{
              fontSize: 72,
              fontWeight: "900",
              color: Colors.PRIMARY,
              lineHeight: 80,
              marginBottom: 12,
            }}>
              {count}
            </Text>
          )}

          <Text style={{
            fontSize: 15,
            color: Colors.TEXT_MUTED,
            textAlign: "center",
            lineHeight: 22,
          }}>
            {t.info_counter_suffix}
          </Text>
        </View>

        {/* ── 2. ÜBER SWIPET ──────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{
            fontSize: 15,
            color: Colors.TEXT,
            textAlign: "center",
            lineHeight: 26,
            fontStyle: "italic",
          }}>
            {t.info_about_text}
          </Text>
        </View>

        {/* ── 3. FAQ ACCORDION ────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: Colors.TEXT, marginBottom: 14 }}>
            {t.info_faq_title}
          </Text>

          {FAQ.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setFaqOpen(faqOpen === i ? null : i)}
              activeOpacity={0.75}
              style={{
                backgroundColor: faqOpen === i ? "#FFF5F7" : Colors.SURFACE,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: faqOpen === i ? Colors.PRIMARY + "50" : Colors.BORDER,
                marginBottom: 8,
                overflow: "hidden",
              }}
            >
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                gap: 12,
              }}>
                <Text style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: "600",
                  color: Colors.TEXT,
                  lineHeight: 22,
                }}>
                  {item.q}
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: faqOpen === i ? Colors.PRIMARY : Colors.TEXT_MUTED,
                  fontWeight: "700",
                }}>
                  {faqOpen === i ? "▲" : "▼"}
                </Text>
              </View>

              {faqOpen === i && (
                <View style={{
                  paddingHorizontal: 16,
                  paddingBottom: 16,
                  borderTopWidth: 1,
                  borderTopColor: Colors.PRIMARY + "20",
                }}>
                  <Text style={{
                    fontSize: 14,
                    color: Colors.TEXT_MUTED,
                    lineHeight: 22,
                    paddingTop: 12,
                  }}>
                    {item.a}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 4. STARTER-PACK CHECKLISTE ──────────────────────────── */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: Colors.TEXT, marginBottom: 14 }}>
            {t.info_starter_pack_title}
          </Text>

          {/* 2×2 Category Grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setActiveCategory(cat.key)}
                  activeOpacity={0.75}
                  style={{
                    width: "47.5%",
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    alignItems: "center",
                    backgroundColor: active ? Colors.PRIMARY : Colors.SURFACE,
                    borderColor: active ? Colors.PRIMARY : Colors.BORDER,
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: active ? "#FFF" : Colors.TEXT,
                    textAlign: "center",
                  }}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Checklist Items */}
          <View style={{
            backgroundColor: Colors.SURFACE,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: Colors.BORDER,
            overflow: "hidden",
          }}>
            {activeItems.map((item, i) => {
              const id = `${activeCategory}-${i}`;
              const done = !!checked[id];
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => toggleCheck(id)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    padding: 16,
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: Colors.BORDER,
                  }}
                >
                  {/* Checkbox */}
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: done ? "#00C853" : Colors.BORDER,
                    backgroundColor: done ? "#00C853" : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {done && (
                      <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "700" }}>✓</Text>
                    )}
                  </View>

                  <Text style={{
                    flex: 1,
                    fontSize: 15,
                    color: done ? Colors.TEXT_MUTED : Colors.TEXT,
                    textDecorationLine: done ? "line-through" : "none",
                    lineHeight: 22,
                  }}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
