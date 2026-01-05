const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/widget-entry-Cu5tYe7c.js","assets/WaveLoader-DvqYMd3O.js","assets/preload-helper-B8tWKQ1F.js","assets/WaveLoader-MPqx-1mk.css","assets/widget-entry-gKVpdGeJ.css"])))=>i.map(i=>d[i]);
import{_ as o}from"./preload-helper-B8tWKQ1F.js";console.log("🤖 Vany Chat Widget HTML načten");const t=new URLSearchParams(window.location.search);console.log("📋 Widget parametry:",{chatbot:t.get("chatbot"),theme:t.get("theme"),greeting:t.get("greeting")});window.addEventListener("error",r=>{console.error("❌ Widget chyba:",r.error);const e=document.getElementById("root");e&&(e.innerHTML=`
          <div class="widget-error">
            <div class="widget-error-icon">⚠️</div>
            <div class="widget-error-title">Nepodařilo se načíst chat</div>
            <div class="widget-error-message">${r.message||"Neznámá chyba"}</div>
          </div>
        `)});o(()=>import("./widget-entry-Cu5tYe7c.js"),__vite__mapDeps([0,1,2,3,4])).catch(r=>{console.error("❌ Nepodařilo se načíst widget:",r);const e=document.getElementById("root");e&&(e.innerHTML=`
          <div class="widget-error">
            <div class="widget-error-icon">⚠️</div>
            <div class="widget-error-title">Chyba načítání</div>
            <div class="widget-error-message">Zkontrolujte konfiguraci widgetu</div>
          </div>
        `)});
