#!/usr/bin/env python3
"""
Script pro bezpečné odstranění console.log výpisů ze souborů.
Odstraní:
- Samostatné console.log/warn/error/info příkazy
- Inline console logy v JSX
- Zachová strukturu kódu a odsazení
"""

import re
import sys

def remove_console_logs(content):
    """
    Odstraní console logy z obsahu souboru.
    """
    lines = content.split('\n')
    result_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Zkontroluj, jestli řádek obsahuje pouze console.log (s možným whitespace)
        if re.match(r'^\s*console\.(log|warn|error|info)\(', line):
            # Najdi konec console výrazu (může pokračovat na dalších řádcích)
            paren_count = line.count('(') - line.count(')')
            
            # Pokud je výraz uzavřený na stejném řádku
            if paren_count == 0:
                # Přeskoč tento řádek
                i += 1
                continue
            
            # Pokud výraz pokračuje na dalších řádcích
            while i < len(lines) - 1 and paren_count > 0:
                i += 1
                paren_count += lines[i].count('(') - lines[i].count(')')
            
            # Přeskoč poslední řádek console výrazu
            i += 1
            continue
        
        # Zkontroluj inline console logy v JSX (např. {console.log(...)} na samostatném řádku)
        if re.match(r'^\s*\{console\.(log|warn|error|info)\(', line):
            # Najdi konec výrazu
            paren_count = line.count('(') - line.count(')')
            brace_count = line.count('{') - line.count('}')
            
            # Pokud je výraz uzavřený na stejném řádku
            if paren_count == 0 and brace_count == 0:
                i += 1
                continue
            
            # Pokud výraz pokračuje na dalších řádcích
            while i < len(lines) - 1 and (paren_count > 0 or brace_count > 0):
                i += 1
                paren_count += lines[i].count('(') - lines[i].count(')')
                brace_count += lines[i].count('{') - lines[i].count('}')
            
            i += 1
            continue
        
        # Zkontroluj inline console log ve funkci (např. arrow function s console.log)
        # Např: const func = () => console.log(...);
        if re.search(r'=>\s*console\.(log|warn|error|info)\(', line):
            # Nahraď console.log za prázdnou funkci
            line = re.sub(r'=>\s*console\.(log|warn|error|info)\([^)]*\);?', '=> {};', line)
        
        result_lines.append(line)
        i += 1
    
    return '\n'.join(result_lines)

def process_file(filepath):
    """
    Zpracuj jeden soubor.
    """
    print(f"Zpracovávám {filepath}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Spočítej původní počet console logů
        original_count = len(re.findall(r'console\.(log|warn|error|info)\(', content))
        
        # Odstraň console logy
        new_content = remove_console_logs(content)
        
        # Spočítej nový počet console logů
        new_count = len(re.findall(r'console\.(log|warn|error|info)\(', new_content))
        
        # Ulož nový obsah
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        removed = original_count - new_count
        print(f"  ✅ Odstraněno {removed} console logů (zbývá {new_count})")
        
        return True
    except Exception as e:
        print(f"  ❌ Chyba: {e}")
        return False

if __name__ == "__main__":
    files = [
        "/Users/petrhajduk/Documents/Code/Bewit/Manazer Knih/app/src/components/SanaChat/SanaChat.tsx"
    ]
    
    for filepath in files:
        process_file(filepath)
    
    print("\n✅ Hotovo!")
















