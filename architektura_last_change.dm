[03]
Aktualizovaná Symbolická Struktura (SS)

Sekce,Prvek,Změna,Popis
1.1. Moduly/Soubory,api/get-titles.js,NOVÝ SOUBOR,"Serverless/Edge Proxy Funkce. Čte ID videí, volá YouTube Data API pomocí zabezpečeného klíče z ENV a vrací názvy."
1.3. JS Logika,playlist,Modifikace,Inicializační pole obsahuje pouze ID a dočasný název ('Načítám...').
1.3. JS Logika,fetchVideoTitles(),NOVÁ FUNKCE,"Asynchronní funkce. Volá POST požadavek na /api/get-titles, zpracuje JSON odpověď a aktualizuje globální playlist o získané názvy. Následně volá renderPlaylist()."
1.3. JS Logika,DOMContentLoaded,Modifikace,Po načtení stránky nyní volá fetchVideoTitles() namísto renderPlaylist().
Architektura,API Klíč,ZABEZPEČENO,Klíč (YOUTUBE_API_KEY) je uložen jako proměnná prostředí na Vercelu a přístup k němu má pouze Serverless Funkce.
