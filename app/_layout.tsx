import React, { useEffect, Component, ReactNode } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { supabase } from "../lib/supabase";
import {
  setupNotificationHandler,
  registerForPushNotificationsAsync,
  savePushToken,
} from "../lib/notifications";
import { LanguageProvider } from "../contexts/LanguageContext";

// ─── DEBUG ERROR BOUNDARY ────────────────────────────────────────────────────
// Temporary: catches any JS startup error and shows it on screen.
// Remove once the crash is identified and fixed.

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class DebugErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("=== SWIPET CRASH ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("Component stack:", info.componentStack);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const err = this.state.error;
      return (
        <View style={dbgStyles.container}>
          <ScrollView contentContainerStyle={dbgStyles.scroll}>
            <Text style={dbgStyles.title}>🔴 CRASH DETECTED</Text>
            <Text style={dbgStyles.label}>Error:</Text>
            <Text style={dbgStyles.message}>{err.message}</Text>
            <Text style={dbgStyles.label}>Stack:</Text>
            <Text style={dbgStyles.stack}>{err.stack ?? "no stack"}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const dbgStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#CC0000",
  },
  scroll: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFCCCC",
    marginTop: 16,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  message: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
    lineHeight: 22,
  },
  stack: {
    fontSize: 11,
    color: "#FFE0E0",
    lineHeight: 18,
    fontFamily: "monospace" as any,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

// Set up foreground notification display before any component renders
setupNotificationHandler();

export default function RootLayout() {
  useEffect(() => {
    // Register push token for the current session
    const registerToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const token = await registerForPushNotificationsAsync();
      if (token) await savePushToken(token);
    };
    registerToken();

    // Re-register on sign-in (e.g. new login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN") registerToken();
      }
    );

    // Handle notification tap while app is open or backgrounded
    const tapSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        handleNotificationTap(data);
      }
    );

    // Handle notification that cold-started the app
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as any;
      // Small delay lets the navigator initialise first
      setTimeout(() => handleNotificationTap(data), 300);
    });

    return () => {
      subscription.unsubscribe();
      tapSub.remove();
    };
  }, []);

  return (
    <DebugErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LanguageProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="adoption" />
            <Stack.Screen name="gassi" />
            <Stack.Screen name="tierheim" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="shelter" />
            <Stack.Screen name="pet/[petId]" />
          </Stack>
        </LanguageProvider>
      </GestureHandlerRootView>
    </DebugErrorBoundary>
  );
}

function handleNotificationTap(data: any) {
  if (!data?.screen || !data?.matchId) return;

  switch (data.screen) {
    // Adoptant receives a message from shelter
    case "adoptant_chat":
      router.push({
        pathname: "/adoption/chat/[matchId]",
        params: {
          matchId: data.matchId,
          petName: data.petName ?? "",
          petPhoto: data.petPhoto ?? "",
          shelterName: data.shelterName ?? "",
        },
      });
      break;

    // Shelter receives a match notification or adoptant message
    case "shelter_chat":
      router.push({
        pathname: "/tierheim/chat/[matchId]",
        params: {
          matchId: data.matchId,
          petName: data.petName ?? "",
          petPhoto: data.petPhoto ?? "",
          adoptantName: data.adoptantName ?? "",
        },
      });
      break;

    // Owner receives a message from the other owner
    case "owner_chat":
      router.push({
        pathname: "/gassi/chat/[matchId]",
        params: {
          matchId: data.matchId,
          petName: data.petName ?? "",
          petPhoto: data.petPhoto ?? "",
          ownerName: data.ownerName ?? "",
          modus: data.modus ?? "gassi",
        },
      });
      break;
  }
}
