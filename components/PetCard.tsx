import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { router } from "expo-router";
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const CARD_WIDTH  = SCREEN_WIDTH - 32;
export const CARD_HEIGHT = SCREEN_HEIGHT * 0.59;  // ~495px on iPhone 14 — fills screen properly

const PHOTO_HEIGHT = CARD_HEIGHT * 0.65;  // 65% Foto, 35% Info

interface PetCardProps {
  pet: PetWithPhotos;
}

export default function PetCard({ pet }: PetCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos      = pet.photos ?? [];
  const currentPhoto = photos[photoIndex]?.url;

  const handlePhotoTap = (side: "left" | "right") => {
    if (side === "left"  && photoIndex > 0)              setPhotoIndex(photoIndex - 1);
    if (side === "right" && photoIndex < photos.length - 1) setPhotoIndex(photoIndex + 1);
  };

  return (
    <View
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: Colors.WHITE,
        borderRadius: Sizes.CARD_BORDER_RADIUS,
        shadowColor: "#2C2C2A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 8,
        overflow: "hidden",
      }}
    >
      {/* ── FOTO (67%) ── */}
      <View style={{ height: PHOTO_HEIGHT, position: "relative" }}>
        {currentPhoto ? (
          <Image
            source={{ uri: currentPhoto }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: "100%", height: "100%", backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 72 }}>🐶</Text>
          </View>
        )}

        {/* Tap zones: prev / next photo */}
        <TouchableOpacity
          style={{ position: "absolute", left: 0, top: 0, width: "40%", height: "100%" }}
          onPress={() => handlePhotoTap("left")} activeOpacity={1}
        />
        <TouchableOpacity
          style={{ position: "absolute", right: 0, top: 0, width: "40%", height: "100%" }}
          onPress={() => handlePhotoTap("right")} activeOpacity={1}
        />

        {/* Shelter badge */}
        {pet.shelter_name && (
          <View style={{
            position: "absolute", top: 10, left: 10,
            backgroundColor: "rgba(0,0,0,0.48)",
            paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99,
          }}>
            <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "600" }}>
              🏠 {pet.shelter_name}
            </Text>
          </View>
        )}

        {/* Photo dots */}
        {photos.length > 1 && (
          <View style={{ position: "absolute", top: 10, right: 10, flexDirection: "row", gap: 4 }}>
            {photos.map((_, i) => (
              <View key={i} style={{
                width: i === photoIndex ? 16 : 6, height: 6,
                borderRadius: 3,
                backgroundColor: i === photoIndex ? "#FFF" : "rgba(255,255,255,0.5)",
              }} />
            ))}
          </View>
        )}
      </View>

      {/* ── INFO (33%) ── */}
      <View style={{ flex: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }}>

        {/* Zeile 1: Name + Alter */}
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 7, marginBottom: 1 }}>
          <Text style={{ fontSize: 21, fontWeight: "800", color: Colors.TEXT }}>
            {pet.name}
          </Text>
          <Text style={{ fontSize: 13, color: Colors.TEXT_MUTED }}>
            {formatAlter(pet.alter_jahre, pet.alter_monate)}
          </Text>
        </View>

        {/* Zeile 2: Rasse · Größe · Ort */}
        <Text style={{ color: Colors.TEXT_MUTED, fontSize: 12, marginBottom: 7 }} numberOfLines={1}>
          {[pet.rasse, formatGroesse(pet.groesse_kategorie), pet.shelter_city]
            .filter(Boolean).join(" · ")}
        </Text>

        {/* Zeile 3: Beschreibung + mehr... */}
        {pet.beschreibung ? (
          <View style={{ marginBottom: 7, flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap" }}>
            <Text
              numberOfLines={2}
              style={{ fontSize: 12, color: Colors.TEXT, lineHeight: 18, flexShrink: 1 }}
            >
              {pet.beschreibung}{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push({ pathname: "/pet/[petId]", params: { petId: pet.id } })}>
              <Text style={{ fontSize: 12, color: Colors.PRIMARY, fontWeight: "700" }}>mehr...</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/pet/[petId]", params: { petId: pet.id } })}
            style={{ marginBottom: 7 }}
          >
            <Text style={{ fontSize: 12, color: Colors.PRIMARY, fontWeight: "700" }}>
              Alle Details ansehen →
            </Text>
          </TouchableOpacity>
        )}

        {/* Zeile 4: Tags */}
        {pet.charakter_tags && pet.charakter_tags.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
            {pet.charakter_tags.slice(0, 3).map((tag) => (
              <Badge key={tag} label={tag} variant="tag" />
            ))}
          </View>
        )}

        {/* Zeile 5: Icon-Pills */}
        <View style={{ flexDirection: "row", gap: 6, marginTop: "auto", flexWrap: "wrap" }}>
          <IconPill icon="🌿" label="Garten"  ok={pet.braucht_garten}  positive={false} />
          <IconPill icon="👦" label="Kinder"  ok={pet.kinderfreundlich === "ja" || pet.kinderfreundlich === "ab_schulalter"} positive />
          <IconPill icon="🐾" label="Tiere"   ok={pet.vertraeglich_mit_tieren} positive />
          {pet.erfahrung_benoetigt && (
            <IconPill
              icon={pet.erfahrung_benoetigt === "profi" ? "🏆" : pet.erfahrung_benoetigt === "fortgeschritten" ? "⭐" : "🌱"}
              label={pet.erfahrung_benoetigt === "anfaenger" ? "Einsteiger" : pet.erfahrung_benoetigt === "fortgeschritten" ? "Erfahren" : "Profi"}
              ok positive
            />
          )}
        </View>
      </View>
    </View>
  );
}

function IconPill({ icon, label, ok, positive }: {
  icon: string; label: string; ok: boolean; positive: boolean;
}) {
  const active = positive ? ok : !ok;
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 3,
      paddingHorizontal: 7, paddingVertical: 3,
      borderRadius: 99,
      backgroundColor: active ? "#E8F5E9" : Colors.SURFACE,
      borderWidth: 1,
      borderColor: active ? "#A5D6A7" : Colors.BORDER,
    }}>
      <Text style={{ fontSize: 10 }}>{icon}</Text>
      <Text style={{ fontSize: 10, color: active ? "#2E7D32" : Colors.TEXT_MUTED, fontWeight: "500" }}>
        {label}
      </Text>
    </View>
  );
}
