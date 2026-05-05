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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { Colors } from "../../../constants/colors";
import { Sizes } from "../../../constants/sizes";
import { useLanguage } from "../../../contexts/LanguageContext";

interface Message {
  id: string;
  sender_id: string;
  text: string | null;
  created_at: string;
}

const ME = "demo-me";
const OTHER = "demo-other";

function ago(minutes: number) {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

// Realistic dummy conversations per match
const DEMO_CONVERSATIONS: Record<string, Message[]> = {
  "demo-gm-1": [
    { id: "1-1", sender_id: OTHER, text: "Hey! Super dass wir gematcht haben 🐾 Luna freut sich schon!", created_at: ago(90) },
    { id: "1-2", sender_id: ME,    text: "Hi Sophie! Ja total, mein Hund liebt andere Hunde 😄 Wann seid ihr so unterwegs?", created_at: ago(80) },
    { id: "1-3", sender_id: OTHER, text: "Meistens morgens so gegen 9. Wärst du dabei?", created_at: ago(75) },
    { id: "1-4", sender_id: ME,    text: "Klingt perfekt! Habt ihr einen Lieblingsort?", created_at: ago(30) },
    { id: "1-5", sender_id: OTHER, text: "Morgen früh um 9 am Stadtpark? 🌳", created_at: ago(12) },
  ],
  "demo-gm-2": [
    { id: "2-1", sender_id: OTHER, text: "Hallo! Balu und ich würden uns über ein Gassi-Date freuen 🐕", created_at: ago(300) },
    { id: "2-2", sender_id: ME,    text: "Hey Jonas! Sehr gerne. Am Wochenende?", created_at: ago(280) },
    { id: "2-3", sender_id: OTHER, text: "Samstag um 10 am Flaucher?", created_at: ago(260) },
    { id: "2-4", sender_id: ME,    text: "Perfekt, da kenn ich mich gut aus! Bis Samstag 👍", created_at: ago(250) },
    { id: "2-5", sender_id: OTHER, text: "Super, dann sehen wir uns Samstag!", created_at: ago(120) },
  ],
  "demo-gm-3": [
    { id: "3-1", sender_id: ME,    text: "Hi Laura! Mia sieht so verspielt aus auf den Fotos 😍", created_at: ago(360) },
    { id: "3-2", sender_id: OTHER, text: "Ja sie liebt es zu toben! Dein Hund auch so aktiv?", created_at: ago(340) },
    { id: "3-3", sender_id: ME,    text: "Total! Vielleicht können wir mal ein Spieldate machen?", created_at: ago(320) },
    { id: "3-4", sender_id: OTHER, text: "Das wäre super! Ich bin die meiste Zeit flexibel.", created_at: ago(310) },
    { id: "3-5", sender_id: ME,    text: "Wie wäre es nächste Woche Mittwoch Nachmittag?", created_at: ago(300) },
    { id: "3-6", sender_id: OTHER, text: "Klingt gut! Mia ist total verspielt 😄", created_at: ago(298) },
  ],
  "demo-gm-4": [
    { id: "4-1", sender_id: OTHER, text: "Hey! Rex und ich sind in deiner Nähe, cool 🐾", created_at: ago(1500) },
    { id: "4-2", sender_id: ME,    text: "Oh nice! Wo geht ihr meistens lang?", created_at: ago(1440) },
    { id: "4-3", sender_id: OTHER, text: "Am liebsten im Olympiapark. Riesig und super für Hunde!", created_at: ago(1400) },
    { id: "4-4", sender_id: ME,    text: "Den kenn ich! Vielleicht können wir uns mal dort treffen?", created_at: ago(1380) },
    { id: "4-5", sender_id: OTHER, text: "Habt ihr heute schon Gassi gemacht?", created_at: ago(26 * 60) },
  ],
  "demo-gm-5": [
    { id: "5-1", sender_id: ME,    text: "Hey Emma! Nala ist so eine schöne Huskydame 😍", created_at: ago(5 * 1440) },
    { id: "5-2", sender_id: OTHER, text: "Danke! Sie ist auch super lieb mit anderen Hunden.", created_at: ago(5 * 1440 - 20) },
    { id: "5-3", sender_id: ME,    text: "Wollen wir mal zusammen laufen?", created_at: ago(5 * 1440 - 40) },
    { id: "5-4", sender_id: OTHER, text: "Sehr gerne! Donnerstag morgen?", created_at: ago(4 * 1440) },
    { id: "5-5", sender_id: ME,    text: "Perfekt, bin dabei! 🐕", created_at: ago(4 * 1440 - 10) },
    { id: "5-6", sender_id: OTHER, text: "Es war so schön! Machen wir das bald wieder 🐾", created_at: ago(3 * 1440) },
  ],
  "demo-gm-6": [],
};

export default function GassiChatScreen() {
  const { t, lang } = useLanguage();
  const { matchId, petName, petPhoto, ownerName, modus } = useLocalSearchParams<{
    matchId: string;
    petName: string;
    petPhoto: string;
    ownerName: string;
    modus: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initChat();
    return () => {
      supabase.channel(`gassi-chat-${matchId}`).unsubscribe();
    };
  }, [matchId]);

  const initChat = async () => {
    try {
      // Demo match — always show local dummy data regardless of login state
      if (matchId?.startsWith("demo-gm-")) {
        setIsDemo(true);
        setUserId(ME);
        setMessages(DEMO_CONVERSATIONS[matchId] ?? []);
        setLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      await loadMessages();

      supabase
        .channel(`gassi-chat-${matchId}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) =>
            prev.find((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          );
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        })
        .subscribe();
    } catch (e) {
      console.error("initChat", e);
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, text, created_at")
        .eq("match_id", matchId)
        .eq("match_type", "owner")
        .order("created_at", { ascending: true });
      setMessages(data ?? []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (e) {
      console.error("loadMessages", e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !userId || sending) return;

    if (isDemo) {
      const newMsg: Message = {
        id: `demo-sent-${Date.now()}`,
        sender_id: ME,
        text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      setInputText("");
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    setSending(true);
    setInputText("");
    try {
      const { error } = await supabase.from("messages").insert({
        match_id: matchId,
        match_type: "owner",
        sender_id: userId,
        text,
      });
      if (error) {
        setInputText(text);
        console.error("sendMessage", error);
      }
    } catch (e) {
      setInputText(text);
      console.error("sendMessage", e);
    } finally {
      setSending(false);
    }
  };

  const modusBadge = modus === "gassi" ? t.gassi_chat_gassi_date : t.gassi_chat_spieldate;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingBottom: 12,
          paddingHorizontal: Sizes.SPACING_LG,
          borderBottomWidth: 1,
          borderBottomColor: Colors.BORDER,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: Colors.WHITE,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ fontSize: 22, color: Colors.SECONDARY }}>‹</Text>
        </TouchableOpacity>
        {petPhoto ? (
          <Image
            source={{ uri: petPhoto }}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.SURFACE }}
          />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="paw" size={20} color={Colors.SECONDARY} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: Sizes.FONT_MD, fontWeight: "700", color: Colors.TEXT }}>
            {petName}
          </Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED }}>
            {[ownerName, modusBadge].filter(Boolean).join(" · ")}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={Colors.SECONDARY} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <Ionicons name="heart" size={48} color={Colors.BORDER} style={{ marginBottom: 14 }} />
                <Text style={{ color: Colors.TEXT, fontWeight: "700", fontSize: 16, marginBottom: 6 }}>
                  {t.gassi_chat_match_text}
                </Text>
                <Text style={{ color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 22, paddingHorizontal: 24 }}>
                  {modus === "gassi" ? t.gassi_chat_match_cta_gassi : t.gassi_chat_match_cta_play}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.sender_id === userId || item.sender_id === ME;
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
                      backgroundColor: isMe ? Colors.SECONDARY : Colors.SURFACE,
                      borderRadius: 18,
                      borderBottomRightRadius: isMe ? 4 : 18,
                      borderBottomLeftRadius: isMe ? 18 : 4,
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                    }}
                  >
                    <Text style={{ color: isMe ? Colors.WHITE : Colors.TEXT, fontSize: Sizes.FONT_MD, lineHeight: 20 }}>
                      {item.text}
                    </Text>
                    <Text style={{ color: isMe ? "rgba(255,255,255,0.65)" : Colors.TEXT_MUTED, fontSize: 10, marginTop: 3, textAlign: "right" }}>
                      {new Date(item.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "de-DE", { hour: "2-digit", minute: "2-digit" })}
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
            backgroundColor: Colors.WHITE,
            gap: 8,
          }}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t.gassi_chat_placeholder(ownerName ?? "")}
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
              backgroundColor: inputText.trim() ? Colors.SECONDARY : Colors.BORDER,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.WHITE} />
            ) : (
              <Ionicons name="arrow-up" size={18} color={Colors.WHITE} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
