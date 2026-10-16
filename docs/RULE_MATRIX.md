# Regelmatrix – Sky Team YUL

Quelle: Offizielle Grundspielanleitung [KOSMOS](https://cms.kosmos.de/Downloads/4002051684044%20_Sky%20Team_Manual_01_DE_web.pdf), [Scorpion Masqué](https://www.scorpionmasque.com/sites/scorpionmasque.com/files/st_rules01_en_06jun2023.pdf). Sie beschreibt die Mechanik; Bilder dienen nur der Darstellung.

| Mechanik | Bedingungen | Autoritative Änderung | Tests |
|---|---|---|---|
| Lobby | maximal 2 UIDs; anonyme Auth | Rollen, Bereitschaft | `engine.test.ts`, RTDB-Regeln |
| Pflichtfelder | pro Rolle Ruder und Triebwerke | Verloren bei fehlenden Feldern am Rundenende | Engine |
| Ruder | zweite Platzierung, Differenz der Würfel | `axis += pilot-copilot`, ab rotem Limit verloren | Engine |
| Triebwerke | zweite Platzierung, Summe | 0/1/2 Schritte, Kollision/Überschießen sofort | Engine |
| Funk | Eigentümer, beliebiger Würfel 1-6 | ein Flugzeug auf relativer Position minus 1 | Engine |
| Fahrwerk | Pilot, Paare 1/2, 3/4, 5/6 | bleibendes grünes Licht, `blueThreshold++` | Engine |
| Landeklappen | Copilot, erforderliche Reihenfolge | bleibendes Licht, `orangeThreshold++` | Engine |
| Bremsen | Pilot, Reihenfolge 2,4,6 | dauerhaft mehr Bremsstärke | Engine |
| Kaffee | beide Rollen, max. 3 | +/-1 pro Marker, Wert 1–6 | Engine |
| Neuwurf | gemeinsames Plättchen, beide bestätigen | geheime Neuwürfe nur auf eigene freie Würfel | Engine + RTDB |
| Rundenende | 8 platzierte Würfel | -1000 Fuß, temporäre Belegung räumen | Engine |
| Landung | letzte Runde bei Flughafen und Höhe null | strenger Bremsvergleich und gesamte Siegbedingungen | Engine |
| Geheimhaltung | Nur `privateDice/<uid>` lesbar | fremde private Würfel sind geschützt | Firebase Emulator |

## Konkrete noch nicht automatisierte Nachweise

- Vollständige YUL-Partie mit einem reproduzierbaren Gewinnpfad und mehreren Verlustpfaden über sieben Runden.
- Zwei parallel laufende Flutter-Geräte mit zeitgleichen Aktionen, echten Cloud-Functions-Transaktionen, Rückkehr nach Verbindungsverlust.
- Exakte grafische Hitbox-Kalibrierung gegenüber den noch fehlenden Original-Cockpitgrafiken.
- Performance und Verhalten auf iOS nicht im Scope.

Ein erfolgreicher Flutter-Build alleine erfüllt diese Abnahme **nicht**.
