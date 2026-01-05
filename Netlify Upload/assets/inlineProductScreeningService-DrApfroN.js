import{s as i}from"./WaveLoader-DvqYMd3O.js";import"./preload-helper-B8tWKQ1F.js";const u="openrouter-proxy",c=`Jsi expert na tradiční čínskou medicínu a přírodní léčbu BEWIT.

Tvým úkolem je identifikovat v textu:
1. **Názvy produktů/wanů** (čínské bylinné směsi)
2. **Pinyin názvy** (romanizovaná čínština)
3. **Zdravotní témata** relevantní pro BEWIT produkty

**PRAVIDLA:**
- Hledej POUZE produkty/témata zmíněné V TEXTU
- Nevymýšlej si názvy, které v textu nejsou
- Zahrň jak pinyin názvy (např. "Shi Xiao Wan") tak české názvy
- Pro témata použij široké pojmy (např. "bolest hlavy", "trávení")

**VÝSTUP:**
Vrať POUZE validní JSON pole stringů bez markdown, bez vysvětlení:
["produkt1", "produkt2", "téma1"]

**PŘÍKLAD:**
Text: "Pro bolest hlavy doporučuji Chuan Xiong Cha Tiao Wan..."
Výstup: ["Chuan Xiong Cha Tiao Wan", "bolest hlavy"]`;async function l(n){try{if(!n||n.trim().length===0)return{success:!0,products:[]};if(n.trim().length<20)return{success:!0,products:[]};const{data:r,error:t}=await i.functions.invoke(u,{body:{systemPrompt:c,userPrompt:`Analyzuj následující text a extrahuj názvy produktů/wanů a zdravotní témata:

${n}`,model:"anthropic/claude-3-haiku",temperature:.1,maxTokens:500}});if(t)throw console.error("❌ Edge Function error:",t),new Error(`Edge Function chyba: ${t.message}`);if(!r)throw new Error("Edge Function nevrátila žádná data");if(!r.success)throw new Error(r.error||"Edge Function vrátila chybu");let e=[];try{const o=r.response||"";let s=o.trim();const a=o.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)||o.match(/(\[[\s\S]*\])/);a&&(s=a[1]),e=JSON.parse(s),Array.isArray(e)||(console.error("⚠️ Response není pole, používám prázdné pole"),e=[])}catch(o){console.error("❌ Chyba při parsování JSON:",o),console.error("📄 Response text:",r.response),e=[]}return{success:!0,products:e,rawResponse:r.response}}catch(r){return console.error("❌ Kritická chyba při screeningu produktů:",r),{success:!1,products:[],error:r instanceof Error?r.message:String(r)}}}export{l as screenTextForProducts};
