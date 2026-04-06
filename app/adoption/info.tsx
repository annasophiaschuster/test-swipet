import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLanguage } from "../../contexts/LanguageContext";

const STARTER_PACK = [
  { title: "Hundeleine 5m", hint: "Flexibel & langlebig", url: "https://www.amazon.de" },
  { title: "Hundenapf aus Edelstahl", hint: "Rutschfest, spülmaschinenfest", url: "https://www.amazon.de" },
  { title: "Orthopädisches Hundebett", hint: "Für alle Größen", url: "https://www.amazon.de" },
  { title: "Transportbox Hund", hint: "IATA-konform für Reisen", url: "https://www.amazon.de" },
  { title: "Hundegeschirr", hint: "Kein Zug, bequemer Sitz", url: "https://www.amazon.de" },
  { title: "Clicker-Training Set", hint: "Für den Einstieg in die Erziehung", url: "https://www.amazon.de" },
  { title: "Erste-Hilfe Set Hund", hint: "Notfallset für unterwegs", url: "https://www.amazon.de" },
];

export default function InfoScreen() {
  const { t } = useLanguage();
  const [count, setCount] = useState<number | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

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

  const FAQ = [
    { q: t.faq_hs_q1, a: t.faq_hs_a1 },
    { q: t.faq_hs_q2, a: t.faq_hs_a2 },
    { q: t.faq_hs_q3, a: t.faq_hs_a3 },
    { q: t.faq_hs_q4, a: t.faq_hs_a4 },
    { q: t.faq_hs_q5, a: t.faq_hs_a5 },
    { q: t.faq_hs_q6, a: t.faq_hs_a6 },
    { q: t.faq_hs_q7, a: t.faq_hs_a7 },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <ScrollView
        contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.TEXT }}>
            ℹ️ {t.tab_info}
          </Text>
        </View>

        {/* Über Swipet */}
        <View style={{
          marginBottom: 24,
          backgroundColor: Colors.SURFACE,
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: Colors.BORDER,
        }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.TEXT, marginBottom: 10 }}>
            {t.info_about_title}
          </Text>
          <Text style={{ fontSize: 15, color: Colors.TEXT_MUTED, lineHeight: 24 }}>
            {t.info_about_text}
          </Text>
        </View>

        {/* Live Counter */}
        <View style={{
          marginBottom: 24,
          backgroundColor: Colors.PRIMARY + "12",
          borderRadius: 20,
          padding: 28,
          alignItems: "center",
          borderWidth: 1,
          borderColor: Colors.PRIMARY + "30",
        }}>
          {count === null ? (
            <ActivityIndicator color={Colors.PRIMARY} size="large" style={{ marginBottom: 12 }} />
          ) : (
            <Text style={{ fontSize: 60, fontWeight: "900", color: Colors.PRIMARY, marginBottom: 10 }}>
              {count}
            </Text>
          )}
          <Text style={{ fontSize: 15, color: Colors.TEXT, textAlign: "center", fontWeight: "500", lineHeight: 22 }}>
            {t.info_counter_label}
          </Text>
        </View>

        {/* FAQ */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.TEXT, marginBottom: 14 }}>
            {t.info_faq_title}
          </Text>
          {FAQ.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setFaqOpen(faqOpen === i ? null : i)}
              style={{
                backgroundColor: Colors.SURFACE,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: faqOpen === i ? Colors.PRIMARY + "40" : Colors.BORDER,
                marginBottom: 8,
                overflow: "hidden",
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12 }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: Colors.TEXT }}>
                  {item.q}
                </Text>
                <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>
                  {faqOpen === i ? "▲" : "▼"}
                </Text>
              </View>
              {faqOpen === i && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, lineHeight: 21 }}>
                    {item.a}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Starter Pack */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.TEXT, marginBottom: 14 }}>
            {t.info_starter_pack_title}
          </Text>
          {STARTER_PACK.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => Linking.openURL(item.url)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: Colors.SURFACE,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: Colors.BORDER,
                marginBottom: 8,
              }}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.TEXT }}>{item.title}</Text>
                <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 }}>{item.hint}</Text>
              </View>
              <Text style={{ fontSize: 16, color: Colors.PRIMARY, fontWeight: "700" }}>→</Text>
            </TouchableOpacity>
          ))}
          <Text style={{ fontSize: 11, color: Colors.TEXT_MUTED, textAlign: "center", marginTop: 8, lineHeight: 16 }}>
            * Affiliate-Links — Swipet erhält eine kleine Provision beim Kauf
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
