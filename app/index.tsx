import { useEffect, useRef } from "react";
import { View, Text, Animated, Image, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export default function SplashScreen() {
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.82)).current;
  const sloganAnim  = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;
  const buttonsSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Logo einblenden, dann Slogan, dann Buttons
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start(() =>
      Animated.timing(sloganAnim, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }).start(() =>
        Animated.parallel([
          Animated.timing(buttonsAnim,  { toValue: 1, duration: 420, delay: 100, useNativeDriver: true }),
          Animated.timing(buttonsSlide, { toValue: 0, duration: 380, delay: 100, useNativeDriver: true }),
        ]).start()
      )
    );
  }, []);

  return (
    <LinearGradient
      colors={["#F0956A", "#E27289"]}
      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* ── LOGO ── */}
      <View style={styles.logoSection}>
        <Animated.View style={{ alignItems: "center", opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/logo2.png")}
              style={{ width: 140, height: 140, borderRadius: 32 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>SWIPET</Text>
          <Animated.Text style={[styles.slogan, { opacity: sloganAnim }]}>
            Love at first sniff 🐾
          </Animated.Text>
        </Animated.View>
      </View>

      {/* ── BUTTONS ── immer sichtbar, nur Einblend-Animation */}
      <Animated.View style={[styles.buttonsSection, { opacity: buttonsAnim, transform: [{ translateY: buttonsSlide }] }]}>
        <DemoButton
          icon="🔍"
          title="Hundesuchende"
          subtitle="Finde deinen perfekten Hund zur Adoption"
          onPress={() => router.push("/adoption/feed")}
        />
        <DemoButton
          icon="🦮"
          title="Hundehaber"
          subtitle="Gassidate & Zucht für Hundebesitzer"
          onPress={() => router.push("/gassi/feed")}
        />
        <DemoButton
          icon="🏢"
          title="Tierheim"
          subtitle="Tiere verwalten & Anfragen bearbeiten"
          onPress={() => router.push("/tierheim/dashboard")}
        />

        <TouchableOpacity
          onPress={() => router.push("/auth/login")}
          style={styles.loginLink}
        >
          <Text style={styles.loginLinkText}>Bereits registriert? Anmelden →</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

// ── Demo-Button Komponente ──────────────────────────────────────────────────

function DemoButton({
  icon, title, subtitle, onPress,
}: {
  icon: string; title: string; subtitle: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.demoButton}>
      <Text style={styles.demoButtonIcon}>{icon}</Text>
      <View style={styles.demoButtonText}>
        <Text style={styles.demoButtonTitle}>{title}</Text>
        <Text style={styles.demoButtonSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.demoButtonChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  logoSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 160, height: 160, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },
  appName: {
    fontSize: 42, fontWeight: "800", color: "#FFFFFF",
    letterSpacing: 8, marginBottom: 6,
  },
  slogan: {
    fontSize: 15, color: "rgba(255,255,255,0.9)",
    fontWeight: "300", letterSpacing: 1.5, fontStyle: "italic",
  },
  buttonsSection: {
    paddingHorizontal: 20,
    paddingBottom: 44,
    gap: 12,
  },
  demoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    gap: 14,
  },
  demoButtonIcon: { fontSize: 30 },
  demoButtonText: { flex: 1 },
  demoButtonTitle: {
    fontSize: 17, fontWeight: "700", color: "#FFFFFF", marginBottom: 2,
  },
  demoButtonSubtitle: {
    fontSize: 13, color: "rgba(255,255,255,0.75)",
  },
  demoButtonChevron: {
    fontSize: 24, color: "rgba(255,255,255,0.7)", fontWeight: "300",
  },
  loginLink: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
  },
  loginLinkText: {
    fontSize: 14, color: "rgba(255,255,255,0.8)", letterSpacing: 0.3,
  },
});
