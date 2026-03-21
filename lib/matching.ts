import type { Database } from "./supabase";

type Pet = Database["public"]["Tables"]["pets"]["Row"];
type AdoptantProfile = Database["public"]["Tables"]["adoptant_profiles"]["Row"];

export interface CompatibilityResult {
  compatible: boolean;
  warnings: string[];
}

const ERFAHRUNG_LEVEL: Record<string, number> = {
  anfaenger: 1,
  fortgeschritten: 2,
  profi: 3,
};

export function checkAdoptionCompatibility(
  adoptant: AdoptantProfile,
  pet: Pet
): CompatibilityResult {
  const warnings: string[] = [];

  // Garten
  if (pet.braucht_garten && adoptant.wohnsituation === "wohnung") {
    warnings.push(`${pet.name} braucht einen Garten.`);
  }

  // Erfahrung
  if (
    pet.erfahrung_benoetigt &&
    adoptant.erfahrung &&
    ERFAHRUNG_LEVEL[pet.erfahrung_benoetigt] > ERFAHRUNG_LEVEL[adoptant.erfahrung]
  ) {
    warnings.push(`${pet.name} braucht mehr Tiererfahrung.`);
  }

  // Kinder
  if (pet.kinderfreundlich === "nein" && adoptant.kinder_im_haushalt) {
    warnings.push(`${pet.name} ist nicht kinderfreundlich.`);
  }
  if (
    pet.kinderfreundlich === "ab_teenager" &&
    adoptant.kinder_im_haushalt &&
    adoptant.kinder_alter === "klein"
  ) {
    warnings.push(`${pet.name} ist erst ab Teenager-Alter geeignet.`);
  }

  // Aktivität
  if (
    pet.aktivitaetslevel === "sportlich" &&
    adoptant.aktivitaetslevel === "ruhig"
  ) {
    warnings.push(`${pet.name} braucht sehr viel Bewegung.`);
  }
  if (
    pet.aktivitaetslevel === "ruhig" &&
    adoptant.aktivitaetslevel === "sportlich"
  ) {
    warnings.push(`${pet.name} bevorzugt ein ruhiges Zuhause.`);
  }

  // Andere Tiere
  if (!pet.vertraeglich_mit_tieren && adoptant.andere_tiere) {
    warnings.push(`${pet.name} verträgt sich nicht mit anderen Tieren.`);
  }

  return {
    compatible: warnings.length === 0,
    warnings,
  };
}

export function formatAlter(jahre?: number | null, monate?: number | null): string {
  if (!jahre && !monate) return "Alter unbekannt";
  if (jahre && jahre >= 1) return jahre === 1 ? "1 Jahr" : `${jahre} Jahre`;
  if (monate) return monate === 1 ? "1 Monat" : `${monate} Monate`;
  return "Welpe";
}

export function formatGroesse(groesse?: string | null): string {
  const map: Record<string, string> = {
    klein: "Klein",
    mittel: "Mittel",
    gross: "Groß",
    riese: "Riese",
  };
  return groesse ? (map[groesse] ?? groesse) : "";
}
