import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { Colors } from "../constants/colors";
import { Sizes } from "../constants/sizes";
import Badge from "./Badge";
import { formatAlter, formatGroesse } from "../lib/matching";
import type { Database } from "../lib/supabase";

type Pet = Database["public"]["Tables"]["pets"]["Row"];
type PetPhoto = Database["public"]["Tables"]["pet_photos"]["Row"];

export interface PetWithPhotos extends Pet {
  photos: PetPhoto[];
  shelter_name?: string;
  shelter_city?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
export const CARD_WIDTH = SCREEN_WIDTH - 32;
export const CARD_HEIGHT = SCREEN_WIDTH * 1.25;

const ERFAHRUNG_LABEL: Record<string, string> = {
  anfaenger: "🌱 Für Anfänger",
  fortgeschritten: "⭐ Fortgeschrittene",
  profi: "🏆 Nur Profis",
};

interface PetCardProps {
  pet: PetWithPhotos;
}

export default function PetCard({ pet }: PetCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = pet.photos ?? [];
  const currentPhoto = photos[photoIndex]?.url;

  const handlePhotoTap = (side: "left" | "right") => {
    if (side === "left" && photoIndex > 0) {
      setPhotoIndex(photoIndex - 1);
    } else if (side === "right" && photoIndex < photos.length - 1) {
      setPhotoIndex(photoIndex + 1);
    }
  };

  return (
    <View
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: Colors.WHITE,
        borderRadius: Sizes.CARD_BORDER_RADIUS,
        shadowColor: Colors.PRIMARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        overflow: "hidden",
      }}
    >
      {/* ── OBERE HÄLFTE: Foto ── */}
      <View style={{ height: CARD_HEIGHT * 0.52, position: "relative" }}>
        {currentPhoto ? (
          <Image
            source={{ uri: currentPhoto }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: Colors.SURFACE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 64 }}>{pet.tierart === "hund" ? "🐶" : "🐱"}</Text>
          </View>
        )}

        {/* Tap-Zonen links/rechts */}
        <TouchableOpacity
          style={{ position: "absolute", left: 0, top: 0, width: "40%", height: "100%" }}
          onPress={() => handlePhotoTap("left")}
          activeOpacity={1}
        />
        <TouchableOpacity
          style={{ position: "absolute", right: 0, top: 0, width: "40%", height: "100%" }}
          onPress={() => handlePhotoTap("right")}
          activeOpacity={1}
        />

        {/* Tierheim-Badge oben links */}
        {pet.shelter_name && (
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              backgroundColor: "rgba(0,0,0,0.5)",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: Sizes.RADIUS_FULL,
            }}
          >
            <Text style={{ color: Colors.WHITE, fontSize: 11, fontWeight: "600" }}>
              🏠 {pet.shelter_name}
            </Text>
          </View>
        )}

        {/* Foto-Punkte oben rechts */}
        {photos.length > 1 && (
          <View
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              flexDirection: "row",
              gap: 4,
            }}
          >
            {photos.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === photoIndex ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === photoIndex ? Colors.WHITE : "rgba(255,255,255,0.5)",
                }}
              />
            ))}
          </View>
        )}

        {/* Gradient-Overlay unten */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
          }}
        />
      </View>

      {/* ── UNTERE HÄLFTE: Infos ── */}
      <View style={{ flex: 1, padding: 16 }}>
        {/* Name + Alter */}
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.TEXT }}>
            {pet.name}
          </Text>
          <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>
            {formatAlter(pet.alter_jahre, pet.alter_monate)}
          </Text>
        </View>

        {/* Rasse + Größe + Ort */}
        <Text style={{ color: Colors.TEXT_MUTED, fontSize: 13, marginBottom: 10 }}>
          {[pet.rasse, formatGroesse(pet.groesse_kategorie), pet.shelter_city]
            .filter(Boolean)
            .join(" · ")}
        </Text>

        {/* Charakter-Tags */}
        {pet.charakter_tags && pet.charakter_tags.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
            {pet.charakter_tags.slice(0, 3).map((tag) => (
              <Badge key={tag} label={tag} variant="tag" />
            ))}
          </View>
        )}

        {/* Icons */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
          <IconPill icon="🌿" label="Garten" ok={pet.braucht_garten} positive={false} />
          <IconPill
            icon="👦"
            label="Kinder"
            ok={pet.kinderfreundlich === "ja" || pet.kinderfreundlich === "ab_schulalter"}
            positive
          />
          <IconPill icon="🐾" label="Tiere" ok={pet.vertraeglich_mit_tieren} positive />
        </View>

        {/* Erfahrungs-Badge */}
        {pet.erfahrung_benoetigt && (
          <View style={{ marginTop: "auto" }}>
            <Badge
              label={ERFAHRUNG_LABEL[pet.erfahrung_benoetigt] ?? pet.erfahrung_benoetigt}
              variant="info"
            />
          </View>
        )}
      </View>
    </View>
  );
}

function IconPill({
  icon,
  label,
  ok,
  positive,
}: {
  icon: string;
  label: string;
  ok: boolean;
  positive: boolean;
}) {
  const active = positive ? ok : !ok;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: Sizes.RADIUS_FULL,
        backgroundColor: active ? "#E8F5E9" : Colors.SURFACE,
        borderWidth: 1,
        borderColor: active ? "#A5D6A7" : Colors.BORDER,
      }}
    >
      <Text style={{ fontSize: 11 }}>{icon}</Text>
      <Text style={{ fontSize: 11, color: active ? "#2E7D32" : Colors.TEXT_MUTED, fontWeight: "500" }}>
        {ok ? "✓" : "✗"} {label}
      </Text>
    </View>
  );
}
