# 🤖 Metadata 3 - Rychlé nastavení

## Co potřebujete udělat

### 1. Nastavit OpenRouter API klíč v Supabase

**API klíč:** `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`

**Kroky:**

1. Otevřete Supabase Dashboard: https://supabase.com/dashboard/project/modopafybeslbcqjxsve
2. V levém menu: **Edge Functions** → **Secrets**
3. Klikněte **"New Secret"**
4. Vyplňte:
   - **Name:** `OPENROUTER_API_KEY`
   - **Value:** `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`
5. **Save**

### 2. Nasadit Edge Function

Máte 2 možnosti:

#### Možnost A: Přes Supabase CLI (doporučeno)

```bash
# Instalace Supabase CLI (pokud ještě nemáte)
npm install -g supabase

# Přihlášení
supabase login

# Link k projektu
supabase link --project-ref modopafybeslbcqjxsve

# Nasazení funkce
supabase functions deploy extract-metadata-ai
```

#### Možnost B: Přes Dashboard

1. Supabase Dashboard → **Edge Functions** → **New Function**
2. Name: `extract-metadata-ai`
3. Zkopírujte obsah z `/supabase/functions/extract-metadata-ai/index.ts`
4. Klikněte **Deploy**

### 3. Test funkce

Po nasazení otestujte:

```bash
curl -X POST \
  'https://modopafybeslbcqjxsve.supabase.co/functions/v1/extract-metadata-ai' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "text",
    "content": "This is a test document about natural medicine and herbs.",
    "fileName": "test.pdf"
  }'
```

**Očekávaná odpověď:**
```json
{
  "success": true,
  "metadata": {
    "title": "...",
    "author": "...",
    ...
  },
  "model": "meta-llama/llama-3.1-8b-instruct",
  "type": "text"
}
```

## Hotovo! 🎉

Aplikace je nyní připravena. Tlačítko **"🤖 Metadata 3"** funguje!

## Použití

1. Nahrajte PDF knihu
2. Klikněte **"Upravit"**
3. Najděte zelené tlačítko **"🤖 Metadata 3"**
4. Klikněte a počkejte 1-3 minuty
5. Metadata se automaticky vyplní!

## Problémy?

### Edge Function nenalezena
→ Zkontrolujte, že je nasazená v Dashboard

### API klíč chyba
→ Ověřte, že je secret `OPENROUTER_API_KEY` správně nastaven

### Metadata se nevyplní
→ Otevřete konzoli (F12) a zkontrolujte chyby

---

📖 **Kompletní dokumentace:** viz `METADATA_3_DOKUMENTACE.md`






