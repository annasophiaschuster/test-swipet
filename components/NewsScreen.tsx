import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";
import { Sizes } from "../constants/sizes";
import { useLanguage } from "../contexts/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Article = {
  id: number;
  titleKey: keyof ReturnType<typeof useLanguage>["t"];
  previewKey: keyof ReturnType<typeof useLanguage>["t"];
  readTimeKey: keyof ReturnType<typeof useLanguage>["t"];
  catKey: keyof ReturnType<typeof useLanguage>["t"];
  emoji: string;
};

const ARTICLES: Article[] = [
  {
    id: 1,
    titleKey: "news_article1_title",
    previewKey: "news_article1_preview",
    readTimeKey: "news_article1_read_time",
    catKey: "news_cat_health",
    emoji: "💉",
  },
  {
    id: 2,
    titleKey: "news_article2_title",
    previewKey: "news_article2_preview",
    readTimeKey: "news_article2_read_time",
    catKey: "news_cat_training",
    emoji: "🎓",
  },
  {
    id: 3,
    titleKey: "news_article3_title",
    previewKey: "news_article3_preview",
    readTimeKey: "news_article3_read_time",
    catKey: "news_cat_food",
    emoji: "🍖",
  },
];

const CAT_COLORS: Record<string, string> = {
  news_cat_health: "#FFE4E8",
  news_cat_training: "#FFF0E0",
  news_cat_food: "#E8F5E9",
  news_cat_games: "#E3F2FD",
};
const CAT_TEXT_COLORS: Record<string, string> = {
  news_cat_health: Colors.PRIMARY,
  news_cat_training: Colors.SECONDARY,
  news_cat_food: "#5D9A5D",
  news_cat_games: "#1976D2",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface NewsScreenProps {
  accentColor?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NewsScreen({ accentColor = Colors.PRIMARY }: NewsScreenProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: accentColor + "22" }]}>
        <Text style={[styles.headerTitle, { color: accentColor }]}>
          📰 {t.news_title}
        </Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Event Card ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.news_event_section}</Text>
        </View>

        <View style={[styles.eventCard, { borderLeftColor: accentColor }]}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventEmoji}>🐕</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.eventTitle}>{t.news_event_title}</Text>
              <Text style={[styles.eventMeta, { color: accentColor }]}>
                📅 {t.news_event_date}
              </Text>
              <Text style={styles.eventMeta}>{t.news_event_location}</Text>
            </View>
          </View>
          <Text style={styles.eventDesc}>{t.news_event_desc}</Text>
          <TouchableOpacity
            style={[styles.eventBtn, { backgroundColor: accentColor }]}
            activeOpacity={0.8}
          >
            <Text style={styles.eventBtnText}>Mehr erfahren →</Text>
          </TouchableOpacity>
        </View>

        {/* ── Blog ── */}
        <View style={[styles.section, { marginTop: 28 }]}>
          <Text style={styles.sectionLabel}>{t.news_blog_section}</Text>
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {(["news_cat_health", "news_cat_training", "news_cat_food", "news_cat_games"] as const).map(
            (key) => (
              <View
                key={key}
                style={[
                  styles.catPill,
                  {
                    backgroundColor: CAT_COLORS[key] ?? "#F5F5F5",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.catPillText,
                    { color: CAT_TEXT_COLORS[key] ?? Colors.TEXT },
                  ]}
                >
                  {String(t[key])}
                </Text>
              </View>
            )
          )}
        </ScrollView>

        {/* Articles */}
        {ARTICLES.map((article) => {
          const isOpen = expanded === article.id;
          return (
            <TouchableOpacity
              key={article.id}
              activeOpacity={0.9}
              onPress={() => setExpanded(isOpen ? null : article.id)}
              style={styles.articleCard}
            >
              {/* Top Row */}
              <View style={styles.articleTop}>
                <View
                  style={[
                    styles.articleEmojiBg,
                    {
                      backgroundColor:
                        CAT_COLORS[String(article.catKey)] ?? "#F5F5F5",
                    },
                  ]}
                >
                  <Text style={styles.articleEmoji}>{article.emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.articleMetaRow}>
                    <Text
                      style={[
                        styles.articleCat,
                        { color: CAT_TEXT_COLORS[String(article.catKey)] ?? accentColor },
                      ]}
                    >
                      {String(t[article.catKey])}
                    </Text>
                    <Text style={styles.articleReadTime}>
                      ⏱ {String(t[article.readTimeKey])} {t.news_read_min}
                    </Text>
                  </View>
                  <Text style={styles.articleTitle} numberOfLines={isOpen ? 0 : 2}>
                    {String(t[article.titleKey])}
                  </Text>
                </View>
              </View>

              {/* Expandable Preview */}
              {isOpen && (
                <Text style={styles.articlePreview}>{String(t[article.previewKey])}</Text>
              )}

              <Text style={[styles.readMore, { color: accentColor }]}>
                {isOpen ? "Weniger anzeigen ↑" : t.news_read_more}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  scroll: { flex: 1, paddingHorizontal: 16 },
  section: { marginTop: 20, marginBottom: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: Colors.TEXT_MUTED,
  },

  // Event
  eventCard: {
    backgroundColor: Colors.SURFACE,
    borderRadius: Sizes.RADIUS_L,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  eventHeader: { flexDirection: "row", alignItems: "flex-start" },
  eventEmoji: { fontSize: 36 },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 4,
  },
  eventMeta: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    marginTop: 2,
  },
  eventDesc: {
    fontSize: 14,
    color: Colors.TEXT,
    marginTop: 12,
    lineHeight: 20,
  },
  eventBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: Sizes.RADIUS_M,
    alignItems: "center",
  },
  eventBtnText: { color: "#FFF", fontWeight: "600", fontSize: 14 },

  // Categories
  catRow: { paddingHorizontal: 0, paddingBottom: 4, gap: 8, marginBottom: 12 },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
  },
  catPillText: { fontSize: 13, fontWeight: "600" },

  // Articles
  articleCard: {
    backgroundColor: "#FFF",
    borderRadius: Sizes.RADIUS_L,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  articleTop: { flexDirection: "row", alignItems: "flex-start" },
  articleEmojiBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  articleEmoji: { fontSize: 22 },
  articleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  articleCat: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  articleReadTime: { fontSize: 11, color: Colors.TEXT_MUTED },
  articleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.TEXT,
    lineHeight: 21,
  },
  articlePreview: {
    fontSize: 14,
    color: Colors.TEXT_MUTED,
    lineHeight: 20,
    marginTop: 10,
  },
  readMore: { fontSize: 13, fontWeight: "600", marginTop: 10 },
});
