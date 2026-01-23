# 🔍 Debug - Proč se data neukládají?

## Kontrolní seznam

### 1. Zkontroluj konzoli v prohlížeči
Otevři chat a pošli zprávu. V konzoli (F12) hledej:

✅ **Mělo by se objevit:**
```
💾 [ChatHistory] Ukládám PAR otázka-odpověď
✅ [ChatHistory] Pár otázka-odpověď úspěšně uložen
```

❌ **Pokud se NEOBJEVÍ:**
- Funkce se vůbec nevolá
- Zkontroluj který mode používáš (Funnel? Book Database? Products?)

---

### 2. Který chatbot/mode používáš?

**Implementováno (mělo by ukládat):**
- ✅ Funnel mode (vany_chat s funnelem)
- ✅ Book Database mode (sana_medbase, sana_kancelar)

**NEIMPLEMENTOVÁNO (neukládá):**
- ❌ Hybrid Products mode
- ❌ Silent Prompt mode
- ❌ Combined Search mode

**Otázka:** Který chatbot a mode používáš?

---

### 3. Zkontroluj jestli je správný import

Otevři DevTools → Sources → Vyhledej:
```
saveChatPairToHistory
```

Mělo by být importováno v `SanaChat.tsx`

---

### 4. Možné problémy

#### A) Používáš duplicitní komponentu
Soubor `SanaChat.tsx` má DVĚ komponenty:
1. `SanaChatContent` (řádek ~1369) - **JE IMPLEMENTOVÁNO**
2. `SanaChat` (řádek ~2050) - **NENÍ IMPLEMENTOVÁNO**

Pokud aplikace používá tu druhou, ukládání NEFUNGUJE.

#### B) Používáš mode který není implementován
- Combined Search - NENÍ
- Hybrid Products - NENÍ (ještě)
- Silent Prompt - NENÍ

#### C) Error při ukládání
Zkontroluj konzoli jestli není:
```
⚠️ Nepodařilo se uložit pár otázka-odpověď do historie: ...
```

---

### 5. Rychlá oprava

Pokud chceš rychle otestovat, zkus:

1. **Použít Funnel mode** (vany_chat)
2. Poslat zprávu se symptomy
3. Počkat až bot vrátí funnel
4. Zkontrolovat DB:

```sql
SELECT 
    role,
    message_text,
    message_data->>'answer' as answer,
    created_at
FROM chat_messages
WHERE role = 'pair'
ORDER BY created_at DESC
LIMIT 5;
```

---

### 6. Jak zjistit která komponenta se používá?

Do konzole (F12) napiš:
```javascript
console.log(window.location.href);
```

Pak řekni jakou URL máš a můžu ti říct která komponenta se používá.

---

## 🎯 Nejpravděpodobnější příčina

**Používáš druhou komponentu `SanaChat` (ne `SanaChatContent`)**

Řešení: Potřebuji vědět:
1. Který chatbot používáš? (sana_medbase? vany_chat?)
2. Jaký typ konverzace? (book search? product funnel?)
3. Vidíš v konzoli nějaké logy o ukládání?

---

## ⚡ Rychlý test

Zkus toto:
1. Otevři chat
2. Otevři konzoli (F12)
3. Pošli JAKOUKOLI zprávu
4. Napiš sem CO VŠECHNO vidíš v konzoli (celý log)

Podle toho poznám co se děje a kde je problém.
