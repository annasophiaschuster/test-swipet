import { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { Colors } from "../constants/colors";

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Einblenden
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Nach 2s Auth-Check → weiterleiten
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Rolle prüfen → richtiges Ziel
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "tierheim") {
          router.replace("/shelter/dashboard");
        } else {
          router.replace("/(tabs)/swipe");
        }
      } else {
        router.replace("/auth/login");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={[Colors.SECONDARY, Colors.PRIMARY]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View
        style={{
          alignItems: "center",
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Text style={{ fontSize: 72, marginBottom: 8 }}>🐾</Text>
        <Text
          style={{
            fontSize: 48,
            fontWeight: "800",
            color: Colors.WHITE,
            letterSpacing: 6,
          }}
        >
          SWIPET
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: Colors.WHITE,
            opacity: 0.85,
            marginTop: 8,
            fontWeight: "300",
            letterSpacing: 2,
          }}
        >
          Finde deinen besten Freund
        </Text>
      </Animated.View>

      <View style={{ position: "absolute", bottom: 50 }}>
        <Text style={{ color: Colors.WHITE, opacity: 0.5, fontSize: 12 }}>
          Made with ❤️ for animals
        </Text>
      </View>
    </LinearGradient>
  );
}
