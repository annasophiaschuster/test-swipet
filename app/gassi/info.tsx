import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLanguage } from "../../contexts/LanguageContext";
import GradientHeader from "../../components/GradientHeader";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────


interface DogSummary {
  id: string;
  name: string;
  foto_url: string | null;
  groesse_kategorie: string | null;
  alter_jahre: number | null;
  aktivitaetslevel: string | null;
}

interface Product {
  name: string;
  desc: string;
  shop: "fressnapf" | "amazon";
  link: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Product data
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTS_GROESSE: Record<string, Product[]> = {
  klein: [
    { name: "Tragetasche",              desc: "Ergonomisch, gut belüftet und fluglinienzugelassen für kleine Begleiter.",         shop: "amazon",    link: "https://www.amazon.de/s?k=hund+tragetasche+klein" },
    { name: "Geschirr statt Halsband",  desc: "Schützt die empfindliche Halswirbelsäule kleiner Hunde beim Laufen.",               shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=geschirr+kleiner+hund" },
    { name: "Reisenapf faltbar",         desc: "Platzsparend zusammenklappbar, ideal für unterwegs und im Rucksack.",               shop: "amazon",    link: "https://www.amazon.de/s?k=faltbarer+reisenapf+hund" },
    { name: "Pflegeset für Kleinhunde",  desc: "Bürste, Nagelfeile und Kamm in der richtigen Größe für kleine Rassen.",             shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=pflegeset+kleiner+hund" },
    { name: "Hundebett mit hohem Rand",  desc: "Gibt kleinen Hunden Geborgenheit und schützt vor Zugluft.",                          shop: "amazon",    link: "https://www.amazon.de/s?k=hundebett+hoher+rand+klein" },
  ],
  mittel: [
    { name: "Wasserdichte Leine",        desc: "Pflegeleichtes Material, das Nässe und Schmutz einfach abperlen lässt.",             shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=wasserdichte+leine+hund" },
    { name: "Schnelltrocknendes Handtuch",desc: "Microfiber-Tuch trocknet deinen Hund nach dem Bad oder Regen in Sekunden.",        shop: "amazon",    link: "https://www.amazon.de/s?k=hundehandtuch+schnelltrocknend" },
    { name: "Snackbeutel Treat Pouch",   desc: "Praktischer Gürtelbeutel für Leckerlis beim Training und Gassi-Gehen.",              shop: "amazon",    link: "https://www.amazon.de/s?k=treat+pouch+hund+gürteltasche" },
    { name: "Reflektierende Weste",      desc: "Sorgt für gute Sichtbarkeit in der Dämmerung und bei Nacht.",                        shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=reflektierende+weste+hund" },
    { name: "Zerr- und Apportierspielzeug", desc: "Robustes Seil- und Gummispielzeug für aktive Spiele zu zweit.",                  shop: "amazon",    link: "https://www.amazon.de/s?k=zerr+apportierspielzeug+hund" },
  ],
  gross: [
    { name: "Gepolstertes Geschirr",     desc: "Extra breite Polsterung verteilt Druck gleichmäßig bei großen Hunden.",              shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=geschirr+großer+hund+gepolstert" },
    { name: "Faltbare Wasserschüssel",   desc: "Große stabile Schüssel, die sich platzsparend zusammenfalten lässt.",                shop: "amazon",    link: "https://www.amazon.de/s?k=faltbare+wasserschüssel+großer+hund" },
    { name: "Orthopädische Schlafunterlage", desc: "Entlastet Gelenke und Rücken bei schweren Hunderassen.",                         shop: "amazon",    link: "https://www.amazon.de/s?k=orthopädische+hundematratze+groß" },
    { name: "Sicherheitsgurt fürs Auto", desc: "Homologierter Anschnallgurt, der auch bei Vollbremsung hält.",                       shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=sicherheitsgurt+hund+auto" },
    { name: "Hochenergie Snacks",        desc: "Kalorienreiche Belohnungen, die den großen Kalorienverbrauch decken.",                shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=hochenergie+snacks+großer+hund" },
  ],
};

const PRODUCTS_ALTER: Record<string, Product[]> = {
  welpe: [
    { name: "Kauspielzeug für Welpen",   desc: "Weiches Gummi schont das empfindliche Milchzahngebiss.",                             shop: "amazon",    link: "https://www.amazon.de/s?k=kauspielzeug+welpe" },
    { name: "Welpenfutter",              desc: "Speziell abgestimmte Nährstoffe für gesundes Wachstum in der Welpenphase.",           shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=welpenfutter" },
    { name: "Erziehungsclicker",         desc: "Präzises Signal für positives Verstärken beim Grundgehorsamkeits-Training.",          shop: "amazon",    link: "https://www.amazon.de/s?k=erziehungsclicker+hund" },
    { name: "Schlafhöhle / Zelt",        desc: "Gibt Welpen ein Gefühl von Sicherheit und erleichtert das Einschlafen.",              shop: "amazon",    link: "https://www.amazon.de/s?k=hundehöhle+welpe+schlafzelt" },
    { name: "Unfallschutzunterlage",     desc: "Saugfähige Unterlagen für die Stubenreinerziehung ohne Stress.",                      shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=welpenunterlagen+stubenrein" },
  ],
  junior: [
    { name: "Intelligenzspielzeug",      desc: "Fördert kognitive Fähigkeiten und beschäftigt den neugierigen Junghund.",             shop: "amazon",    link: "https://www.amazon.de/s?k=intelligenzspielzeug+hund" },
    { name: "Schleppleine 10 m",         desc: "Gibt mehr Freiheit beim Rückruf-Training in der Natur.",                              shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=schleppleine+10m" },
    { name: "Frisbee für Hunde",         desc: "Weiches, bissfestes Material für wilde Wurf- und Fangspiele.",                        shop: "amazon",    link: "https://www.amazon.de/s?k=hundefrisbee" },
    { name: "Hundesport Einsteigerset",  desc: "Komplettset für Agility, Slalom und Sprung — perfekt für Junghunde.",                 shop: "amazon",    link: "https://www.amazon.de/s?k=hundesport+einsteiger+agility" },
    { name: "Kausnacks Junghund",        desc: "Zahnpflege und Beschäftigung in einem — für Hunde in der Wachstumsphase.",           shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=kausnacks+junghund" },
  ],
  adult: [
    { name: "Personalisiertes Halsband", desc: "Mit eingesticktem Namen und Telefonnummer — schöner Ersatz für Erkennungsmarke.",    shop: "amazon",    link: "https://www.amazon.de/s?k=personalisiertes+halsband+hund+bestickung" },
    { name: "GPS Tracker",               desc: "Echtzeit-Ortung per App, damit du deinen Hund immer findest.",                        shop: "amazon",    link: "https://www.amazon.de/s?k=gps+tracker+hund" },
    { name: "Erste-Hilfe-Set für Hunde", desc: "Kompaktes Set mit Verbandsmaterial, Zeckenzange und Notfallkarte.",                   shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=erste+hilfe+set+hund" },
    { name: "Reisedecke",                desc: "Weiche Fleece-Decke für Ausflüge, Übernachtungen und lange Autofahrten.",             shop: "amazon",    link: "https://www.amazon.de/s?k=reisedecke+hund+fleece" },
    { name: "Interaktives Futterspielzeug", desc: "Slow-Feeder und Schnüffelspiele verlängern die Mahlzeit und fördern Auslastung.", shop: "amazon",    link: "https://www.amazon.de/s?k=interaktives+futterspielzeug+hund" },
  ],
  senior: [
    { name: "Gelenkpräparate",           desc: "Grünlippmuschel und Chondroitin unterstützen die Beweglichkeit älterer Hunde.",      shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=gelenkpräparate+hund+senior" },
    { name: "Orthopädisches Bett",       desc: "Memory-Foam-Kern entlastet Gelenke und sorgt für erholsamen Schlaf.",                shop: "amazon",    link: "https://www.amazon.de/s?k=orthopädisches+hundebett+senior" },
    { name: "Rampe für Sofa & Auto",     desc: "Schonende Alternative zum Springen — schützt die Gelenke beim Ein- und Aussteigen.", shop: "amazon",    link: "https://www.amazon.de/s?k=hunderampe+sofa+auto" },
    { name: "Massagegerät für Hunde",    desc: "Sanfte Vibrationsmassage löst Verspannungen und fördert die Durchblutung.",          shop: "amazon",    link: "https://www.amazon.de/s?k=massagegerät+hund" },
    { name: "Seniorfutter",              desc: "Leichter verdauliche Rezeptur mit weniger Kalorien und mehr Gelenkschutz.",          shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=seniorfutter+hund" },
  ],
};

const PRODUCTS_AKTIVITAET: Record<string, Product[]> = {
  ruhig: [
    { name: "Kuscheldecke",              desc: "Extra weiche Fleece-Decke für gemütliche Stunden auf dem Sofa.",                      shop: "amazon",    link: "https://www.amazon.de/s?k=kuscheldecke+hund+fleece" },
    { name: "Leckmatte",                 desc: "Beruhigt durch Schlecken und beschäftigt deinen Hund mit Leckerlipaste.",              shop: "amazon",    link: "https://www.amazon.de/s?k=leckmatte+hund" },
    { name: "Schnüffelspielzeug",        desc: "Fördert den natürlichen Sucktrieb und gibt ruhigen Hunden mentale Auslastung.",       shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=schnüffelspielzeug+hund" },
    { name: "Pflegebürste",              desc: "Sanfte Massagebürste für regelmäßiges Bürsten — Pflege und Bonding in einem.",        shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=pflegebürste+hund+massage" },
    { name: "Beruhigungstropfen",        desc: "Pflanzliche Tropfen mit Baldrian helfen bei Stress, Gewitter und Reisen.",            shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=beruhigungstropfen+hund" },
  ],
  mittel: [
    { name: "Kombiniertes Geschirr",     desc: "Y-Geschirr für komfortablen Zug und gute Steuerung beim Spaziergang.",                shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=y-geschirr+hund" },
    { name: "Treat Pouch Gürteltasche",  desc: "Immer Leckerlis griffbereit — ideal fürs Training unterwegs.",                        shop: "amazon",    link: "https://www.amazon.de/s?k=treat+pouch+gürteltasche+hund" },
    { name: "Faltbarer Trinkbeutel",     desc: "Leichte Trinkflasche mit integriertem Napf für ausgedehnte Spaziergänge.",            shop: "amazon",    link: "https://www.amazon.de/s?k=hundetrinkflasche+faltbar" },
    { name: "Hundeschuhe",               desc: "Schützen die Pfoten bei heißem Asphalt, Eis und rutschigen Böden.",                   shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=hundeschuhe+pfotenschutz" },
    { name: "Reflektierendes Halsband",  desc: "Rundum-Sicherheit durch 360°-Reflexstreifen in der Dunkelheit.",                      shop: "amazon",    link: "https://www.amazon.de/s?k=reflektierendes+halsband+hund" },
  ],
  sportlich: [
    { name: "Canicross Bauchgurt",       desc: "Ergonomischer Hüftgurt für Hund und Mensch — perfekt fürs Laufen zusammen.",         shop: "amazon",    link: "https://www.amazon.de/s?k=canicross+bauchgurt+set" },
    { name: "Hundesportgeschirr",        desc: "Zugoptimiertes Geschirr für Bikejöring, Canicross und Skijoering.",                   shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=hundesportgeschirr+canicross" },
    { name: "Elektrolyt Snacks",         desc: "Gleichen Mineralverlust nach intensiver körperlicher Aktivität aus.",                 shop: "fressnapf", link: "https://www.fressnapf.de/s/?q=elektrolyt+snacks+hund+sport" },
    { name: "Schwimmweste",              desc: "Auftriebshilfe für Wasseraktivitäten — auch für unsichere Schwimmer.",                shop: "amazon",    link: "https://www.amazon.de/s?k=schwimmweste+hund" },
    { name: "GPS Tracker Sport",         desc: "Robuste Echtzeit-Ortung für aktive Hunde im Gelände.",                                shop: "amazon",    link: "https://www.amazon.de/s?k=gps+tracker+hund+sport" },
  ],
};

function getTopProducts(dog: DogSummary): Product[] {
  const result: Product[] = [];

  // 2 products from size category
  if (dog.groesse_kategorie) {
    const g = dog.groesse_kategorie;
    const list = g === "klein" ? PRODUCTS_GROESSE.klein
               : g === "mittel" ? PRODUCTS_GROESSE.mittel
               : PRODUCTS_GROESSE.gross;
    result.push(...list.slice(0, 2));
  }

  // 2 products from age category
  if (dog.alter_jahre != null) {
    const a = dog.alter_jahre;
    const list = a < 1 ? PRODUCTS_ALTER.welpe
               : a <= 3 ? PRODUCTS_ALTER.junior
               : a <= 8 ? PRODUCTS_ALTER.adult
               : PRODUCTS_ALTER.senior;
    result.push(...list.slice(0, 2));
  }

  // 2 products from activity category
  if (dog.aktivitaetslevel) {
    const lv = dog.aktivitaetslevel;
    const list = lv === "ruhig" ? PRODUCTS_AKTIVITAET.ruhig
               : lv === "sportlich" ? PRODUCTS_AKTIVITAET.sportlich
               : PRODUCTS_AKTIVITAET.mittel;
    result.push(...list.slice(0, 2));
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export default function GassiInfoScreen() {
  const { t } = useLanguage();

  // ── existing state ────────────────────────────────────────────────────────
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // ── recommendations state ─────────────────────────────────────────────────
  const [dogs, setDogs]               = useState<DogSummary[]>([]);
  const [dogsLoading, setDogsLoading] = useState(true);
  const [activeDogId, setActiveDogId] = useState<string | null>(null);

  useEffect(() => { loadDogs(); }, []);

  useFocusEffect(
    useCallback(() => { loadDogs(); }, [])
  );

  const loadDogs = async () => {
    setDogsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setDogsLoading(false); return; }
      const { data, error } = await supabase
        .from("owner_pets")
        .select("id, name, foto_url, groesse_kategorie, alter_jahre, aktivitaetslevel")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });
      if (error) console.error("loadDogs query error", error);
      const list: DogSummary[] = data ?? [];
      setDogs(list);
      setActiveDogId((prev) => (list.length > 0 && !prev ? list[0].id : prev));
    } catch (e) {
      console.error("loadDogs", e);
    } finally {
      setDogsLoading(false);
    }
  };

  // ── computed ──────────────────────────────────────────────────────────────
  const activeDog = dogs.find((d) => d.id === activeDogId) ?? null;
  const products  = activeDog ? getTopProducts(activeDog) : [];

  const FAQ = [
    { q: (t as any).gassi_faq_q1, a: (t as any).gassi_faq_a1 },
    { q: (t as any).gassi_faq_q2, a: (t as any).gassi_faq_a2 },
    { q: (t as any).gassi_faq_q3, a: (t as any).gassi_faq_a3 },
    { q: (t as any).gassi_faq_q4, a: (t as any).gassi_faq_a4 },
    { q: (t as any).gassi_faq_q5, a: (t as any).gassi_faq_a5 },
    { q: (t as any).gassi_faq_q6, a: (t as any).gassi_faq_a6 },
    { q: (t as any).gassi_faq_q7, a: (t as any).gassi_faq_a7 },
    { q: (t as any).gassi_faq_q8, a: (t as any).gassi_faq_a8 },
  ];

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: Colors.BACKGROUND }}>
      <GradientHeader title={(t as any).gassi_info_title} />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* ── 4. PRODUKTEMPFEHLUNGEN ────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: Colors.TEXT, marginBottom: 14 }}>
            {activeDog ? (
              <>{"Unsere Empfehlungen für "}<Text style={{ color: Colors.PRIMARY }}>{activeDog.name}</Text></>
            ) : "Unsere Empfehlungen"}
          </Text>

          {/* Loading */}
          {dogsLoading && (
            <ActivityIndicator color={Colors.SECONDARY} style={{ marginVertical: 24 }} />
          )}

          {/* No dogs found */}
          {!dogsLoading && dogs.length === 0 && (
            <Text style={{ color: Colors.TEXT_MUTED, fontSize: 14, lineHeight: 22 }}>
              Lege deinen ersten Hund im Profil an — dann erscheinen hier automatisch passende Produktempfehlungen.
            </Text>
          )}

          {/* Content */}
          {!dogsLoading && activeDog && products.length > 0 && (
            <View>
            {/* Dog switcher (only if > 1 dog) */}
            {dogs.length > 1 && (
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
              >
                {dogs.map((dog) => {
                  const active = dog.id === activeDogId;
                  return (
                    <TouchableOpacity
                      key={dog.id}
                      onPress={() => setActiveDogId(dog.id)}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 6,
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99,
                        backgroundColor: active ? Colors.SECONDARY : Colors.SURFACE,
                        borderWidth: 1.5, borderColor: active ? Colors.SECONDARY : Colors.BORDER,
                      }}
                    >
                      {dog.foto_url ? (
                        <Image source={{ uri: dog.foto_url }} style={{ width: 22, height: 22, borderRadius: 11 }} />
                      ) : (
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: active ? Colors.WHITE + "30" : Colors.BORDER, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 12 }}>🐶</Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? Colors.WHITE : Colors.TEXT }}>
                        {dog.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* 2-column product grid */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
              {products.map((product, i) => (
                <View
                  key={i}
                  style={{
                    width: "47.5%",
                    backgroundColor: Colors.WHITE,
                    borderRadius: 16, borderWidth: 1, borderColor: Colors.BORDER,
                    padding: 14,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.TEXT, marginBottom: 6, lineHeight: 20 }}>
                    {product.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.TEXT_MUTED, lineHeight: 17, marginBottom: 12, flex: 1 }} numberOfLines={3}>
                    {product.desc}
                  </Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(product.link)}
                    style={{
                      backgroundColor: Colors.SECONDARY,
                      borderRadius: 8, paddingVertical: 7, alignItems: "center",
                    }}
                  >
                    <Text style={{ color: Colors.WHITE, fontSize: 11, fontWeight: "700" }}>
                      Zum Produkt
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            </View>
          )}
        </View>

        {/* ── 3. FAQ ACCORDION ──────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginTop: 36, marginBottom: 28 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: Colors.TEXT, marginBottom: 14 }}>
            {(t as any).gassi_faq_title}
          </Text>
          {FAQ.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setFaqOpen(faqOpen === i ? null : i)}
              activeOpacity={0.75}
              style={{
                borderRadius: 16, borderWidth: 1, marginBottom: 8, overflow: "hidden",
                backgroundColor: Colors.SURFACE,
                borderColor: faqOpen === i ? Colors.SECONDARY + "50" : Colors.BORDER,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12 }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: Colors.TEXT, lineHeight: 22 }}>{item.q}</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: faqOpen === i ? Colors.SECONDARY : Colors.TEXT_MUTED }}>
                  {faqOpen === i ? "▲" : "▼"}
                </Text>
              </View>
              {faqOpen === i && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: Colors.SECONDARY + "20" }}>
                  <Text style={{ fontSize: 14, color: Colors.TEXT_MUTED, lineHeight: 22, paddingTop: 12 }}>{item.a}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
