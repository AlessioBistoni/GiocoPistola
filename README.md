# 🎯 Gioco Pistola a Mano

Un gioco interattivo dove devi sparare a dischi volanti usando la tua mano come pistola e la webcam per il rilevamento dei movimenti.

## 🎮 Come Giocare

1. **Preparazione**: Assicurati di avere una webcam funzionante e un browser moderno
2. **Posizione della mano**: 
   - Mima una pistola con la mano (indice e pollice)
   - L'indice punta verso lo schermo (per mirare)
   - Il pollice funziona come grilletto (abbassalo per sparare)
3. **Mira**: Muovi la mano per puntare il mirino rosso sui dischi volanti
4. **Spara**: Abbassa il pollice (come premere un grilletto) per sparare un proiettile
5. **Obiettivo**: Colpisci più dischi possibile per ottenere punti!
6. **Opzioni**: Puoi attivare/disattivare la visualizzazione dello scheletro della mano dal pannello di controllo

## 🚀 Come Avviare

1. Servi la cartella con un server locale (l'accesso alla webcam richiede un contesto sicuro: `https://` o `localhost`, **non funziona aprendo il file con doppio click**, cioè `file://`). Ad esempio:
   ```bash
   npx serve .
   # oppure
   python3 -m http.server 8000
   ```
2. Apri l'indirizzo mostrato (es. `http://localhost:8000`) in un browser moderno (Chrome, Firefox, Edge)
3. Clicca su "Inizia Gioco"
4. Consenti l'accesso alla webcam quando richiesto
5. Inizia a giocare!

## 📋 Requisiti

- Browser moderno con supporto per:
  - WebRTC (per accesso webcam)
  - Canvas API
  - MediaPipe Hands (caricato via CDN)
- Webcam funzionante
- Connessione internet (per caricare MediaPipe)

## 🎯 Controlli

- **Mira**: Muovi la mano davanti alla webcam
- **Spara**: Abbassa il pollice verso il palmo (gesto del grilletto)
- **Pausa**: Clicca il pulsante "Pausa" per mettere in pausa il gioco

## 🏆 Sistema di Punteggio

- **+10 punti** per ogni disco colpito
- Il punteggio mostra anche:
  - Dischi Colpiti
  - Dischi Mancati

## 🛠️ Tecnologie Utilizzate

- **HTML5 Canvas**: Per il rendering del gioco
- **MediaPipe Hands**: Per il rilevamento della mano in tempo reale
- **WebRTC**: Per l'accesso alla webcam
- **JavaScript Vanilla**: Per tutta la logica di gioco

## 💡 Note

- Il gioco funziona meglio con buona illuminazione
- Assicurati che la mano sia ben visibile nella webcam
- Il rilevamento funziona meglio quando c'è contrasto tra la mano e lo sfondo

## 🎨 Personalizzazione

Puoi modificare le impostazioni del gioco nel file `game.js` nella sezione `config`:

```javascript
const config = {
    discSpawnRate: 2000,    // Frequenza di spawn dei dischi (ms)
    discSpeed: 2,           // Velocità dei dischi
    bulletSpeed: 15,        // Velocità dei proiettili
    discRadius: 30,         // Dimensione dei dischi
    thumbThreshold: 0.1,    // Sensibilità del rilevamento pollice
};
```

Buon divertimento! 🎮

