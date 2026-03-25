import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// ─── Handler (call once before app renders) ────────────────────────────────
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,   // legacy iOS compat
      shouldShowBanner: true,  // iOS 17+ banner (SDK 52)
      shouldShowList: true,    // iOS 17+ notification centre (SDK 52)
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Permission + Token ─────────────────────────────────────────────────────
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Swipet",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#E27289",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    const token = projectId
      ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
      : (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (e) {
    console.warn("getExpoPushTokenAsync error", e);
    return null;
  }
}

export async function savePushToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("push_tokens")
    .upsert({ user_id: user.id, token }, { onConflict: "user_id,token" });
}

// ─── Internal helpers ────────────────────────────────────────────────────────
async function sendPushToUser(
  recipientUserId: string,
  title: string,
  body: string,
  data: Record<string, any>
) {
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", recipientUserId);

  if (!tokens || tokens.length === 0) return;

  const messages = tokens.map(({ token }: { token: string }) => ({
    to: token,
    title,
    body,
    data,
    sound: "default",
    badge: 1,
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    });
  } catch (e) {
    console.warn("sendPushToUser fetch error", e);
  }
}

async function getUserName(userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .single();
  return data?.name ?? "Jemand";
}

function truncate(text: string, max = 60): string {
  return text.length > max ? text.substring(0, max - 1) + "…" : text;
}

// ─── Public notification senders ─────────────────────────────────────────────

/** After adoption_matches INSERT — notify shelter */
export async function sendAdoptionMatchNotification(opts: {
  shelterUserId: string;
  matchId: string;
  petName: string;
  petPhoto?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  const adoptantName = user ? await getUserName(user.id) : "Jemand";

  await sendPushToUser(
    opts.shelterUserId,
    "🐾 Neuer Match!",
    `${adoptantName} interessiert sich für ${opts.petName}`,
    {
      screen: "shelter_chat",
      matchId: opts.matchId,
      petName: opts.petName,
      petPhoto: opts.petPhoto ?? "",
      adoptantName,
    }
  );
}

/** After adoption messages INSERT — notify the other party */
export async function sendAdoptionMessageNotification(opts: {
  matchId: string;
  senderUserId: string;
  text: string;
  petName: string;
  petPhoto: string;
}) {
  const { data: match } = await supabase
    .from("adoption_matches")
    .select("adoptant_id, shelter_id")
    .eq("id", opts.matchId)
    .single();
  if (!match) return;

  const isAdoptant = opts.senderUserId === match.adoptant_id;
  const recipientId = isAdoptant ? match.shelter_id : match.adoptant_id;
  const senderName = await getUserName(opts.senderUserId);

  await sendPushToUser(
    recipientId,
    `💬 ${senderName}`,
    truncate(opts.text),
    {
      screen: isAdoptant ? "shelter_chat" : "adoptant_chat",
      matchId: opts.matchId,
      petName: opts.petName,
      petPhoto: opts.petPhoto,
      ...(isAdoptant
        ? { adoptantName: senderName }
        : { shelterName: senderName }),
    }
  );
}

/** After owner messages INSERT — notify the other owner */
export async function sendOwnerMessageNotification(opts: {
  matchId: string;
  senderUserId: string;
  text: string;
  petName: string;
  petPhoto: string;
  modus: string;
}) {
  const { data: match } = await supabase
    .from("owner_matches")
    .select("owner_a_id, owner_b_id")
    .eq("id", opts.matchId)
    .single();
  if (!match) return;

  const recipientId =
    opts.senderUserId === match.owner_a_id ? match.owner_b_id : match.owner_a_id;
  const senderName = await getUserName(opts.senderUserId);

  await sendPushToUser(
    recipientId,
    `🐾 ${senderName}`,
    truncate(opts.text),
    {
      screen: "owner_chat",
      matchId: opts.matchId,
      petName: opts.petName,
      petPhoto: opts.petPhoto,
      ownerName: senderName,
      modus: opts.modus,
    }
  );
}
