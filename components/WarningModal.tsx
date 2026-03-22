import { View, Text, TouchableOpacity, Modal, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { Colors } from "../constants/colors";
import { Sizes } from "../constants/sizes";
import { useLanguage } from "../contexts/LanguageContext";

interface WarningModalProps {
  visible: boolean;
  petName: string;
  warnings: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function WarningModal({
  visible,
  petName,
  warnings,
  onConfirm,
  onCancel,
}: WarningModalProps) {
  const { t } = useLanguage();
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 300,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
        activeOpacity={1}
        onPress={onCancel}
      >
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
          }}
        >
          <TouchableOpacity activeOpacity={1}>
            <View
              style={{
                backgroundColor: Colors.WHITE,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: Sizes.SPACING_LG,
                paddingBottom: 40,
              }}
            >
              {/* Handle */}
              <View
                style={{
                  width: 36,
                  height: 4,
                  backgroundColor: Colors.BORDER,
                  borderRadius: 2,
                  alignSelf: "center",
                  marginBottom: 20,
                }}
              />

              <Text style={{ fontSize: 22, marginBottom: 8, textAlign: "center" }}>⚠️</Text>
              <Text
                style={{
                  fontSize: Sizes.FONT_LG,
                  fontWeight: "700",
                  color: Colors.TEXT,
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                {t.comp_warning_title}
              </Text>

              <View
                style={{
                  backgroundColor: "#FFF8E1",
                  borderRadius: Sizes.RADIUS_LG,
                  padding: Sizes.SPACING_MD,
                  marginBottom: 24,
                  gap: 8,
                }}
              >
                {warnings.map((w, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <Text style={{ color: "#F57F17", marginTop: 1 }}>•</Text>
                    <Text style={{ color: Colors.TEXT, fontSize: Sizes.FONT_SM, flex: 1 }}>{w}</Text>
                  </View>
                ))}
              </View>

              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  onPress={onConfirm}
                  style={{
                    height: Sizes.BUTTON_HEIGHT,
                    backgroundColor: Colors.PRIMARY,
                    borderRadius: Sizes.RADIUS_FULL,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: Colors.WHITE, fontWeight: "600", fontSize: Sizes.FONT_MD }}>
                    {t.comp_warning_like_anyway}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onCancel}
                  style={{
                    height: Sizes.BUTTON_HEIGHT,
                    borderWidth: 1.5,
                    borderColor: Colors.BORDER,
                    borderRadius: Sizes.RADIUS_FULL,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: Colors.TEXT_MUTED, fontWeight: "600", fontSize: Sizes.FONT_MD }}>
                    {t.comp_warning_cancel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}
