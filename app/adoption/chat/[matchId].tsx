import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { sendAdoptionMessageNotification } from "../../../lib/notifications";

interface Message {
  id: string;
  sender_id: string;
  text: string | null;
  created_at: string;
}

const DEMO_USER_ID = "demo-amir";
const DEMO_SHELTER_ID = "demo-tierheim";

const DEMO_MESSAGES_A1: Message[] = [
  { id: "dm-a1-1", sender_id: DEMO_SHELTER_ID, text: "Hallo Amir! Vielen Dank für dein Interesse an Bruno 🐾", created_at: new Date(Date.now() - 60 * 60000).toISOString() },
  { id: "dm-a1-2", sender_id: DEMO_USER_ID,    text: "Hallo! Bruno hat mich sofort begeistert. Wie läuft der Prozess ab?", created_at: new Date(Date.now() - 55 * 60000).toISOString() },
  { id: "dm-a1-3", sender_id: DEMO_SHELTER_ID, text: "Super! Wir würden dich gerne zu einem Kennenlernen einladen.", created_at: new Date(Date.now() - 40 * 60000).toISOString() },
  { id: "dm-a1-4", sender_id: DEMO_USER_ID,    text: "Das klingt wunderbar! Wann wäre das möglich?", created_at: new Date(Date.now() - 35 * 60000).toISOString() },
  { id: "dm-a1-5", sender_id: DEMO_SHELTER_ID, text: "Wie wäre es am Samstag um 11 Uhr?", created_at: new Date(Date.now() - 28 * 60000).toISOString() },
  { id: "dm-a1-6", sender_id: DEMO_USER_ID,    text: "Perfekt, ich freue mich! 🐕", created_at: new Date(Date.now() - 25 * 60000).toISOString() },
];

export default function AdoptionChatScreen() {
  const { matchId, petName, petPhoto, shelterName } = useLocalSearchParams<{
    matchId: string;
    petName: string;
    petPhoto: string;
    shelterName: string;
  }>();

  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading, setLoading]     = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending]     = useState(false);
  const [userId, setUserId]       = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initChat();
    return () => {
      supabase.channel(`adoption-chat-${matchId}`).unsubscribe();
    };
  }, [matchId]);

  const initChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (matchId === "demo-a-1") {
          setUserId(DEMO_USER_ID);
          setMessages(DEMO_MESSAGES_A1);
          setLoading(false);
        }
        return;
      }
      setUserId(user.id);

      await loadMessages();

      supabase
        .channel(`adoption-chat-${matchId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        )
        .subscribe();
    } catch (e) {
      console.error("AdoptionChatScreen.initChat", e);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, text, created_at")
        .eq("match_id", matchId)
        .eq("match_type", "adoption")
        .order("created_at", { ascending: true });

      if (!error) setMessages(data ?? []);
    } catch (e) {
      console.error("AdoptionChatScreen.loadMessages", e);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !userId || sending) return;

    setSending(true);
    setInputText("");

    try {
      const { error } = await supabase.from("messages").insert({
        match_id: matchId,
        match_type: "adoption",
        sender_id: userId,
        text,
      });

      if (error) {
        console.error("AdoptionChatScreen.sendMessage", error);
        setInputText(text);
      } else {
        sendAdoptionMessageNotification({
          matchId,
          senderUserId: userId,
          text,
          petName: petName ?? "",
          petPhoto: petPhoto ?? "",
        });
      }
    } catch (e) {
      console.error("AdoptionChatScreen.sendMessage", e);
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateSeparator = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Heute";
    if (diffDays === 1) return "Gestern";
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long" });
  };

  const messagesWithSeparators = messages.reduce<
    Array<Message | { type: "separator"; date: string; key: string }>
  >((acc, msg, i) => {
    const prevMsg = messages[i - 1];
    const currDay = new Date(msg.created_at).toDateString();
    const prevDay = prevMsg ? new Date(prevMsg.created_at).toDateString() : null;
    if (currDay !== prevDay) {
      acc.push({ type: "separator", date: formatDateSeparator(msg.created_at), key: `sep-${currDay}` });
    }
    acc.push(msg);
    return acc;
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View style={{
        paddingTop: 56,
        paddingBottom: 12,
        paddingHorizontal: Sizes.SPACING_LG,
        backgroundColor: Colors.BACKGROUND,
        borderBottomWidth: 1,
        borderBottomColor: Colors.BORDER,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ fontSize: 20, color: Colors.PRIMARY }}>‹</Text>
        </TouchableOpacity>

        {petPhoto ? (
          <Image
            source={{ uri: petPhoto }}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.SURFACE }}
          />
        ) : (
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 20 }}>🐾</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>
            {petName}
          </Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED }}>
            {shelterName || "Tierheim"}
          </Text>
        </View>
      </View>

      {/* Messages + Input */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={Colors.PRIMARY} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messagesWithSeparators}
            keyExtractor={(item) => ("key" in item ? item.key : item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 40 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>👋</Text>
                <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
                  Ihr habt ein Match! Schreib dem Tierheim{"\n"}eine erste Nachricht über {petName}.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              if ("type" in item) {
                return (
                  <View style={{ alignItems: "center", marginVertical: 12 }}>
                    <Text style={{
                      fontSize: 11, color: Colors.TEXT_MUTED,
                      backgroundColor: Colors.SURFACE,
                      paddingHorizontal: 10, paddingVertical: 3,
                      borderRadius: Sizes.RADIUS_FULL,
                    }}>
                      {item.date}
                    </Text>
                  </View>
                );
              }

              const isMe = item.sender_id === userId;
              return (
                <View style={{
                  flexDirection: "row",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                  marginBottom: 6,
                }}>
                  <View style={{
                    maxWidth: "75%",
                    backgroundColor: isMe ? Colors.PRIMARY : Colors.SURFACE,
                    borderRadius: 18,
                    borderBottomRightRadius: isMe ? 4 : 18,
                    borderBottomLeftRadius: isMe ? 18 : 4,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                  }}>
                    <Text style={{
                      color: isMe ? Colors.WHITE : Colors.TEXT,
                      fontSize: Sizes.FONT_MD,
                      lineHeight: 20,
                    }}>
                      {item.text}
                    </Text>
                    <Text style={{
                      color: isMe ? "rgba(255,255,255,0.65)" : Colors.TEXT_MUTED,
                      fontSize: 10, marginTop: 3, textAlign: "right",
                    }}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Input Bar */}
        <View style={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: Colors.BORDER,
          backgroundColor: Colors.BACKGROUND,
          gap: 8,
        }}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Nachricht über ${petName}…`}
            placeholderTextColor={Colors.TEXT_MUTED}
            multiline
            style={{
              flex: 1,
              minHeight: 40,
              maxHeight: 100,
              backgroundColor: Colors.SURFACE,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 10,
              fontSize: Sizes.FONT_MD,
              color: Colors.TEXT,
            }}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: inputText.trim() ? Colors.PRIMARY : Colors.BORDER,
              alignItems: "center", justifyContent: "center",
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.WHITE} />
            ) : (
              <Text style={{ fontSize: 16 }}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
