import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLanguage } from "../../contexts/LanguageContext";

const { height: SCREEN_H } = Dimensions.get("window");
const CARD_H = SCREEN_H * 0.74; // tall enough to show all content incl. register link

// ── Apple logo (path extracted from uploaded Apple.svg) ──────────────────────
function AppleIcon({ size = 19, color = "#FFFFFF" }: { size?: number; color?: string }) {
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

export default function LoginScreen() {
  const { t } = useLanguage();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  // ── Entrance: card slides up on mount ────────────────────────────────────
  const cardTranslateY = useRef(new Animated.Value(CARD_H)).current;
  const cardOpacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 440,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 340,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t.login_err_missing, t.login_err_missing_msg);
      return;
    }
    setLoading(true);
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
    } catch (error: any) {
      Alert.alert(t.login_err_failed, error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      {/* Full-screen gradient */}
      <LinearGradient
        colors={["#F0956A", "#E27289"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header — visible in the gradient strip above the card */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐾 SWIPET</Text>
        <Text style={styles.headerSub}>{t.login_welcome_back}</Text>
      </View>

      {/* White card slides up from below */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY: cardTranslateY }],
            opacity: cardOpacity,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.cardScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.cardTitle}>{t.login_title}</Text>

          <View style={{ gap: 12 }}>
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

          <TouchableOpacity style={{ alignSelf: "flex-end", marginTop: 10 }}>
            <Text style={styles.forgotText}>{t.login_forgot_password}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
          >
            {loading
              ? <ActivityIndicator color={Colors.WHITE} />
              : <Text style={styles.primaryBtnText}>{t.login_btn}</Text>}
          </TouchableOpacity>

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
            style={[styles.socialBtn, { marginTop: 10 }]}
            onPress={() => Alert.alert("Coming soon", t.login_google)}
            activeOpacity={0.8}
          >
            <Image
              source={require("../../assets/google-logo.png")}
              style={{ width: 20, height: 20, borderRadius: 3 }}
              resizeMode="contain"
            />
            <Text style={styles.socialBtnText}>{t.login_google}</Text>
          </TouchableOpacity>

          <View style={{ alignItems: "center", marginTop: 18, marginBottom: 8 }}>
            <TouchableOpacity onPress={() => router.push("/auth/register")}>
              <Text style={styles.registerText}>
                {t.login_no_account}{" "}
                <Text style={styles.registerLink}>{t.login_register}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 4,
    marginBottom: 8,
  },
  headerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    fontStyle: "italic",
  },

  // ── White card ────────────────────────────────────────────────────────────
  card: {
    height: CARD_H,
    backgroundColor: Colors.WHITE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  cardScroll: {
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 28,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 16,
  },

  // ── Inputs ───────────────────────────────────────────────────────────────
  inputLabel: {
    color: Colors.TEXT_MUTED,
    fontSize: Sizes.FONT_SM,
    fontWeight: "500",
    marginBottom: 6,
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
  forgotText: {
    color: Colors.TEXT_MUTED,
    fontSize: 13,
  },

  // ── Primary button ────────────────────────────────────────────────────────
  primaryBtn: {
    height: Sizes.BUTTON_HEIGHT,
    backgroundColor: Colors.PRIMARY,
    borderRadius: Sizes.RADIUS_FULL,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: Colors.WHITE,
    fontSize: Sizes.FONT_MD,
    fontWeight: "700",
  },

  // ── Divider ──────────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.BORDER },
  dividerText: { marginHorizontal: 12, color: Colors.TEXT_MUTED, fontSize: 13 },

  // ── Social buttons ────────────────────────────────────────────────────────
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
  registerText: { color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM },
  registerLink:  { color: Colors.PRIMARY, fontWeight: "700" },
});
