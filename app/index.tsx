import { useEffect, useRef } from "react";
import { View, Text, Animated, Image, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { useLanguage, type Lang } from "../contexts/LanguageContext";

export default function SplashScreen() {
  const { lang, setLang } = useLanguage();

  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(0.82)).current;
  const sloganAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo → then check session and navigate
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start(() =>
      Animated.timing(sloganAnim, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true })
        .start(() => {
          // Small pause so user sees the slogan, then navigate
          setTimeout(navigateAfterSplash, 600);
        })
    );
  }, []);

  const navigateAfterSplash = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth/login");
        return;
      }

      // Session exists → route by role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.role === "tierheim") {
        router.replace("/tierheim/dashboard");
      } else if (profile?.role === "tierhalter") {
        router.replace("/gassi/feed");
      } else {
        router.replace("/adoption/feed");
      }
    } catch {
      router.replace("/auth/login");
    }
  };

  return (
    <LinearGradient
      colors={["#F0956A", "#E27289"]}
      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Language toggle */}
      <View style={styles.langToggleContainer}>
        {(["de", "en"] as Lang[]).map((l, i) => (
          <TouchableOpacity
            key={l}
            onPress={() => setLang(l)}
            style={[
              styles.langBtn,
              lang === l && styles.langBtnActive,
              i === 0 && { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
              i === 1 && { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
            ]}
          >
            <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
              {l.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logo + Title + Slogan — centred, takes full screen */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  langToggleContainer: {
    position: "absolute",
    top: 56,
    right: 20,
    flexDirection: "row",
    zIndex: 10,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  langBtnActive: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.5,
  },
  langBtnTextActive: {
    color: "#E27289",
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
});
