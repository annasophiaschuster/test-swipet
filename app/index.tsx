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
import Svg, { Path } from "react-native-svg";
import { supabase } from "../lib/supabase";
import { useLanguage, type Lang } from "../contexts/LanguageContext";
import { Colors } from "../constants/colors";
import { Sizes } from "../constants/sizes";

const { height: SCREEN_H } = Dimensions.get("window");

// ── Apple logo from uploaded SVG (viewBox clips to the apple shape) ─────────
function AppleIcon({ size = 20, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="139.6875 0 1221 1500">
      <Path
        fill={color}
        d={
          "M 1321.835938 511.421875 C 1313.136719 518.171875 1159.539062 604.695312 " +
          "1159.539062 797.085938 C 1159.539062 1019.617188 1354.988281 1098.34375 " +
          "1360.835938 1100.292969 C 1359.9375 1105.089844 1329.789062 1208.109375 " +
          "1257.789062 1313.078125 C 1193.585938 1405.449219 1126.539062 1497.671875 " +
          "1024.539062 1497.671875 C 922.539062 1497.671875 896.289062 1438.4375 " +
          "778.539062 1438.4375 C 663.789062 1438.4375 622.988281 1499.621094 " +
          "529.6875 1499.621094 C 436.386719 1499.621094 371.289062 1414.144531 " +
          "296.4375 1309.179688 C 209.738281 1185.914062 139.6875 994.425781 " +
          "139.6875 812.679688 C 139.6875 521.171875 329.289062 366.566406 " +
          "515.886719 366.566406 C 615.039062 366.566406 697.6875 431.648438 " +
          "759.9375 431.648438 C 819.1875 431.648438 911.585938 362.667969 " +
          "1024.386719 362.667969 C 1067.136719 362.667969 1220.738281 366.566406 " +
          "1321.835938 511.421875 Z " +
          "M 970.835938 239.257812 C 1017.488281 183.925781 1050.488281 107.148438 " +
          "1050.488281 30.371094 C 1050.488281 19.722656 1049.585938 8.925781 " +
          "1047.636719 0.230469 C 971.738281 3.078125 881.4375 50.765625 " +
          "826.988281 113.894531 C 784.238281 162.480469 744.335938 239.257812 " +
          "744.335938 317.082031 C 744.335938 328.78125 746.289062 340.476562 " +
          "747.1875 344.222656 C 751.988281 345.125 759.789062 346.175781 " +
          "767.585938 346.175781 C 835.6875 346.175781 921.335938 300.589844 " +
          "970.835938 239.257812 Z"
        }
      />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SplashLoginScreen() {
  const { lang, setLang, t } = useLanguage();

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Phase 1: splash entrance ──────────────────────────────────────────────
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(0.82)).current;
  const sloganAnim = useRef(new Animated.Value(0)).current;

  // ── Phase 2: logo floats up ────────────────────────────────────────────────
  const logoUpProgress = useRef(new Animated.Value(0)).current;

  // Logo interpolations – move up 20 % of screen height, shrink to 72 %
  const logoTranslateY = logoUpProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(SCREEN_H * 0.20)],
  });
  const logoScale = logoUpProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.72],
  });

  // ── Phase 2: form slides up from below ────────────────────────────────────
  const formTranslateY = useRef(new Animated.Value(SCREEN_H)).current;
  const formOpacity    = useRef(new Animated.Value(0)).current;

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

        if (profile?.role === "tierheim")   { router.replace("/tierheim/dashboard"); return; }
        if (profile?.role === "tierhalter") { router.replace("/gassi/feed");        return; }
        router.replace("/adoption/feed");
        return;
      }
    } catch {}

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
      // Form slides up (160 ms delay creates a "chase" feel)
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

      if (profile?.role === "tierheim")        router.replace("/tierheim/dashboard");
      else if (profile?.role === "tierhalter") router.replace("/gassi/feed");
      else                                     router.replace("/adoption/feed");
    } catch (err: any) {
      Alert.alert(t.login_err_failed, err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>

      {/* ── Full-screen gradient (always visible, also behind form) ── */}
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

      {/* ── Form — slides up from below, floats on gradient (no white card) ── */}
      <Animated.View
        style={[
          styles.formContainer,
          {
            transform: [{ translateY: formTranslateY }],
            opacity: formOpacity,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.formTitle}>{t.login_title}</Text>

          {/* ── Fields ── */}
          <View style={{ gap: 12 }}>
            <View>
              <Text style={styles.inputLabel}>{t.login_email}</Text>
              <TextInput
                style={styles.inputField}
                placeholder={t.login_email_placeholder}
                placeholderTextColor="rgba(0,0,0,0.35)"
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
                placeholderTextColor="rgba(0,0,0,0.35)"
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
            <Text style={styles.forgotText}>{t.login_forgot_password}</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loginLoading}
            style={[styles.primaryBtn, loginLoading && { opacity: 0.7 }]}
          >
            {loginLoading ? (
              <ActivityIndicator color={Colors.PRIMARY} />
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
            activeOpacity={0.8}
          >
            <AppleIcon size={19} color="#FFFFFF" />
            <Text style={styles.socialBtnText}>{t.login_apple}</Text>
          </TouchableOpacity>

          {/* Google */}
          <TouchableOpacity
            style={[styles.socialBtn, { marginTop: 12 }]}
            onPress={() => Alert.alert("Coming soon", t.login_google)}
            activeOpacity={0.8}
          >
            <Image
              source={require("../assets/google-logo.png")}
              style={{ width: 20, height: 20, borderRadius: 3 }}
              resizeMode="contain"
            />
            <Text style={styles.socialBtnText}>{t.login_google}</Text>
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity
            onPress={() => router.push("/auth/register")}
            style={{ alignItems: "center", marginTop: 28 }}
          >
            <Text style={styles.registerText}>
              {t.login_no_account}{" "}
              <Text style={styles.registerLink}>{t.login_register}</Text>
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
  langBtnActive:     { backgroundColor: "rgba(255,255,255,0.9)" },
  langBtnText:       { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.85)", letterSpacing: 0.5 },
  langBtnTextActive: { color: "#E27289" },

  // ── Logo ─────────────────────────────────────────────────────────────────
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

  // ── Form container (no card background — gradient shows through) ──────────
  formContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    // Fixed height so it never grows and covers the logo above
    height: SCREEN_H * 0.58,
  },
  formScroll: {
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 44,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 20,
    letterSpacing: 0.3,
  },

  // ── Inputs ───────────────────────────────────────────────────────────────
  inputLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: Sizes.FONT_SM,
    marginBottom: 6,
    fontWeight: "600",
  },
  inputField: {
    height: Sizes.INPUT_HEIGHT,
    borderWidth: 0,
    borderRadius: Sizes.RADIUS_LG,
    paddingHorizontal: Sizes.SPACING_MD,
    fontSize: Sizes.FONT_MD,
    color: "#1A1A1A",
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  forgotText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
  },

  // ── Login button (white pill with gradient text color) ───────────────────
  primaryBtn: {
    height: Sizes.BUTTON_HEIGHT,
    backgroundColor: "rgba(255,255,255,1)",
    borderRadius: Sizes.RADIUS_FULL,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    shadowColor: "rgba(0,0,0,0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    color: Colors.PRIMARY,
    fontSize: Sizes.FONT_MD,
    fontWeight: "700",
  },

  // ── Divider ──────────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },

  // ── Social buttons (black — both Apple and Google) ───────────────────────
  socialBtn: {
    height: Sizes.BUTTON_HEIGHT,
    borderRadius: Sizes.RADIUS_FULL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#000000",
  },
  socialBtnText: {
    fontSize: Sizes.FONT_MD,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // ── Register link ─────────────────────────────────────────────────────────
  registerText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: Sizes.FONT_SM,
  },
  registerLink: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
