# Systém generování hesel z příjmení

## Přehled

Aplikace nyní používá automatické generování hesel na základě příjmení uživatele. Heslo má následující formát:

**4 písmena z příjmení + 4 náhodné číslice**

Příklad:
- Příjmení: `Novák`
- Vygenerované heslo: `nova5847` (4 písmena + 4 náhodné číslice)

## Přihlašovací formulář

### Co uživatel zadává:
1. **Email** - emailová adresa uživatele
2. **Příjmení** - příjmení uživatele (min. 4 znaky)

### Jak to funguje:
- Při zadání příjmení (alespoň 4 znaky) se automaticky vygeneruje heslo
- Heslo je zobrazeno v poli "Vygenerované heslo" s možností zobrazit/skrýt
- Uživatel použije toto heslo pro přihlášení
- Každé zadání příjmení generuje NOVÉ náhodné heslo (kvůli náhodným číslicím)

### Možnosti:
- Uživatel může heslo zobrazit kliknutím na ikonku oka
- Funkce "Zapomněli jste heslo?" nyní vyžaduje email i příjmení

## Správa uživatelů (Admin)

### Vytváření nového uživatele:

Správce při vytváření uživatele zadává:
1. **Email** - emailová adresa nového uživatele
2. **Příjmení** - příjmení nového uživatele (min. 4 znaky)
3. **Role** - admin nebo správce

### Proces:
1. Správce vyplní formulář
2. Po zadání příjmení se zobrazí náhled, jak bude heslo vypadat
3. Po kliknutí na "Vytvořit uživatele" se:
   - Vytvoří účet v Supabase
   - Vygeneruje se heslo z příjmení
   - Vytvoří se profil uživatele
4. Po úspěšném vytvoření se zobrazí:
   - Email nového uživatele
   - **Vygenerované heslo** s tlačítkem pro kopírování
5. Správce tyto údaje předá novému uživateli

## Technická implementace

### Funkce pro generování hesla

```typescript
export function generatePasswordFromSurname(surname: string): string {
    if (!surname || surname.length < 4) {
        throw new Error('Příjmení musí mít alespoň 4 znaky');
    }
    
    // Vezme první 4 písmena z příjmení (převedená na malá písmena)
    const surnamepart = surname.substring(0, 4).toLowerCase();
    
    // Vygeneruje 4 náhodné číslice
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    
    return surnamepart + randomDigits;
}
```

### Upravené komponenty:
1. **LoginForm.tsx** - přidáno pole pro příjmení a automatické generování hesla
2. **AddUserModal.tsx** - přidáno pole pro příjmení s náhledem hesla
3. **authService.ts** - přidána funkce `createUserWithSurname()` a `generatePasswordFromSurname()`

## Bezpečnost

### Bezpečnostní aspekty:
- Heslo obsahuje kombinaci písmen a číslic
- Náhodná část hesla (4 číslice) zajišťuje, že každé heslo je unikátní
- Minimální délka hesla je 8 znaků
- Heslo splňuje základní požadavky na sílu hesla

### Doporučení:
- Po prvním přihlášení by uživatelé měli změnit své heslo na bezpečnější
- Zvažte implementaci funkce "Změnit heslo" v uživatelském profilu
- Pro produkční nasazení zvažte přidání dalších bezpečnostních prvků (2FA, silnější hesla, atd.)

## Reset hesla

Reset hesla nyní:
1. Vyžaduje zadání emailu a příjmení
2. Odešle reset email přes Supabase
3. Zobrazí nově vygenerované heslo
4. Uživatel může použít nové heslo pro přihlášení

**POZNÁMKA**: Pro plně funkční reset hesla je nutné mít správně nakonfigurované Supabase email šablony.


