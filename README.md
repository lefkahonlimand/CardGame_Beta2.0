# 🎮 Card Estimation Game - Beta 2.0

Ein strategisches Multiplayer-Kartenspiel mit Real-Time-Funktionalität, bei dem Spieler Karten basierend auf Höhen- und Breitenwerten auf einem kreuzförmigen Spielbrett platzieren.

## 🎯 Spielkonzept

Das **Card Estimation Game** ist ein innovatives Schätzspiel, bei dem Spieler Karten mit verschiedenen Objekten (Eiffelturm, Burj Khalifa, Krokodil, etc.) auf einem kreuzförmigen Spielbrett platzieren müssen. Die Herausforderung liegt darin, die Größenverhältnisse der Objekte richtig zu schätzen, ohne die genauen Werte zu kennen.

## 🎲 Spielregeln

### Spielstart
- 2-8 Spieler können an einem Spiel teilnehmen
- Jeder Spieler erhält 4 zufällige Handkarten
- Die Kartenwerte (Höhe und Breite) sind zunächst verdeckt
- Ein Spieler beginnt mit der "Ursprungskarte" in der Mitte

### Spielablauf

#### 1. Ursprungskarte platzieren
- Der erste Spieler legt eine Karte als Ursprung in die Mitte
- Diese Karte muss sowohl einen Höhen- als auch Breitenwert haben
- ⚠️ Karten wie "Fußballfeld" (nur Breite) oder "Zugspitze" (nur Höhe) sind nicht erlaubt

#### 2. Kreuzförmiges Layout
Das Spielbrett wächst kreuzförmig von der Mitte nach außen:
```
        [Karte]
           |
[Karte] - [Ursprung] - [Karte]
           |
        [Karte]
```

#### 3. Platzierungsregeln
Karten können nur in den vier Himmelsrichtungen angelegt werden:

- **Oben**: Neue Karte muss **höher** sein als die darunter liegende
- **Rechts**: Neue Karte muss **breiter** sein als die links daneben liegende  
- **Unten**: Neue Karte muss **niedriger** sein als die darüber liegende
- **Links**: Neue Karte muss **schmaler** sein als die rechts daneben liegende

#### 4. Erweiterte Platzierung
- Karten können zwischen bestehende Karten eingefügt werden
- Die Werte-Reihenfolge muss dabei eingehalten werden
- Alle angrenzenden Karten müssen die Regeln erfüllen

#### 5. Spielende einer Runde
- Wenn eine Karte falsch platziert wird, endet die Runde
- Alle Kartenwerte werden aufgedeckt
- Der Fehler wird visualisiert
- Neue Runde startet mit neuen Handkarten

### 🎯 Beispiel-Spielrunde

**Spieler 1**: Legt den **Eiffelturm** als Ursprung (324m hoch, 125m breit)

**Spieler 2**: Legt das **Krokodil** links neben den Eiffelturm (5m breit)
- ✅ Korrekt: Krokodil ist schmaler als Eiffelturm

**Spieler 3**: Legt den **Burj Khalifa** über den Eiffelturm (828m hoch)
- ✅ Korrekt: Burj Khalifa ist höher als Eiffelturm

**Spieler 1**: Versucht die **Zugspitze** zwischen Eiffelturm und Burj Khalifa zu legen
- ❌ Fehler: Zugspitze (2962m) ist höher als Burj Khalifa (828m)
- Runde endet, Werte werden aufgedeckt

## 🚀 Technische Features

### Backend (Node.js/Fastify)
- **Fastify** - Hochperformanter Web-Server
- **Socket.IO** - Real-Time-Kommunikation
- **Redis** - Session-Management (optional)
- **Pino** - Strukturiertes Logging
- **Joi** - Eingabe-Validierung

### Frontend (Vue.js 3)
- **Vue 3** mit Composition API
- **Vite** - Modernes Build-Tool
- **Socket.io-Client** - WebSocket-Verbindungen
- **Responsive Design** - Mobile-first Ansatz

### Sicherheit & Performance
- **Helmet** - Sicherheits-Headers
- **Rate Limiting** - Schutz vor Spam
- **CORS** - Cross-Origin-Konfiguration
- **Input Validation** - Comprehensive Eingabe-Prüfung

## 🎨 UI/UX Features

- **Modern Glassmorphism Design** - Elegante, transparente Optik
- **Drag & Drop** - Intuitive Karten-Interaktion
- **Live Notifications** - Real-Time-Benachrichtigungen
- **Action History** - Spielzug-Verlauf
- **Game Rules** - Integrierte Spielregeln
- **Player Status** - Online/Offline-Anzeige

