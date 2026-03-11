// supabase/functions/sync-feed-abc/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser";

const FEED_URL = "https://bewit.love/feed/bewit2?auth=xr32PRbrs554K";
const SUPABASE_URL = Deno.env.get("SB_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: false,
  htmlEntities: false
});

const nowIso = () => new Date().toISOString();

function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  return text
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function toStr(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : decodeHtmlEntities(s);
}

function toNum(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toInt(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function extractText(node: any): string | null {
  if (!node) return null;
  if (typeof node === 'string') return node;
  if (node['#text']) return String(node['#text']);
  return String(node);
}

function deriveProductCode(url: string | null, addToCartId: string | null): string | null {
  if (url) {
    const segments = url.replace(/\/$/, '').split('/');
    const slug = segments[segments.length - 1];
    if (slug && slug.length > 0) return slug;
  }
  if (addToCartId) {
    const parts = addToCartId.split('_');
    if (parts.length >= 1 && parts[0]) return `abc_${parts[0]}`;
  }
  return null;
}

function parseVariant(v: any) {
  const accessNode = v?.ACCESSIBILITY?.ITEM;
  let accessibility: string[] = [];
  if (Array.isArray(accessNode)) {
    accessibility = accessNode.map((a: any) => toStr(extractText(a)) || '').filter(Boolean);
  } else if (accessNode) {
    const val = toStr(extractText(accessNode));
    if (val) accessibility = [val];
  }
  const pB = v?.PRICE_B;
  const pC = v?.PRICE_C;
  return {
    variant_name: toStr(extractText(v?.VARIANTNAME)),
    price_a: toNum(extractText(v?.PRICE_A)),
    price_b: toNum(typeof pB === 'object' ? pB['#text'] : pB),
    price_b_percents: pB?.['@_percents'] ? toNum(pB['@_percents']) : null,
    price_c: toNum(typeof pC === 'object' ? pC['#text'] : pC),
    price_c_percents: pC?.['@_percents'] ? toNum(pC['@_percents']) : null,
    in_action: toInt(extractText(v?.IN_ACTION)) ?? 0,
    availability: toInt(extractText(v?.AVAIBILITY)) ?? 0,
    accessibility,
    add_to_cart_id: toStr(extractText(v?.ADD_TO_CART_ID))
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function performSync(logId: number, supabase: any) {
  let processed = 0, inserted = 0, failed = 0;

  try {
    // #region agent log - hypothesis A/B
    console.log("HYPO_A_B: Start, waiting 40s for feed generation...");
    // #endregion
    
    console.log("Cekam 40s na vygenerovani feedu...");
    await new Promise(r => setTimeout(r, 40000));

    // #region agent log - hypothesis B
    console.log("HYPO_B: After 40s delay, fetching feed...");
    // #endregion
    
    console.log(`Stahuji: ${FEED_URL}`);
    const res = await fetch(FEED_URL, {
      headers: { accept: "application/xml", "User-Agent": "Supabase/1.0" }
    });
    
    // #region agent log - hypothesis B
    console.log(`HYPO_B: Fetch response status=${res.status}, ok=${res.ok}`);
    // #endregion
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const xmlText = await res.text();
    // #region agent log - hypothesis B
    console.log(`HYPO_B: Feed fetched, length=${xmlText.length}`);
    // #endregion
    
    console.log(`Feed stazen: ${xmlText.length} znaku`);
    if (xmlText.length < 100) throw new Error("Feed prilis kratky");

    const parsed = parser.parse(xmlText);
    const itemsNode = parsed?.DATA?.ITEMS?.ITEM;
    const items = itemsNode ? (Array.isArray(itemsNode) ? itemsNode : [itemsNode]) : [];
    
    // #region agent log - hypothesis A/E
    console.log(`HYPO_A_E: Found ${items.length} products in XML`);
    // #endregion
    
    console.log(`Nalezeno ${items.length} produktu`);
    if (items.length === 0) throw new Error("Zadne ITEM elementy");

    // Sestavit vsechny produkty najednou
    const allProducts: any[] = [];
    const totalItems = items.length;
    let progressIdx = 0;

    for (const item of items) {
      progressIdx++;
      if (progressIdx % 100 === 0 || progressIdx === totalItems) {
        const pct = Math.round((progressIdx / totalItems) * 100);
        console.log(`[PROGRESS] Parsovani: ${progressIdx}/${totalItems} (${pct}%)`);
        
        // #region agent log - real-time progress to DB
        await supabase.from("sync_logs").update({
          records_processed: progressIdx
        }).eq("id", logId);
        // #endregion
      }
      try {
        const product_name = toStr(extractText(item.PRODUCTNAME));
        if (!product_name) { failed++; continue; }

        const url = toStr(extractText(item.URL));
        const variantsNode = item.VARIANTS?.VARIANT;
        const variantItems = variantsNode
          ? (Array.isArray(variantsNode) ? variantsNode : [variantsNode])
          : [];
        const parsedVariants = variantItems.map(parseVariant);

        // Pouze public varianty pro výpočet cen
        const publicVariants = parsedVariants.filter((v: any) => v.accessibility.includes('public'));
        const priceSource = publicVariants.length > 0 ? publicVariants : (parsedVariants.length > 0 ? parsedVariants : []);

        // Nejnižší price_a ze všech (public) variant
        const minPriceA = priceSource.reduce((min: number | null, v: any) => {
          if (v.price_a === null) return min;
          return min === null || v.price_a < min ? v.price_a : min;
        }, null as number | null);

        // Nejnižší price_b ze všech (public) variant
        const minPriceB = priceSource.reduce((min: number | null, v: any) => {
          if (v.price_b === null) return min;
          return min === null || v.price_b < min ? v.price_b : min;
        }, null as number | null);

        // Nejnižší price_c ze všech (public) variant
        const minPriceC = priceSource.reduce((min: number | null, v: any) => {
          if (v.price_c === null) return min;
          return min === null || v.price_c < min ? v.price_c : min;
        }, null as number | null);

        // Varianta s nejnižší price_a – pro percenty a add_to_cart_id
        const cheapestVariant = priceSource.reduce((best: any, v: any) => {
          if (v.price_a === null) return best;
          if (!best || best.price_a === null || v.price_a < best.price_a) return v;
          return best;
        }, null as any) ?? priceSource[0] ?? parsedVariants[0] ?? null;

        const pub = cheapestVariant;
        const firstCartId = pub?.add_to_cart_id ?? parsedVariants[0]?.add_to_cart_id ?? null;
        const product_code = deriveProductCode(url, firstCartId);
        if (!product_code) { failed++; continue; }

        const catNode = item.CATEGORYTEXT;
        allProducts.push({
          product_code,
          product_name,
          description_short: toStr(extractText(item.DESCRIPTION_SHORT)),
          description_long: toStr(extractText(item.DESCRIPTION_LONG)),
          category: toStr(extractText(catNode)),
          category_id: catNode?.['@_id'] ? toInt(catNode['@_id']) : null,
          url,
          thumbnail: toStr(extractText(item.THUMBNAIL)),
          sales_last_30_days: toInt(extractText(item.SALES_LAST_30_DAYS)) ?? 0,
          price_a: minPriceA,
          price_b: minPriceB,
          price_b_percents: pub?.price_b_percents ?? null,
          price_c: minPriceC,
          price_c_percents: pub?.price_c_percents ?? null,
          in_action: pub?.in_action ?? 0,
          availability: pub?.availability ?? 0,
          accessibility: pub?.accessibility ?? [],
          add_to_cart_id: firstCartId,
          variants_json: parsedVariants,
          currency: "CZK",
          sync_status: "success",
          last_sync_at: nowIso(),
          embedding_status: "none"
        });
      } catch (e) { failed++; }
    }

    processed = allProducts.length;
    // #region agent log - hypothesis E
    console.log(`HYPO_E: Parsing complete, ${processed} products ready for upsert...`);
    // #endregion
    
    console.log(`Ukladam ${processed} produktu batch upsert...`);

    // Batch upsert po 100 - rychle, neprekroci timeout
    const batchSize = 100;
    const totalBatches = Math.ceil(allProducts.length / batchSize);
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      // #region agent log - hypothesis D
      console.log(`HYPO_D: Upserting batch ${batchNum}/${totalBatches}, size=${batch.length}`);
      // #endregion
      
      const { error: upsertError } = await supabase
        .from('product_feed_abc')
        .upsert(batch, { onConflict: 'product_code', ignoreDuplicates: false });

      if (upsertError) {
        // #region agent log - hypothesis D
        console.error(`HYPO_D: Batch ${batchNum} upsert ERROR: ${upsertError.message}`);
        // #endregion
        
        console.error(`[PROGRESS] Ukladani batch ${batchNum}/${totalBatches} CHYBA:`, upsertError.message);
        failed += batch.length;
      } else {
        inserted += batch.length;
        const pct = Math.round((batchNum / totalBatches) * 100);
        console.log(`[PROGRESS] Ukladani: ${batchNum}/${totalBatches} (${pct}%) - ulozeno ${inserted}/${processed}`);
        
        // #region agent log - real-time progress to DB
        await supabase.from("sync_logs").update({
          records_inserted: inserted
        }).eq("id", logId);
        // #endregion
      }
    }

    await supabase.from("sync_logs").update({
      status: "success", finished_at: nowIso(),
      records_processed: processed, records_inserted: inserted,
      records_updated: 0, records_failed: failed
    }).eq("id", logId);

    console.log(`HOTOVO! Zpracovano: ${processed}, Ulozeno: ${inserted}, Selhalo: ${failed}`);

  } catch (e: any) {
    // #region agent log - hypothesis A/B/C/D/E
    console.error(`HYPO_ALL: CRITICAL ERROR: ${e.message}, stack: ${e.stack}`);
    // #endregion
    
    console.error("Kriticka chyba:", e.message);
    await supabase.from("sync_logs").update({
      status: "error", finished_at: nowIso(),
      records_processed: processed, records_inserted: inserted,
      records_updated: 0, records_failed: failed,
      error_message: String(e?.message ?? e)
    }).eq("id", logId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "Chybi konfigurace" }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: log, error: logError } = await supabase
      .from("sync_logs")
      .insert({ sync_type: "product_feed_abc", status: "running", started_at: nowIso(), feed_url: FEED_URL })
      .select("id").single();

    if (logError || !log) throw new Error("Nepodarilo se vytvorit sync log: " + logError?.message);

    performSync(log.id, supabase).catch(e => console.error("Background chyba:", e));

    return new Response(
      JSON.stringify({ ok: true, message: "Synchronizace Feed ABC spustena", logId: log.id, status: "running" }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});
