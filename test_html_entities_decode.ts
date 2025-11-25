/**
 * Test dekódování HTML entit
 * Tento skript testuje, že funkce decodeHtmlEntities správně dekóduje HTML entity
 */

// Funkce pro dekódování HTML entit (stejná jako v Edge Function)
function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  
  return text
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// Test případy
const testCases = [
  {
    input: "001 - Rozpt&#xFD;len&#xED; v&#x11B;tru",
    expected: "001 - Rozptýlení větru",
    description: "Hexadecimální entity (produkt 2233)"
  },
  {
    input: "&#x10C;ern&#xE1; &#x10D;&#xE1;rka",
    expected: "Černá čárka",
    description: "Více hexadecimálních entit"
  },
  {
    input: "Prost&#253; text",
    expected: "Prostý text",
    description: "Decimální entita"
  },
  {
    input: "&quot;Citace&quot; s &lt;tagy&gt; &amp; symbolem",
    expected: '"Citace" s <tagy> & symbolem',
    description: "Pojmenované entity"
  },
  {
    input: "Norm&#xE1;ln&#xED; &#x10D;esk&#xFD; text",
    expected: "Normální český text",
    description: "Komplexní český text"
  },
  {
    input: "Text bez entit",
    expected: "Text bez entit",
    description: "Text bez HTML entit (nemělo by se změnit)"
  },
  {
    input: "",
    expected: "",
    description: "Prázdný řetězec"
  },
  {
    input: "P&#x159;&#xED;li&#x161; &#x17E;lu&#x165;ou&#x10D;k&#xFD; k&#x16F;&#x148; &#xFA;p&#x11B;l &#x10F;&#xE1;belsk&#xE9; &#xF3;dy",
    expected: "Příliš žluťoučký kůň úpěl ďábelské ódy",
    description: "Pangram s diakritikou"
  }
];

// Spuštění testů
console.log("🧪 Testování dekódování HTML entit\n");
console.log("═".repeat(80));

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = decodeHtmlEntities(testCase.input);
  const isSuccess = result === testCase.expected;
  
  if (isSuccess) {
    passed++;
    console.log(`✅ PASS: ${testCase.description}`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${testCase.description}`);
    console.log(`   Input:    "${testCase.input}"`);
    console.log(`   Expected: "${testCase.expected}"`);
    console.log(`   Got:      "${result}"`);
  }
  console.log("");
}

console.log("═".repeat(80));
console.log(`\n📊 Výsledky: ${passed} úspěšných, ${failed} neúspěšných`);

if (failed === 0) {
  console.log("🎉 Všechny testy prošly!\n");
  process.exit(0);
} else {
  console.log("⚠️  Některé testy selhaly!\n");
  process.exit(1);
}

