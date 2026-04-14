import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLanguage } from "../../contexts/LanguageContext";

type Role = "adoptant" | "tierhalter" | "tierheim";

export default function ConfirmEmailScreen() {
  const { t } = useLanguage();
  const { role, name, email } = useLocalSearchParams<{
    role: Role;
    name: string;
    email: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resent, setResent] = useState(false);

  // Listen for sign-in event (e.g. from deep link after email confirmation)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          await createProfileAndNavigate(session.user.id);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const createProfileAndNavigate = async (userId: string) => {
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        role: role,
        name: name,
      });
      if (error) throw error;

      if (role === "adoptant") {
        router.replace("/auth/onboarding/adoptant");
      } else if (role === "tierhalter") {
        router.replace("/auth/onboarding/tierhalter");
      } else {
        router.replace("/auth/onboarding/tierheim");
      }
    } catch (err: any) {
      console.error("Profile creation error:", err.message);
    }
  };

  const handleCheckConfirmation = async () => {
    setLoading(true);
    try {
      // Refresh session to detect confirmation
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        // Also try getSession in case refresh doesn't work
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error(t.confirm_email_not_yet_msg);
        }
        await createProfileAndNavigate(sessionData.session.user.id);
        return;
      }
      await createProfileAndNavigate(data.session.user.id);
    } catch (err: any) {
      import("react-native").then(({ Alert }) =>
        Alert.alert(t.confirm_email_not_yet, err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await supabase.auth.resend({ type: "signup", email: email ?? "" });
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch {
      // silently fail
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="mail-outline" size={72} color={Colors.PRIMARY} />
        </View>

        {/* Title & sub */}
        <Text style={styles.title}>{t.confirm_email_title}</Text>
        <Text style={styles.sub}>{t.confirm_email_sub}</Text>

        {/* Email display */}
        {email ? (
          <View style={styles.emailBadge}>
            <Ionicons name="at-outline" size={16} color={Colors.PRIMARY} />
            <Text style={styles.emailText}>{email}</Text>
          </View>
        ) : null}

        <Text style={styles.spam}>{t.confirm_email_spam}</Text>

        {/* Primary CTA */}
        <TouchableOpacity
          onPress={handleCheckConfirmation}
          disabled={loading}
          style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnPrimaryText}>{t.confirm_email_check}</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity
          onPress={handleResend}
          disabled={resendLoading}
          style={styles.btnSecondary}
        >
          {resendLoading ? (
            <ActivityIndicator color={Colors.PRIMARY} size="small" />
          ) : (
            <Text style={[styles.btnSecondaryText, resent && { color: Colors.SUCCESS }]}>
              {resent ? `✓ ${t.confirm_email_resent}` : t.confirm_email_resend}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.BACKGROUND },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.TEXT,
    textAlign: "center",
    marginBottom: 12,
  },
  sub: {
    fontSize: 15,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  emailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.SURFACE,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
  },
  emailText: {
    fontSize: 14,
    color: Colors.TEXT,
    fontWeight: "600",
  },
  spam: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    marginBottom: 32,
  },
  btnPrimary: {
    width: "100%",
    height: Sizes.BUTTON_HEIGHT,
    backgroundColor: Colors.PRIMARY,
    borderRadius: Sizes.RADIUS_FULL,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  btnPrimaryText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  btnSecondary: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    fontSize: 14,
    color: Colors.PRIMARY,
    fontWeight: "600",
  },
});
