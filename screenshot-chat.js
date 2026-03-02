const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Přejdi na aplikaci
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    // Čekej na načtení chatboxu
    await page.waitForTimeout(2000);
    
    // Pořiď screenshot
    const screenshotPath = path.join(__dirname, 'chat-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    console.log(`Screenshot uložen: ${screenshotPath}`);
    
  } catch (error) {
    console.error('Chyba:', error);
  } finally {
    await browser.close();
  }
})();
