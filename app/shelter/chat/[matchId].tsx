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

export default function ShelterChatScreen() {
  const { matchId, petName, petPhoto, adoptantName } = useLocalSearchParams<{
    matchId: string;
    petName: string;
    petPhoto: string;
    adoptantName: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initChat();
    return () => { supabase.channel(`shelter-chat-${matchId}`).unsubscribe(); };
  }, [matchId]);

  const initChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    await loadMessages();

    supabase
      .channel(`shelter-chat-${matchId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => prev.find((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();
  };

  const loadMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, text, created_at")
      .eq("match_id", matchId)
      .eq("match_type", "adoption")
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
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
    setSending(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingBottom: 12, paddingHorizontal: Sizes.SPACING_LG, borderBottomWidth: 1, borderBottomColor: Colors.BORDER, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 20, color: Colors.PRIMARY }}>‹</Text>
        </TouchableOpacity>
        {petPhoto ? (
          <Image source={{ uri: petPhoto }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.SURFACE }} />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20 }}>🐾</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>{petName}</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED }}>{adoptantName}</Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={Colors.PRIMARY} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 40 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>👋</Text>
                <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22 }}>
                  {adoptantName} interessiert sich für {petName}.{"\n"}Schreib eine Begrüßung!
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.sender_id === userId;
              return (
                <View style={{ flexDirection: "row", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 6 }}>
                  <View style={{ maxWidth: "75%", backgroundColor: isMe ? Colors.PRIMARY : Colors.SURFACE, borderRadius: 18, borderBottomRightRadius: isMe ? 4 : 18, borderBottomLeftRadius: isMe ? 18 : 4, paddingHorizontal: 14, paddingVertical: 9 }}>
                    <Text style={{ color: isMe ? Colors.WHITE : Colors.TEXT, fontSize: Sizes.FONT_MD, lineHeight: 20 }}>
                      {item.text}
                    </Text>
                    <Text style={{ color: isMe ? "rgba(255,255,255,0.65)" : Colors.TEXT_MUTED, fontSize: 10, marginTop: 3, textAlign: "right" }}>
                      {new Date(item.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Input */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.BORDER, backgroundColor: Colors.BACKGROUND, gap: 8 }}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Nachricht an ${adoptantName}…`}
            placeholderTextColor={Colors.TEXT_MUTED}
            multiline
            style={{ flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: Colors.SURFACE, borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: Sizes.FONT_MD, color: Colors.TEXT }}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: inputText.trim() ? Colors.PRIMARY : Colors.BORDER, alignItems: "center", justifyContent: "center" }}
          >
            {sending ? <ActivityIndicator size="small" color={Colors.WHITE} /> : <Text style={{ fontSize: 16 }}>↑</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
