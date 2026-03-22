import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function TierheimOnboarding() {
  const { t } = useLanguage();
  const [orgName, setOrgName] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telefon, setTelefon] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!orgName) {
      Alert.alert(t.err_generic, t.onb_shelter_err_name);
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.err_not_logged_in);
      const { error } = await supabase.from("shelter_profiles").insert({
        id: user.id,
        org_name: orgName,
        adresse,
        telefon,
        beschreibung,
      });
      if (error) throw error;
      router.replace("/tierheim/dashboard");
    } catch (error: any) {
      Alert.alert(t.err_generic, error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <ScrollView contentContainerStyle={{ padding: Sizes.SPACING_LG, paddingTop: 60 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: Colors.TEXT, marginBottom: 8 }}>
          {t.onb_shelter_title}
        </Text>
        <Text style={{ color: Colors.TEXT_MUTED, marginBottom: 28 }}>
          {t.onb_shelter_sub}
        </Text>

        <View style={{ gap: 14 }}>
          {[
            { label: t.onb_shelter_name, value: orgName, setter: setOrgName, placeholder: t.onb_shelter_name_placeholder },
            { label: t.onb_shelter_address, value: adresse, setter: setAdresse, placeholder: t.onb_shelter_address_placeholder },
            { label: t.onb_shelter_phone, value: telefon, setter: setTelefon, placeholder: t.onb_shelter_phone_placeholder },
          ].map((field) => (
            <View key={field.label}>
              <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginBottom: 6 }}>{field.label}</Text>
              <TextInput
                style={{
                  height: Sizes.INPUT_HEIGHT,
                  borderWidth: 1.5,
                  borderColor: Colors.BORDER,
                  borderRadius: Sizes.RADIUS_LG,
                  paddingHorizontal: Sizes.SPACING_MD,
                  fontSize: Sizes.FONT_MD,
                  color: Colors.TEXT,
                  backgroundColor: Colors.SURFACE,
                }}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.TEXT_MUTED}
                value={field.value}
                onChangeText={field.setter}
              />
            </View>
          ))}

          <View>
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: Sizes.FONT_SM, marginBottom: 6 }}>{t.onb_shelter_desc}</Text>
            <TextInput
              style={{
                minHeight: 100,
                borderWidth: 1.5,
                borderColor: Colors.BORDER,
                borderRadius: Sizes.RADIUS_LG,
                paddingHorizontal: Sizes.SPACING_MD,
                paddingTop: 12,
                fontSize: Sizes.FONT_MD,
                color: Colors.TEXT,
                backgroundColor: Colors.SURFACE,
              }}
              placeholder={t.onb_shelter_desc_placeholder}
              placeholderTextColor={Colors.TEXT_MUTED}
              value={beschreibung}
              onChangeText={setBeschreibung}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            onPress={handleFinish}
            disabled={loading}
            style={{
              height: Sizes.BUTTON_HEIGHT,
              backgroundColor: Colors.PRIMARY,
              borderRadius: Sizes.RADIUS_FULL,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 16,
            }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.WHITE} />
            ) : (
              <Text style={{ color: Colors.WHITE, fontSize: Sizes.FONT_MD, fontWeight: "600" }}>
                {t.onb_shelter_btn}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
