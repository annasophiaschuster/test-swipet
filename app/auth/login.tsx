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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLanguage } from "../../contexts/LanguageContext";

export default function LoginScreen() {
  const { t } = useLanguage();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  // ── Entrance animation ────────────────────────────────────────────────────
  const slideAnim   = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
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
      style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header gradient */}
        <LinearGradient
          colors={[Colors.SECONDARY, Colors.PRIMARY]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 200, alignItems: "center", justifyContent: "flex-end", paddingBottom: 32 }}
        >
          <Text style={{ fontSize: 36, fontWeight: "800", color: Colors.WHITE, letterSpacing: 4 }}>
            🐾 SWIPET
          </Text>
          <Text style={{ color: Colors.WHITE, opacity: 0.85, marginTop: 4, fontSize: 14 }}>
            {t.login_welcome_back}
          </Text>
        </LinearGradient>

        {/* Animated form content */}
        <Animated.View
          style={{
            padding: Sizes.SPACING_LG,
            paddingTop: 32,
            flex: 1,
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: "700", color: Colors.TEXT, marginBottom: 24 }}>
            {t.login_title}
          </Text>

          <View style={{ gap: 14 }}>
            <View>
              <Text style={styles.label}>{t.login_email}</Text>
              <TextInput
                style={styles.input}
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
              <Text style={styles.label}>{t.login_password}</Text>
              <TextInput
                style={styles.input}
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
            disabled={loading}
            style={[styles.primaryButton, loading && { opacity: 0.7 }]}
          >
            {loading ? (
              <ActivityIndicator color={Colors.WHITE} />
            ) : (
              <Text style={styles.primaryButtonText}>{t.login_btn}</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t.login_or}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Apple */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => Alert.alert("Coming soon 🍎", t.login_apple)}
            activeOpacity={0.75}
          >
            <AntDesign name="apple1" size={20} color="#000000" />
            <Text style={styles.socialButtonText}>{t.login_apple}</Text>
          </TouchableOpacity>

          {/* Google */}
          <TouchableOpacity
            style={[styles.socialButton, { marginTop: 12 }]}
            onPress={() => Alert.alert("Coming soon 🔍", t.login_google)}
            activeOpacity={0.75}
          >
            <AntDesign name="google" size={18} color="#DB4437" />
            <Text style={styles.socialButtonText}>{t.login_google}</Text>
          </TouchableOpacity>

          {/* Register link */}
          <View style={{ alignItems: "center", marginTop: 28, marginBottom: 16 }}>
            <TouchableOpacity onPress={() => router.push("/auth/register")}>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>
                {t.login_no_account}{" "}
                <Text style={{ color: Colors.PRIMARY, fontWeight: "700" }}>{t.login_register}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Colors.TEXT_MUTED,
    fontSize: Sizes.FONT_SM,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    height: Sizes.INPUT_HEIGHT,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: Sizes.RADIUS_LG,
    paddingHorizontal: Sizes.SPACING_MD,
    fontSize: Sizes.FONT_MD,
    color: Colors.TEXT,
    backgroundColor: Colors.SURFACE,
  },
  primaryButton: {
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
  primaryButtonText: {
    color: Colors.WHITE,
    fontSize: Sizes.FONT_MD,
    fontWeight: "600",
  },
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
  socialButton: {
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
  socialButtonText: {
    fontSize: Sizes.FONT_MD,
    fontWeight: "500",
    color: Colors.TEXT,
  },
});
