// supabase/functions/sync-products/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser";

// === ENV (pozor: BEZ prefixu SUPABASE_) ===
const FEED_URL = Deno.env.get("FEED_URL") ?? "https://bewit.love/feeds/zbozi.xml";
const SUPABASE_URL = Deno.env.get("SB_URL"); // nastav v Secrets jako SB_URL
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY"); // nastav v Secrets jako SB_SERVICE_ROLE_KEY

// === Pomocné utilky ===
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ""
});

const nowIso = () => new Date().toISOString();

function toNum(v: any) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toStr(v: any) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function pick(...vals: any[]) {
  for (const v of vals) if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  return undefined;
}

// === Edge handler ===
Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) start log
  const { data: log } = await supabase
    .from("sync_logs")
    .insert({
      sync_type: "products_feed",
      status: "running",
      started_at: nowIso(),
      feed_url: FEED_URL
    })
    .select("id")
    .single();

  const logId = log?.id ?? -1;
  let processed = 0, inserted = 0, updated = 0, failed = 0;

  try {
    // 2) stáhni XML
    const res = await fetch(FEED_URL, {
      headers: { accept: "application/xml" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} při stahování feedu`);
    const xml = await res.text();

    // 3) parse
    const parsed = parser.parse(xml);
    const raw = parsed?.SHOP?.SHOPITEM ?? parsed?.shop?.shopitem ?? [];
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];

    // 4) upsert po dávkách
    const chunkSize = 500;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      processed += chunk.length;

      const rows = chunk.map((it: any) => {
        const product_code = toStr(pick(it.ITEM_ID, it.PRODUCTNO, it.ID, it.CODE));
        const name = toStr(pick(it.PRODUCTNAME, it.NAME));
        if (!product_code || !name) return null;

        const description = toStr(pick(it.DESCRIPTION, it.LONG_DESCRIPTION, it.DESC));
        const category = toStr(pick(it.CATEGORYTEXT, it.CATEGORY));
        const price = toNum(pick(it.PRICE_VAT, it.PRICE));
        const currency = toStr(pick(it.CURRENCY)) ?? "CZK";
        const product_url = toStr(pick(it.URL, it.LINK));
        const image_url = toStr(pick(it.IMGURL, it.IMG, it.IMAGE));
        const brand = toStr(pick(it.MANUFACTURER, it.BRAND)) ?? "BEWIT";
        const variant_id = toStr(pick(it.VARIANT, it.VARIANT_ID));

        const availabilityRaw = pick(it.STOCK_AMOUNT, it.AVAILABILITY, it.STOCK, it.STOCK_QUANTITY);
        const availability = availabilityRaw === undefined || availabilityRaw === null 
          ? 0 
          : Number(availabilityRaw) || (String(availabilityRaw).toLowerCase() === "in stock" ? 1 : 0);

        return {
          product_code,
          name,
          description,
          category,
          price,
          currency,
          availability,
          product_url,
          image_url,
          brand,
          variant_id,
          xml_content: JSON.stringify(it),
          sync_status: "success",
          last_sync_at: nowIso()
        };
      }).filter(Boolean);

      if (rows.length === 0) continue;

      // odhad insert/update podle času vytvoření vrácených řádků
      const before = Date.now();
      const { data, error } = await supabase
        .from("products")
        .upsert(rows, { onConflict: "product_code" })
        .select("id, created_at");

      if (error) {
        failed += rows.length;
        continue;
      }

      (data ?? []).forEach((r: any) => {
        const created = new Date(r.created_at).getTime();
        if (created > before - 5000) inserted++;
        else updated++;
      });
    }

    // 5) success log
    await supabase
      .from("sync_logs")
      .update({
        status: "success",
        finished_at: nowIso(),
        records_processed: processed,
        records_inserted: inserted,
        records_updated: updated,
        records_failed: failed
      })
      .eq("id", logId);

    return new Response(
      JSON.stringify({
        ok: true,
        processed,
        inserted,
        updated,
        failed
      }),
      {
        headers: { "content-type": "application/json" }
      }
    );
  } catch (e) {
    // 6) error log
    await supabase
      .from("sync_logs")
      .update({
        status: "error",
        finished_at: nowIso(),
        error_message: String(e?.message ?? e)
      })
      .eq("id", logId);

    return new Response(
      JSON.stringify({
        ok: false,
        error: String(e?.message ?? e)
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
});
