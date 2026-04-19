import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "adoptant" | "tierhalter" | "tierheim";
          name: string | null;
          avatar_url: string | null;
          plz: string | null;
          city: string | null;
          lat: number | null;
          lng: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      adoptant_profiles: {
        Row: {
          id: string;
          wohnsituation: "wohnung" | "haus" | "haus_mit_garten" | "bauernhof" | null;
          erfahrung: "anfaenger" | "fortgeschritten" | "profi" | null;
          kinder_im_haushalt: boolean;
          kinder_alter: string | null;
          andere_tiere: boolean;
          aktivitaetslevel: "sportlich" | "mittel" | "ruhig" | null;
          arbeitszeit: "vollzeit" | "teilzeit" | "homeoffice" | "nicht_berufstaetig" | null;
        };
        Insert: Database["public"]["Tables"]["adoptant_profiles"]["Row"];
        Update: Partial<Database["public"]["Tables"]["adoptant_profiles"]["Row"]>;
      };
      shelter_profiles: {
        Row: {
          id: string;
          org_name: string;
          adresse: string | null;
          telefon: string | null;
          website: string | null;
          beschreibung: string | null;
          logo_url: string | null;
          verifiziert: boolean;
        };
        Insert: Database["public"]["Tables"]["shelter_profiles"]["Row"];
        Update: Partial<Database["public"]["Tables"]["shelter_profiles"]["Row"]>;
      };
      pets: {
        Row: {
          id: string;
          shelter_id: string;
          name: string;
          tierart: "hund" | "katze";
          rasse: string | null;
          groesse_kategorie: "klein" | "mittel" | "gross" | "riese" | null;
          alter_jahre: number | null;
          alter_monate: number | null;
          geschlecht: "maennlich" | "weiblich" | null;
          kastriert: boolean;
          charakter_tags: string[];
          braucht_garten: boolean;
          kinderfreundlich: "ja" | "nein" | "ab_schulalter" | "ab_teenager" | null;
          vertraeglich_mit_tieren: boolean;
          erfahrung_benoetigt: "anfaenger" | "fortgeschritten" | "profi" | null;
          aktivitaetslevel: "sportlich" | "mittel" | "ruhig" | null;
          herkunft: string | null;
          im_heim_seit: string | null;
          beschreibung: string | null;
          status: "verfuegbar" | "reserviert" | "vermittelt";
          // extended fields
          gewicht: string | null;
          fell_typ: string | null;
          fell_farbe: string | null;
          hund_vertraeglich: boolean | null;
          katze_vertraeglich: boolean | null;
          kleintier_vertraeglich: boolean | null;
          stubenrein: boolean | null;
          leinenfuehrig: boolean | null;
          maulkorbpflicht: boolean | null;
          alleine_bleiben: string | null;
          geimpft: boolean | null;
          gechipt: boolean | null;
          entwurmt: boolean | null;
          erkrankungen: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pets"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["pets"]["Insert"]>;
      };
      pet_photos: {
        Row: {
          id: string;
          pet_id: string;
          url: string;
          position: number;
        };
        Insert: Omit<Database["public"]["Tables"]["pet_photos"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["pet_photos"]["Insert"]>;
      };
      owner_pets: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          tierart: "hund" | "katze";
          rasse: string | null;
          groesse_kategorie: "klein" | "mittel" | "gross" | "riese" | null;
          alter_jahre: number | null;
          kinderfreundlich: boolean;
          vertraeglich_mit_tieren: boolean;
          aktivitaetslevel: "sportlich" | "mittel" | "ruhig" | null;
          foto_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["owner_pets"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["owner_pets"]["Insert"]>;
      };
      adoption_swipes: {
        Row: {
          id: string;
          adoptant_id: string;
          pet_id: string;
          richtung: "ja" | "nein";
          warnung_ignoriert: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["adoption_swipes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["adoption_swipes"]["Insert"]>;
      };
      adoption_matches: {
        Row: {
          id: string;
          adoptant_id: string;
          pet_id: string;
          shelter_id: string;
          status: "pending" | "accepted" | "rejected";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["adoption_matches"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["adoption_matches"]["Insert"]>;
      };
      owner_swipes: {
        Row: {
          id: string;
          swiper_id: string;
          swiper_pet_id: string;
          target_id: string;
          target_pet_id: string;
          richtung: "ja" | "nein";
          modus: "gassi" | "spieldate";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["owner_swipes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["owner_swipes"]["Insert"]>;
      };
      owner_matches: {
        Row: {
          id: string;
          pet_a_id: string;
          pet_b_id: string;
          owner_a_id: string;
          owner_b_id: string;
          modus: "gassi" | "spieldate";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["owner_matches"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["owner_matches"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          match_id: string;
          match_type: "adoption" | "owner";
          sender_id: string;
          text: string | null;
          foto_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["push_tokens"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["push_tokens"]["Insert"]>;
      };
    };
  };
};
