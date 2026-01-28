const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/widget-entry-DQJ0Jcur.js","assets/SanaChat-Bj63mdfm.js","assets/SanaChat-MPqx-1mk.css","assets/preload-helper-ckwbz45p.js","assets/customAuthService-2eqph3FC.js","widgets/widget-entry-Dl0S54sS.css"])))=>i.map(i=>d[i]);
import"./modulepreload-polyfill-B5Qt9EMX.js";import{_ as o}from"./preload-helper-ckwbz45p.js";console.log("🤖 Vany Chat Widget HTML načten");const t=new URLSearchParams(window.location.search);console.log("📋 Widget parametry:",{chatbot:t.get("chatbot"),theme:t.get("theme"),greeting:t.get("greeting")});window.addEventListener("error",r=>{console.error("❌ Widget chyba:",r.error);const e=document.getElementById("root");e&&(e.innerHTML=`
          <div class="widget-error">
            <div class="widget-error-icon">⚠️</div>
            <div class="widget-error-title">Nepodařilo se načíst chat</div>
            <div class="widget-error-message">${r.message||"Neznámá chyba"}</div>
          </div>
        `)});o(()=>import("./widget-entry-DQJ0Jcur.js"),__vite__mapDeps([0,1,2,3,4,5])).catch(r=>{console.error("❌ Nepodařilo se načíst widget:",r);const e=document.getElementById("root");e&&(e.innerHTML=`
          <div class="widget-error">
            <div class="widget-error-icon">⚠️</div>
            <div class="widget-error-title">Chyba načítání</div>
            <div class="widget-error-message">Zkontrolujte konfiguraci widgetu</div>
          </div>
        `)});
