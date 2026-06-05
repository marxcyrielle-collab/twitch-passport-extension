# Twitch Passport Extension

Extension Twitch MVP : passeport saisonnier, tampon quotidien/custom, récompenses, page streamer.

## Fonctionnement
- Viewer panel: affiche le passeport, les tampons gagnés et les récompenses.
- Broadcaster config/live config: permet de créer une saison, choisir le tampon actif du live, créer des tampons custom et des récompenses.
- Backend EBS: vérifie le JWT Twitch, sauvegarde les visites et attribue 1 tampon par viewer par live/jour.

## Installation locale
```bash
npm install
cp .env.example backend/.env
cd backend && npx prisma migrate dev --name init
cd .. && npm run dev
```

Frontend: http://localhost:5173  Backend: http://localhost:3001

## Twitch Developer Console
Créer une Extension Twitch, activer au minimum:
- Panel ou Component extension
- Broadcaster config page: `/broadcaster.html`
- Viewer path: `/index.html`
- Backend EBS URL: votre URL HTTPS backend
- Request Identity Link: Oui si vous voulez un vrai ID Twitch stable au lieu de l'opaqueId.

## Important production
Twitch charge les extensions en HTTPS. Utilisez un hébergement frontend statique et un backend HTTPS. Vérifiez toujours le JWT côté backend.
