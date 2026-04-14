import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useLanguage, type Lang } from "../contexts/LanguageContext";
import { Colors } from "../constants/colors";
import { Sizes } from "../constants/sizes";

const { height: SCREEN_H } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────

export default function SplashLoginScreen() {
  const { lang, setLang, t } = useLanguage();

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Phase 1: splash entrance ──────────────────────────────────────────────
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(0.82)).current;
  const sloganAnim = useRef(new Animated.Value(0)).current;

  // ── Phase 2: logo floats up ────────────────────────────────────────────────
  const logoUpProgress = useRef(new Animated.Value(0)).current; // 0 → 1

  // ── Phase 2: form card slides up ──────────────────────────────────────────
  const formTranslateY = useRef(new Animated.Value(SCREEN_H)).current;
  const formOpacity    = useRef(new Animated.Value(0)).current;

  // ── Interpolated logo transform ───────────────────────────────────────────
  const logoTranslateY = logoUpProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(SCREEN_H * 0.27)],
  });
  const logoScale = logoUpProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.72],
  });

  // ── Boot sequence ─────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start(() =>
      Animated.timing(sloganAnim, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true })
        .start(() => setTimeout(checkSessionAndTransition, 500))
    );
  }, []);

  const checkSessionAndTransition = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.role === "tierheim")  { router.replace("/tierheim/dashboard"); return; }
        if (profile?.role === "tierhalter") { router.replace("/gassi/feed");        return; }
        router.replace("/adoption/feed");
        return;
      }
    } catch {}

    // No session → animate into login
    startTransition();
  };

  const startTransition = () => {
    Animated.parallel([
      // Logo drifts up and shrinks
      Animated.timing(logoUpProgress, {
        toValue: 1,
        duration: 580,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Form card chases the logo upward (short delay for a "pull" feel)
      Animated.sequence([
        Animated.delay(160),
        Animated.parallel([
          Animated.timing(formTranslateY, {
            toValue: 0,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 380,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  };

  // ── Login logic ───────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t.login_err_missing, t.login_err_missing_msg);
      return;
    }
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role === "tierheim")   router.replace("/tierheim/dashboard");
      else if (profile?.role === "tierhalter") router.replace("/gassi/feed");
      else router.replace("/adoption/feed");
    } catch (err: any) {
      Alert.alert(t.login_err_failed, err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>

      {/* ── Gradient background (always full-screen) ── */}
      <LinearGradient
        colors={["#F0956A", "#E27289"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Language toggle ── */}
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

      {/* ── Logo — centered in splash, floats up on transition ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: "center",
            justifyContent: "center",
            opacity: fadeAnim,
            transform: [
              { translateY: logoTranslateY },
              { scale: logoScale },
            ],
          },
        ]}
      >
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

      {/* ── Login form card — slides up from below ── */}
      <Animated.View
        style={[
          styles.formCard,
          {
            transform: [{ translateY: formTranslateY }],
            opacity: formOpacity,
          },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.formTitle}>{t.login_title}</Text>

          {/* ── Fields ── */}
          <View style={{ gap: 14 }}>
            <View>
              <Text style={styles.inputLabel}>{t.login_email}</Text>
              <TextInput
                style={styles.inputField}
                placeholder={t.login_email_placeholder}
                placeholderTextColor={Colors.TEXT_MUTED}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text style={styles.inputLabel}>{t.login_password}</Text>
              <TextInput
                style={styles.inputField}
                placeholder="••••••••"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
            </View>
          </View>

          {/* Forgot password */}
          <TouchableOpacity style={{ alignSelf: "flex-end", marginTop: 10 }}>
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: 13 }}>
              {t.login_forgot_password}
            </Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loginLoading}
            style={[styles.primaryBtn, loginLoading && { opacity: 0.7 }]}
          >
            {loginLoading ? (
              <ActivityIndicator color={Colors.WHITE} />
            ) : (
              <Text style={styles.primaryBtnText}>{t.login_btn}</Text>
            )}
          </TouchableOpacity>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t.login_or}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Apple */}
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => Alert.alert("Coming soon 🍎", t.login_apple)}
            activeOpacity={0.75}
          >
            <AntDesign name="apple1" size={20} color="#000000" />
            <Text style={styles.socialBtnText}>{t.login_apple}</Text>
          </TouchableOpacity>

          {/* Google */}
          <TouchableOpacity
            style={[styles.socialBtn, { marginTop: 12 }]}
            onPress={() => Alert.alert("Coming soon 🔍", t.login_google)}
            activeOpacity={0.75}
          >
            <AntDesign name="google" size={18} color="#DB4437" />
            <Text style={styles.socialBtnText}>{t.login_google}</Text>
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity
            onPress={() => router.push("/auth/register")}
            style={{ alignItems: "center", marginTop: 28 }}
          >
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>
              {t.login_no_account}{" "}
              <Text style={{ color: Colors.PRIMARY, fontWeight: "700" }}>
                {t.login_register}
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Language toggle ──────────────────────────────────────────────────────
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

  // ── Logo ─────────────────────────────────────────────────────────────────
  logoContainer: {
    width: 160,
    height: 160,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  appName: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 8,
    marginBottom: 6,
  },
  slogan: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "300",
    letterSpacing: 1.5,
    fontStyle: "italic",
  },

  // ── Form card ────────────────────────────────────────────────────────────
  formCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: SCREEN_H * 0.60,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DEDEDE",
    alignSelf: "center",
    marginBottom: 22,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 22,
  },

  // ── Form inputs ──────────────────────────────────────────────────────────
  inputLabel: {
    color: Colors.TEXT_MUTED,
    fontSize: Sizes.FONT_SM,
    marginBottom: 6,
    fontWeight: "500",
  },
  inputField: {
    height: Sizes.INPUT_HEIGHT,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: Sizes.RADIUS_LG,
    paddingHorizontal: Sizes.SPACING_MD,
    fontSize: Sizes.FONT_MD,
    color: Colors.TEXT,
    backgroundColor: Colors.SURFACE,
  },
  primaryBtn: {
    height: Sizes.BUTTON_HEIGHT,
    backgroundColor: Colors.PRIMARY,
    borderRadius: Sizes.RADIUS_FULL,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: Colors.WHITE,
    fontSize: Sizes.FONT_MD,
    fontWeight: "600",
  },

  // ── Divider ──────────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.BORDER,
  },
  dividerText: {
    marginHorizontal: 12,
    color: Colors.TEXT_MUTED,
    fontSize: 13,
  },

  // ── Social buttons ───────────────────────────────────────────────────────
  socialBtn: {
    height: Sizes.BUTTON_HEIGHT,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: Sizes.RADIUS_FULL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.WHITE,
  },
  socialBtnText: {
    fontSize: Sizes.FONT_MD,
    fontWeight: "500",
    color: Colors.TEXT,
  },
});