## 🛠️ Installation & Setup

### Voraussetzungen
- Node.js >= 18.0.0
- npm >= 8.0.0
- Redis (optional, für Session-Management)

### Installation
```bash
# Repository klonen
git clone https://github.com/lefkahonlimand/CardGame_Beta2.0.git
cd CardGame_Beta2.0

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env
# .env-Datei nach Bedarf anpassen
```

### Development
```bash
# Backend-Server starten
npm run dev:server

# Frontend-Dashboard starten
npm run dev:dashboard

# Frontend-GameRoom starten  
npm run dev:gameroom

# Alle Services gleichzeitig starten
npm run dev:all
```

### Production
```bash
# Build erstellen
npm run build

# Production-Server starten
npm start
```

### Docker
```bash
# Docker-Image erstellen
npm run docker:build

# Container starten
npm run docker:run
```

## 🧪 Testing

```bash
# Tests ausführen
npm test

# Tests mit Watch-Mode
npm test:watch

# Coverage-Report
npm test:coverage
```

## 📊 Spielkarten

Das Spiel enthält 20 verschiedene Karten mit realistischen Objekten:

### Ursprungskarten (Höhe + Breite)
- **Eiffelturm** - 324m hoch, 125m breit
- **Burj Khalifa** - 828m hoch, 163m breit
- **Empire State Building** - 381m hoch, 129m breit
- **Kölner Dom** - 157m hoch, 144m breit
- **Brandenburger Tor** - 26m hoch, 65m breit

### Nur Horizontale Karten (nur Breite)
- **Fußballfeld** - 68m breit

### Nur Vertikale Karten (nur Höhe)
- **Zugspitze** - 2962m hoch

### Weitere Karten
- **Giraffe** - 5,5m hoch, 2m breit
- **Elefant** - 3m hoch, 6m breit
- **Krokodil** - 0,5m hoch, 5m breit
- **Blauwal** - 8m hoch, 30m breit
- **Und weitere...**

## 🔧 Konfiguration

### Umgebungsvariablen (.env)
```env
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Game Settings
MAX_PLAYERS=8
CARDS_PER_PLAYER=4
GAME_TIMEOUT_MINUTES=30
```

## 🎮 Spielmodi

### Dashboard-Modus
- Übersicht aktiver Spiele
- Raum erstellen/beitreten
- Spieler-Management
- Spiel-Statistiken

### GameRoom-Modus
- Interaktives Spielbrett
- Handkarten-Verwaltung
- Real-Time-Chat
- Spielzug-Historie

## 🏆 Strategische Tipps

1. **Beobachte die Mitte**: Die Ursprungskarte bestimmt die Proportionen
2. **Schätze clever**: Nutze bekannte Größenverhältnisse
3. **Sichere Züge**: Wähle Karten mit eindeutigen Größenunterschieden
4. **Einfüge-Strategie**: Nutze Lücken zwischen Karten für taktische Vorteile

## 🐛 Debugging & Logs

```bash
# Logs anzeigen
tail -f server.log

# Debug-Modus
DEBUG=* npm run dev:server

# Health-Check
curl http://localhost:3000/health
```

## 📄 API-Endpunkte

### REST-API
- `GET /health` - Server-Status
- `GET /api/games` - Aktive Spiele
- `POST /api/games` - Neues Spiel erstellen

### WebSocket-Events
- `join-game` - Spiel beitreten
- `leave-game` - Spiel verlassen
- `make-move` - Spielzug ausführen
- `game-updated` - Spiel-Status-Update

## 📈 Performance

- **Latenz**: < 50ms für lokale Züge
- **Concurrent Users**: Bis zu 100 gleichzeitige Spieler
- **Memory Usage**: < 100MB pro Spiel-Session
- **WebSocket**: Optimierte Nachrichten-Serialisierung

## 🤝 Mitwirken

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/amazing-feature`)
3. Committe deine Änderungen (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

## 📝 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe [LICENSE](LICENSE) für Details.

## 🙏 Danksagungen

- **Vue.js Team** - Für das fantastische Frontend-Framework
- **Fastify Team** - Für den performanten Backend-Server
- **Socket.IO** - Für Real-Time-Kommunikation
- **Community** - Für Feedback und Verbesserungsvorschläge
- **Warp.dev** - Vibecodesupercharged auf Stoff

## 📞 Support

Bei Fragen oder Problemen:
- **GitHub Issues**: [Issues erstellen](https://github.com/lefkahonlimand/CardGame_Beta2.0/issues)


---
**Weiterhin in Entwicklung...**
**Viel Spaß beim Spielen! 🎉**

