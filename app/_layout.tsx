import "../global.css";
import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { supabase } from "../lib/supabase";
import {
  setupNotificationHandler,
  registerForPushNotificationsAsync,
  savePushToken,
} from "../lib/notifications";

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
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="adoption" />
        <Stack.Screen name="gassi" />
        <Stack.Screen name="tierheim" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="shelter" />
        <Stack.Screen name="pet" />
      </Stack>
    </>
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
