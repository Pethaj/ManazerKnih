// supabase/functions/sync-slozeni/index.ts
//
// Edge funkce: Propojení tabulky slozeni s tabulkou leceni
//
// Logika:
//   1. Načte všechny řádky z tabulky leceni (sloupce EO1, EO2)
//   2. Načte všechny řádky z tabulky slozeni (sloupce blend_name, slozeni)
//   3. Pro každý řádek leceni najde shodu EO1 → slozeni.blend_name a EO2 → slozeni.blend_name
//   4. Chytré matchování: ignoruje suffix "esencialni olej", diakritiku, velikost písmen
//   5. Zapíše výsledek do sloupců EO1_slozeni a EO2_slozeni

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SB_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY");

// ============================================================
// Normalizace názvu pro fuzzy matching
// ============================================================

const STOPWORDS = [
  "esencialni olej",
  "esenciálni olej",
  "esenciální olej",
  "esenciálný olej",
  "essential oil",
  "eo",
];

/**
 * Odstraní diakritiku a převede na lowercase.
 */
function removeDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Normalizuje název EO pro porovnání:
 * - lowercase + bez diakritiky
 * - odstraní stopwords (např. "esencialni olej")
 * - odstraní nadbytečné mezery
 */
function normalize(name: string): string {
  let n = removeDiacritics(name.trim());

  for (const sw of STOPWORDS) {
    const swNorm = removeDiacritics(sw);
    // Odstraní stopword na konci i uprostřed
    n = n.replace(new RegExp(`\\s*${swNorm}\\s*`, "gi"), " ").trim();
  }

  // Sjednotit mezery a pomlčky
  n = n.replace(/\s+/g, " ").replace(/-+/g, "-").trim();
  return n;
}

// ============================================================
// Hlavní handler
// ============================================================

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    // 1) Načti tabulku slozeni
    const { data: slozeniRows, error: slozeniErr } = await supabase
      .from("slozeni")
      .select("blend_name, ingredients");

    if (slozeniErr) {
      throw new Error(`Chyba při načítání tabulky slozeni: ${slozeniErr.message}`);
    }

    // Sestav lookup mapu: normalizovany_nazev → ingredients text
    const slozeniMap = new Map<string, string>();
    for (const row of slozeniRows ?? []) {
      if (row.blend_name) {
        slozeniMap.set(normalize(row.blend_name), row.ingredients ?? "");
      }
    }

    console.log(`Načteno ${slozeniMap.size} záznamů ze tabulky slozeni`);

    // 2) Načti tabulku leceni (jen sloupce potřebné pro matching)
    const { data: leceniRows, error: leceniErr } = await supabase
      .from("leceni")
      .select("ID, \"EO 1\", \"EO 2\"");

    if (leceniErr) {
      throw new Error(`Chyba při načítání tabulky leceni: ${leceniErr.message}`);
    }

    console.log(`Načteno ${leceniRows?.length ?? 0} řádků z tabulky leceni`);

    // 3) Projdi leceni a najdi shody
    let updated = 0;
    let notMatchedEO1: string[] = [];
    let notMatchedEO2: string[] = [];

    for (const row of leceniRows ?? []) {
      const eo1Raw: string | null = row["EO 1"] ?? null;
      const eo2Raw: string | null = row["EO 2"] ?? null;

      const eo1Slozeni = eo1Raw ? (slozeniMap.get(normalize(eo1Raw)) ?? null) : null;
      const eo2Slozeni = eo2Raw ? (slozeniMap.get(normalize(eo2Raw)) ?? null) : null;

      // Loguj nenalezené
      if (eo1Raw && eo1Slozeni === null) {
        notMatchedEO1.push(`${eo1Raw} (norm: ${normalize(eo1Raw)})`);
      }
      if (eo2Raw && eo2Slozeni === null) {
        notMatchedEO2.push(`${eo2Raw} (norm: ${normalize(eo2Raw)})`);
      }

      // Updatuj pouze pokud se něco změnilo
      if (eo1Slozeni !== null || eo2Slozeni !== null) {
        const updatePayload: Record<string, string | null> = {};
        if (eo1Slozeni !== null) updatePayload["EO1_slozeni"] = eo1Slozeni;
        if (eo2Slozeni !== null) updatePayload["EO2_slozeni"] = eo2Slozeni;

        const { error: updateErr } = await supabase
          .from("leceni")
          .update(updatePayload)
          .eq("ID", row["ID"]);

        if (updateErr) {
          console.error(`Chyba při updatu řádku id=${row.id}: ${updateErr.message}`);
        } else {
          updated++;
        }
      }
    }

    // 4) Odstraní duplikáty z nenalezených
    const uniqueNotMatchedEO1 = [...new Set(notMatchedEO1)];
    const uniqueNotMatchedEO2 = [...new Set(notMatchedEO2)];

    const result = {
      ok: true,
      slozeni_zaznamu: slozeniMap.size,
      leceni_radku: leceniRows?.length ?? 0,
      updated,
      nenalezeno_EO1: uniqueNotMatchedEO1,
      nenalezeno_EO2: uniqueNotMatchedEO2,
    };

    console.log("Výsledek:", JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Chyba:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
