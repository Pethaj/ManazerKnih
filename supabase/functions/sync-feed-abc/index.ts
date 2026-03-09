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
    console.log("Cekam 40s na vygenerovani feedu...");
    await new Promise(r => setTimeout(r, 40000));

    console.log(`Stahuji: ${FEED_URL}`);
    const res = await fetch(FEED_URL, {
      headers: { accept: "application/xml", "User-Agent": "Supabase/1.0" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const xmlText = await res.text();
    console.log(`Feed stazen: ${xmlText.length} znaku`);
    if (xmlText.length < 100) throw new Error("Feed prilis kratky");

    const parsed = parser.parse(xmlText);
    const itemsNode = parsed?.DATA?.ITEMS?.ITEM;
    const items = itemsNode ? (Array.isArray(itemsNode) ? itemsNode : [itemsNode]) : [];
    console.log(`Nalezeno ${items.length} produktu`);
    if (items.length === 0) throw new Error("Zadne ITEM elementy");

    // Sestavit vsechny produkty najednou
    const allProducts: any[] = [];
    for (const item of items) {
      try {
        const product_name = toStr(extractText(item.PRODUCTNAME));
        if (!product_name) { failed++; continue; }

        const url = toStr(extractText(item.URL));
        const variantsNode = item.VARIANTS?.VARIANT;
        const variantItems = variantsNode
          ? (Array.isArray(variantsNode) ? variantsNode : [variantsNode])
          : [];
        const parsedVariants = variantItems.map(parseVariant);
        const pub = parsedVariants.find((v: any) => v.accessibility.includes('public')) ?? parsedVariants[0] ?? null;
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
          price_a: pub?.price_a ?? null,
          price_b: pub?.price_b ?? null,
          price_b_percents: pub?.price_b_percents ?? null,
          price_c: pub?.price_c ?? null,
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
    console.log(`Ukladam ${processed} produktu batch upsert...`);

    // Batch upsert po 100 - rychle, neprekroci timeout
    const batchSize = 100;
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      const { error: upsertError } = await supabase
        .from('product_feed_abc')
        .upsert(batch, { onConflict: 'product_code', ignoreDuplicates: false });

      if (upsertError) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} chyba:`, upsertError.message);
        failed += batch.length;
      } else {
        inserted += batch.length;
        console.log(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProducts.length / batchSize)} OK`);
      }
    }

    await supabase.from("sync_logs").update({
      status: "success", finished_at: nowIso(),
      records_processed: processed, records_inserted: inserted,
      records_updated: 0, records_failed: failed
    }).eq("id", logId);

    console.log(`HOTOVO! Zpracovano: ${processed}, Ulozeno: ${inserted}, Selhalo: ${failed}`);

  } catch (e: any) {
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
