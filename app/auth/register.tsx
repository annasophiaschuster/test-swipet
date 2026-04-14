import { useState } from "react";
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
  Image,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLanguage } from "../../contexts/LanguageContext";

type Role = "adoptant" | "tierhalter" | "tierheim";

// ── Role Icons ────────────────────────────────────────────────────────────────

function HeartIcon({ size = 36, color = Colors.PRIMARY }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 187.5 187.499992">
      <Path
        fill={color}
        d={
          "M 93.578125 182.566406 C 86.359375 179.109375 79.707031 175.324219 73.59375 171.28125 " +
          "C 5.46875 119.207031 0.0117188 50.28125 23.691406 34.460938 " +
          "C 65.183594 6.742188 90.996094 55.433594 90.996094 55.433594 " +
          "C 90.996094 55.433594 112.628906 4.382812 157.011719 32.273438 " +
          "C 186.691406 50.910156 175.246094 143.457031 93.578125 182.566406 Z"
        }
      />
    </Svg>
  );
}

function PawsIcon({ size = 36 }: { size?: number }) {
  return (
    <Image
      source={require("../../assets/icon-paws.png")}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

function HouseIcon({ size = 36, color = Colors.PRIMARY }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 187.5 187.499992">
      <Path
        fill={color}
        d={
          "M 94.875 16.589844 C 92.644531 16.589844 90.511719 17.421875 88.96875 18.898438 " +
          "L 51.3125 54.882812 L 51.273438 51.128906 C 51.230469 47.027344 47.578125 43.726562 43.101562 43.726562 " +
          "C 43.074219 43.726562 43.046875 43.726562 43.023438 43.730469 " +
          "C 38.507812 43.765625 34.882812 47.144531 34.925781 51.269531 " +
          "L 35.121094 70.355469 L 12.210938 92.25 " +
          "C 9.089844 95.234375 9.203125 99.960938 12.464844 102.816406 " +
          "C 13.683594 103.878906 15.171875 104.53125 16.714844 104.777344 " +
          "C 17.296875 103.566406 18.09375 102.457031 19.085938 101.511719 " +
          "L 87.269531 36.441406 C 89.4375 34.371094 92.222656 33.34375 95.003906 33.34375 " +
          "C 97.902344 33.34375 100.792969 34.457031 102.984375 36.679688 " +
          "L 171.316406 105.972656 C 172.472656 105.667969 173.578125 105.121094 174.53125 104.332031 " +
          "C 177.875 101.558594 178.128906 96.832031 175.09375 93.777344 " +
          "L 100.929688 19.042969 C 99.40625 17.507812 97.253906 16.617188 94.984375 16.589844 " +
          "C 94.949219 16.589844 94.910156 16.589844 94.875 16.589844 Z " +
          "M 95.007812 40.792969 L 26.820312 105.863281 L 26.820312 172.414062 " +
          "L 76.15625 172.414062 L 76.15625 120.40625 L 114.742188 120.40625 " +
          "L 114.742188 172.414062 L 164.078125 172.414062 L 164.078125 110.839844 Z"
        }
      />
    </Svg>
  );
}

function RoleIcon({ roleKey, size }: { roleKey: Role; size: number }) {
  if (roleKey === "adoptant")   return <HeartIcon size={size} color={Colors.PRIMARY} />;
  if (roleKey === "tierhalter") return <PawsIcon size={size} />;
  return <HouseIcon size={size} color={Colors.PRIMARY} />;
}

export default function RegisterScreen() {
  const { t } = useLanguage();
  const [step, setStep] = useState<"role" | "details">("role");
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const ROLES = [
    { key: "adoptant" as Role,    label: t.register_role_adoptant_label,   description: t.register_role_adoptant_desc },
    { key: "tierhalter" as Role,  label: t.register_role_tierhalter_label, description: t.register_role_tierhalter_desc },
    { key: "tierheim" as Role,    label: t.register_role_tierheim_label,   description: t.register_role_tierheim_desc },
  ];

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !role) {
      Alert.alert(t.register_err_missing, t.register_err_missing_msg);
      return;
    }
    if (password.length < 6) {
      Alert.alert(t.register_err_pw_short, t.register_err_pw_short_msg);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error(t.register_err_no_user);

      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        role,
        name: name.trim(),
      });
      if (profileError) throw profileError;

      if (role === "adoptant") {
        router.replace("/auth/onboarding/adoptant");
      } else if (role === "tierhalter") {
        router.replace("/auth/onboarding/tierhalter");
      } else {
        router.replace("/auth/onboarding/tierheim");
      }
    } catch (error: any) {
      Alert.alert(t.register_err_failed, error.message);
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
        <LinearGradient
          colors={[Colors.SECONDARY, Colors.PRIMARY]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 60,
            paddingBottom: 28,
            paddingHorizontal: Sizes.SPACING_LG,
          }}
        >
          <TouchableOpacity onPress={() => step === "details" ? setStep("role") : router.back()}>
            <Text style={{ color: Colors.WHITE, opacity: 0.85, fontSize: 15 }}>{t.register_back}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.WHITE, marginTop: 12 }}>
            {step === "role" ? t.register_step_role_title : t.register_step_details_title}
          </Text>
          <Text style={{ color: Colors.WHITE, opacity: 0.8, marginTop: 4 }}>
            {step === "role" ? t.register_step_role_sub : t.register_step_details_sub}
          </Text>
        </LinearGradient>

        <View style={{ padding: Sizes.SPACING_LG, flex: 1 }}>
          {step === "role" ? (
            <>
              <View style={{ gap: 12, marginBottom: 24 }}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setRole(r.key)}
                    style={{
                      padding: 18,
                      borderRadius: Sizes.RADIUS_XL,
                      borderWidth: 2,
                      borderColor: role === r.key ? Colors.PRIMARY : Colors.BORDER,
                      backgroundColor: role === r.key ? "#FFF0F3" : Colors.SURFACE,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <View
                      style={{
                        width: 58, height: 58, borderRadius: 14,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 2,
                        borderColor: role === r.key ? Colors.PRIMARY : Colors.BORDER,
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <RoleIcon roleKey={r.key} size={34} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>
                        {r.label}
                      </Text>
                      <Text style={{ fontSize: Sizes.FONT_SM, color: Colors.TEXT_MUTED, marginTop: 2 }}>
                        {r.description}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 24, height: 24, borderRadius: 12,
                        borderWidth: 2,
                        borderColor: role === r.key ? Colors.PRIMARY : Colors.BORDER,
                        backgroundColor: role === r.key ? Colors.PRIMARY : "transparent",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {role === r.key && (
                        <Text style={{ color: Colors.WHITE, fontSize: 12, fontWeight: "700" }}>✓</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (!role) {
                    Alert.alert(t.register_pick_role, t.register_pick_role_msg);
                    return;
                  }
                  setStep("details");
                }}
                style={{
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
                }}
              >
                <Text style={{ color: Colors.WHITE, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>
                  {t.register_next}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={{ gap: 14, marginBottom: 8 }}>
                <View>
                  <Text style={styles.label}>{t.register_name}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t.register_name_placeholder}
                    placeholderTextColor={Colors.TEXT_MUTED}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
                <View>
                  <Text style={styles.label}>{t.login_email}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t.register_email_placeholder}
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
                    placeholder={t.register_password_placeholder}
                    placeholderTextColor={Colors.TEXT_MUTED}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#FFF0F3",
                  borderRadius: Sizes.RADIUS_LG,
                  padding: 12,
                  marginBottom: 20,
                  gap: 8,
                }}
              >
                {role && <RoleIcon roleKey={role} size={22} />}
                <Text style={{ color: Colors.PRIMARY, fontWeight: "600", flex: 1 }}>
                  {ROLES.find((r) => r.key === role)?.label}
                </Text>
                <TouchableOpacity onPress={() => setStep("role")}>
                  <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>{t.register_change}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                style={[
                  {
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
                  },
                  loading && { opacity: 0.7 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.WHITE} />
                ) : (
                  <Text style={{ color: Colors.WHITE, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>
                    {t.register_create_btn}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Link href="/auth/login">
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>
                {t.register_has_account}{" "}
                <Text style={{ color: Colors.PRIMARY, fontWeight: "700" }}>{t.register_sign_in}</Text>
              </Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  label: {
    color: Colors.TEXT_MUTED,
    fontSize: Sizes.FONT_SM,
    marginBottom: 6,
    fontWeight: "500" as const,
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
};
