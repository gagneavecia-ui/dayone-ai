# DAYONE AI

> **Your life. Your goals. Your progress.**
> Compagnon intelligent qui transforme les objectifs personnels en missions quotidiennes réalisables.

DAYONE AI aide les jeunes (16+) à suivre une boucle simple : **PLAN → ACT → PROGRESS**.
Chaque matin, trois missions prioritaires concrètes, calibrées sur le temps disponible et reliées aux objectifs. Chaque soir, un bilan quotidien ajusté par le coach IA.

## Fonctionnalités (MVP)

- **Authentification** : e-mail/mot de passe, Google, vérification e-mail, réinitialisation, suppression de compte complète (données incluses, sous-collections comprises).
- **Onboarding** en 4 étapes : profil, langue/fuseau, objectifs, disponibilité.
- **Dashboard** : missions du jour, progression globale, série (streak), prochaine action, accès coach.
- **Gestionnaire d'objectifs** : création, édition, étapes, échéance, progression, archivage, suppression.
- **Missions quotidiennes** : 3 missions générées par le moteur IA, statuts (à faire / en cours / terminée / reportée), historique.
- **Coach IA** : conversation contextualisée (objectifs + missions du jour), quotas serveur, réponses en 3 langues.
- **Bilan quotidien** : formulaire + ajustements IA pour le lendemain.
- **Progression** : statistiques hebdomadaires, séries, progression par objectif, historique 7 jours (Free) / 90 jours (Premium).
- **Espace admin** : utilisateurs, usage IA, abonnements, analytics, signalements, configuration des quotas serveur, journaux d'audit.
- **Freemium** : quotas (Free 3 objectifs / 5 messages coach / 7 jours ; Premium 10 / 30 / 90) configurables côté serveur.
- **i18n** : anglais, français, espagnol (interface + coach).
- **PWA installable** : manifest, service worker, cache statique, fallback hors ligne, persistance IndexedDB.
- **Sécurité** : vérification Firebase ID Token côté serveur, règles Firestore strictes, validation Zod, rate limiting, quotas serveur, rôles via Custom Claims, audit des actions sensibles.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · shadcn/ui · Lucide
Firebase Authentication · Cloud Firestore · Firebase Admin SDK (serveur)
Adaptateur IA multi-fournisseurs : Groq (défaut), Gemini, OpenRouter — bascule par variable d'environnement
Zod · Vercel · GitHub · PWA

## Structure

```
src/
├─ app/                    # Routes (App Router)
│  ├─ page.tsx             # Landing publique
│  ├─ pricing, login, register, forgot-password, legal/*
│  ├─ onboarding/
│  ├─ (app)/               # Zone privée protégée (layout + middleware)
│  │  ├─ dashboard, goals, missions, coach, progress, review, settings
│  ├─ admin/               # 8 pages d'administration (rôles vérifiés)
│  └─ api/                 # Route Handlers (IA, admin, feedback, santé)
├─ components/             # UI (shadcn), layout, shared, admin, pwa
├─ lib/
│  ├─ ai/                  # providers.ts (adaptateur), engines.ts (3 moteurs), quotas.ts
│  ├─ auth/                # client (SDK) + server (vérification ID token)
│  ├─ db/                  # services Firestore côté client
│  ├─ firebase/            # client.ts + admin.ts
│  ├─ i18n/                # en / fr / es + provider
│  ├─ plans.ts             # limites Free/Premium
│  └─ rate-limit.ts        # limitation en mémoire par instance
├─ middleware.ts           # Protection UX des routes privées
└─ types/
firestore.rules            # Règles de sécurité strictes
firestore.indexes.json     # Index composites
dayone-scripts/            # set-admin.mjs, test-ai.mjs
docs/                      # SETUP-FIREBASE.md, ARCHITECTURE.md
```

## Démarrage rapide

```bash
cp .env.example .env.local   # remplir les valeurs (voir docs/SETUP-FIREBASE.md)
npm install
npm run dev                  # http://localhost:3000
```

## Variables d'environnement

Voir `.env.example`. Points clés :

| Variable | Rôle | Secret ? |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Configuration SDK web Firebase | Non (public par conception) |
| `FIREBASE_ADMIN_*` | SDK Admin (compte de service) | **OUI — serveur uniquement** |
| `AI_PROVIDER` | `groq` \| `gemini` \| `openrouter` | Non |
| `GROQ_API_KEY` / `GEMINI_API_KEY` / `OPENROUTER_API_KEY` | Clés des fournisseurs IA | **OUI — serveur uniquement** |

## Pipeline IA

```
Utilisateur → Authentification (ID token vérifié) → Rate limit → Quotas serveur
→ Construction du contexte (Firestore Admin) → Adaptateur IA (provider) → Modèle
→ Validation Zod → Firestore → Réponse
```

Chaque moteur (Mission, Coach, Review) impose un contrat JSON validé par Zod, avec réessais contrôlés et remboursement du quota si le fournisseur échoue.

## Rôles

- **Free / Premium** : plans stockés côté serveur (jamais lus depuis le navigateur pour l'autorisation).
- **Admin / Super Admin** : Custom Claims Firebase (`role`), vérifiés sur chaque appel API admin. Promotion : `node dayone-scripts/set-admin.mjs email admin`.

## Déploiement

1. Configurer Firebase → `docs/SETUP-FIREBASE.md` (règles + index inclus dans le dépôt).
2. Connecter le dépôt GitHub à Vercel (framework Next.js détecté automatiquement).
3. Ajouter les variables d'environnement (Firebase + clés IA) puis déployer.
4. `/api/health` doit répondre `{ "firebaseClient": true, "firebaseAdmin": true, ... }`.

## Sécurité et conformité

- Secrets uniquement côté serveur ; aucune clé IA exposée au navigateur ou dans Git.
- Règles Firestore : chaque utilisateur n'accède qu'à ses propres documents ; plan non modifiable par le client ; configuration/métriques/audit en lecture seule.
- Les conversations restent privées : l'admin ne les lit pas ; les actions d'administration sont journalisées (`auditLogs`).
- Suppression de compte = suppression explicite de toutes les sous-collections (les suppressions Firestore ne sont pas récursives).
- Coach IA : positionné comme outil de productivité, jamais comme professionnel de santé ou financier (voir pages légales).
- Protection des mineurs et obligations locales : à vérifier pays par pays avant commercialisation.

## Feuille de route

Paiements Premium (activation des plans depuis l'app), notifications de rappel, export des données, webhooks analytics.
