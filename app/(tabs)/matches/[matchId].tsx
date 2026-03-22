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
import { useLanguage } from "../../../contexts/LanguageContext";

interface Message {
  id: string;
  sender_id: string;
  text: string | null;
  created_at: string;
}

export default function ChatScreen() {
  const { t, lang } = useLanguage();
  const { matchId, petName, petPhoto, shelterName } = useLocalSearchParams<{
    matchId: string;
    petName: string;
    petPhoto: string;
    shelterName: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initChat();
    return () => {
      supabase.channel(`chat-${matchId}`).unsubscribe();
    };
  }, [matchId]);

  const initChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    await loadMessages();

    // Subscribe to new messages via Realtime
    supabase
      .channel(`chat-${matchId}`)
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
  };

  const loadMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, text, created_at")
      .eq("match_id", matchId)
      .eq("match_type", "adoption")
      .order("created_at", { ascending: true });

    if (!error) setMessages(data ?? []);
    setLoading(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !userId || sending) return;

    setSending(true);
    setInputText("");

    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      match_type: "adoption",
      sender_id: userId,
      text,
    });

    if (error) {
      console.error("sendMessage error", error);
      setInputText(text);
    } else {
      // Notify the other party (fire-and-forget)
      sendAdoptionMessageNotification({
        matchId,
        senderUserId: userId,
        text,
        petName: petName ?? "",
        petPhoto: petPhoto ?? "",
      });
    }
    setSending(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const locale = lang === "en" ? "en-US" : "de-DE";
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateSeparator = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const locale = lang === "en" ? "en-US" : "de-DE";
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return t.adoption_chat_today;
    if (diffDays === 1) return t.adoption_chat_yesterday;
    return d.toLocaleDateString(locale, { day: "2-digit", month: "long" });
  };

  // Group messages by day
  const messagesWithSeparators = messages.reduce<Array<Message | { type: "separator"; date: string; key: string }>>(
    (acc, msg, i) => {
      const prevMsg = messages[i - 1];
      const currDay = new Date(msg.created_at).toDateString();
      const prevDay = prevMsg ? new Date(prevMsg.created_at).toDateString() : null;
      if (currDay !== prevDay) {
        acc.push({ type: "separator", date: formatDateSeparator(msg.created_at), key: `sep-${currDay}` });
      }
      acc.push(msg);
      return acc;
    },
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingBottom: 12,
          paddingHorizontal: Sizes.SPACING_LG,
          backgroundColor: Colors.BACKGROUND,
          borderBottomWidth: 1,
          borderBottomColor: Colors.BORDER,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 20, color: Colors.PRIMARY }}>‹</Text>
        </TouchableOpacity>

        {petPhoto ? (
          <Image
            source={{ uri: petPhoto }}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.SURFACE }}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.SURFACE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 20 }}>🐾</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>
            {petName}
          </Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED }}>
            {shelterName || t.adoption_chat_shelter_fallback}
          </Text>
        </View>
      </View>

      {/* Messages */}
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
                  {t.adoption_chat_match_cta(petName ?? "")}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              if ("type" in item) {
                return (
                  <View style={{ alignItems: "center", marginVertical: 12 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: Colors.TEXT_MUTED,
                        backgroundColor: Colors.SURFACE,
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                        borderRadius: Sizes.RADIUS_FULL,
                      }}
                    >
                      {item.date}
                    </Text>
                  </View>
                );
              }

              const isMe = item.sender_id === userId;
              return (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      maxWidth: "75%",
                      backgroundColor: isMe ? Colors.PRIMARY : Colors.SURFACE,
                      borderRadius: 18,
                      borderBottomRightRadius: isMe ? 4 : 18,
                      borderBottomLeftRadius: isMe ? 18 : 4,
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                    }}
                  >
                    <Text
                      style={{
                        color: isMe ? Colors.WHITE : Colors.TEXT,
                        fontSize: Sizes.FONT_MD,
                        lineHeight: 20,
                      }}
                    >
                      {item.text}
                    </Text>
                    <Text
                      style={{
                        color: isMe ? "rgba(255,255,255,0.65)" : Colors.TEXT_MUTED,
                        fontSize: 10,
                        marginTop: 3,
                        textAlign: "right",
                      }}
                    >
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: Colors.BORDER,
            backgroundColor: Colors.BACKGROUND,
            gap: 8,
          }}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t.adoption_chat_placeholder(petName ?? "")}
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
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: inputText.trim() ? Colors.PRIMARY : Colors.BORDER,
              alignItems: "center",
              justifyContent: "center",
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
