import { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, Image } from "react-native";
import { Colors } from "../constants/colors";
import { Sizes } from "../constants/sizes";

export interface OwnerPetItem {
  id: string;
  owner_id: string;
  name: string;
  tierart: "hund" | "katze";
  rasse: string | null;
  groesse_kategorie: string | null;
  alter_jahre: number | null;
  aktivitaetslevel: string | null;
  kinderfreundlich: boolean;
  vertraeglich_mit_tieren: boolean;
  foto_url: string | null;
  owner_name?: string | null;
  owner_city?: string | null;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const OWNER_CARD_WIDTH  = SCREEN_WIDTH - 32;
export const OWNER_CARD_HEIGHT = SCREEN_HEIGHT * 0.55;  // Etwas kleiner wegen Gassi-Label

const AKTIVITAET_LABEL: Record<string, string> = {
  sportlich: "🏃 Sehr aktiv",
  mittel: "🚶 Mäßig aktiv",
  ruhig: "🛋 Ruhig",
};

const GROESSE_LABEL: Record<string, string> = {
  klein: "Klein", mittel: "Mittel", gross: "Groß", riese: "Riese",
};

export default function OwnerPetCard({ pet, modus }: { pet: OwnerPetItem; modus: "gassi" | "spieldate" }) {
  return (
    <View style={{ width: OWNER_CARD_WIDTH, height: OWNER_CARD_HEIGHT, backgroundColor: Colors.WHITE, borderRadius: Sizes.CARD_BORDER_RADIUS, shadowColor: Colors.SECONDARY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8, overflow: "hidden" }}>
      {/* Photo */}
      <View style={{ height: OWNER_CARD_HEIGHT * 0.5, position: "relative" }}>
        {pet.foto_url ? (
          <Image source={{ uri: pet.foto_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <View style={{ width: "100%", height: "100%", backgroundColor: Colors.SURFACE, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 72 }}>{pet.tierart === "hund" ? "🐶" : "🐱"}</Text>
          </View>
        )}
        {/* Modus badge */}
        <View style={{ position: "absolute", top: 12, right: 12, backgroundColor: modus === "gassi" ? "#4CAF50" : Colors.SECONDARY, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Sizes.RADIUS_FULL }}>
          <Text style={{ color: Colors.WHITE, fontSize: 12, fontWeight: "700" }}>
            {modus === "gassi" ? "🦮 Gassi" : "🎾 Spieldate"}
          </Text>
        </View>
        {/* Owner badge */}
        {pet.owner_name && (
          <View style={{ position: "absolute", top: 12, left: 12, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: Sizes.RADIUS_FULL }}>
            <Text style={{ color: Colors.WHITE, fontSize: 11, fontWeight: "600" }}>👤 {pet.owner_name}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.TEXT }}>{pet.name}</Text>
          {pet.alter_jahre != null && (
            <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED }}>
              {pet.alter_jahre === 0 ? "Welpe" : pet.alter_jahre === 1 ? "1 Jahr" : `${pet.alter_jahre} Jahre`}
            </Text>
          )}
        </View>

        <Text style={{ color: Colors.TEXT_MUTED, fontSize: 13, marginBottom: 12 }}>
          {[pet.rasse, pet.groesse_kategorie ? GROESSE_LABEL[pet.groesse_kategorie] : null, pet.owner_city]
            .filter(Boolean).join(" · ")}
        </Text>

        {/* Tags */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {pet.aktivitaetslevel && (
            <TagPill label={AKTIVITAET_LABEL[pet.aktivitaetslevel] ?? pet.aktivitaetslevel} color={Colors.SECONDARY} />
          )}
          {pet.kinderfreundlich && <TagPill label="👦 Kinderfreundlich" color="#8A9F79" />}
          {pet.vertraeglich_mit_tieren && <TagPill label="🐾 Tierfreundlich" color="#8A9F79" />}
        </View>

        <View style={{ marginTop: "auto", flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 12 }}>📍</Text>
          <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED }}>
            {pet.owner_city ?? "In deiner Nähe"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TagPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: Sizes.RADIUS_FULL, backgroundColor: color + "18", borderWidth: 1, borderColor: color + "40" }}>
      <Text style={{ fontSize: 11, color, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}
