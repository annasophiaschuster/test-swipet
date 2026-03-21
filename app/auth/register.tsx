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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";

type Role = "adoptant" | "tierhalter" | "tierheim";

const ROLES: { key: Role; label: string; icon: string; description: string }[] = [
  {
    key: "adoptant",
    label: "Ich suche ein Tier",
    icon: "❤️",
    description: "Adoptiere ein Tier aus dem Tierheim",
  },
  {
    key: "tierhalter",
    label: "Ich habe ein Tier",
    icon: "🐾",
    description: "Finde Gassi- & Spieldatepartner",
  },
  {
    key: "tierheim",
    label: "Ich bin ein Tierheim",
    icon: "🏠",
    description: "Vermittle Tiere an liebevolle Familien",
  },
];

export default function RegisterScreen() {
  const [step, setStep] = useState<"role" | "details">("role");
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !role) {
      Alert.alert("Fehlende Angaben", "Bitte alle Felder ausfüllen.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Passwort zu kurz", "Mindestens 6 Zeichen erforderlich.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error("Kein Benutzer erstellt.");

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
      Alert.alert("Registrierung fehlgeschlagen", error.message);
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
        {/* Gradient Header */}
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
            <Text style={{ color: Colors.WHITE, opacity: 0.85, fontSize: 15 }}>← Zurück</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.WHITE, marginTop: 12 }}>
            {step === "role" ? "Wer bist du?" : "Dein Konto"}
          </Text>
          <Text style={{ color: Colors.WHITE, opacity: 0.8, marginTop: 4 }}>
            {step === "role"
              ? "Wähle deine Rolle um loszulegen"
              : "Erstelle dein kostenloses Konto"}
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
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: role === r.key ? Colors.PRIMARY : Colors.BORDER,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{r.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: Sizes.FONT_MD,
                          fontWeight: "700",
                          color: Colors.TEXT,
                        }}
                      >
                        {r.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: Sizes.FONT_SM,
                          color: Colors.TEXT_MUTED,
                          marginTop: 2,
                        }}
                      >
                        {r.description}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: role === r.key ? Colors.PRIMARY : Colors.BORDER,
                        backgroundColor: role === r.key ? Colors.PRIMARY : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
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
                    Alert.alert("Rolle wählen", "Bitte wähle eine Rolle um fortzufahren.");
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
                  Weiter →
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={{ gap: 14, marginBottom: 8 }}>
                <View>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Dein Name"
                    placeholderTextColor={Colors.TEXT_MUTED}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
                <View>
                  <Text style={styles.label}>E-Mail</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="deine@email.de"
                    placeholderTextColor={Colors.TEXT_MUTED}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View>
                  <Text style={styles.label}>Passwort</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Mindestens 6 Zeichen"
                    placeholderTextColor={Colors.TEXT_MUTED}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Gewählte Rolle anzeigen */}
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
                <Text style={{ fontSize: 20 }}>
                  {ROLES.find((r) => r.key === role)?.icon}
                </Text>
                <Text style={{ color: Colors.PRIMARY, fontWeight: "600", flex: 1 }}>
                  {ROLES.find((r) => r.key === role)?.label}
                </Text>
                <TouchableOpacity onPress={() => setStep("role")}>
                  <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>ändern</Text>
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
                    Konto erstellen 🎉
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Link href="/auth/login">
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM }}>
                Bereits ein Konto?{" "}
                <Text style={{ color: Colors.PRIMARY, fontWeight: "700" }}>Anmelden</Text>
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
