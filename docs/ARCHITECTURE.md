# Architecture DAYONE AI

## Boucle produit

```
PLAN ──► objectifs structurés (title, description, deadline, steps, progress)
ACT  ──► 3 missions/jour générées par le Mission Engine
PROGRESS ──► statuts, bilan quotidien, Review Engine, analytics
```

## Modèle de données Firestore

| Collection | Document | Notes |
| --- | --- | --- |
| `users/{uid}` | Profil (langue, fuseau, disponibilité, plan, onboarding) | `plan` non modifiable par le client (règles) |
| `users/{uid}/usage/{date}` | `{ coachMessages, aiCalls }` | Compteurs quotidiens, date locale utilisateur |
| `users/{uid}/subscription/current` | Réservé au futur paiement | Lecture client, écriture serveur uniquement |
| `goals/{goalId}` | Objectif avec `ownerId`, `steps[]`, `progress` | Progression recalculée à chaque écriture |
| `missions/{missionId}` | Mission du jour, `date` locale, statut | Remplacement des missions non terminées à la régénération |
| `dailyPlans/{uid}_{date}` | Liste des `missionIds` du jour | Id déterministe anti-doublon |
| `conversations/{id}` + `messages/{id}` | Conversations coach | Sous-collection messages supprimée explicitement à la suppression du compte |
| `dailyReviews/{uid}_{date}` | Bilan + insights IA | Un bilan par jour |
| `feedbacks/{id}` | Bug/idée/autre | Lecture réservée aux admins |
| `adminUsers/{adminId}` | Registre des admins | Écrit uniquement par le script `set-admin` |
| `systemConfig/quotas` | Quotas effectifs Free/Premium | Écrit serveur + audit |
| `globalMetrics/aiUsage` | Compteurs IA agrégés (90 jours) | Écrit par les routes IA |
| `auditLogs/{id}` | Actions sensibles | Lecture admin, écriture serveur uniquement |

## Pipeline IA

`Auth (ID token vérifié + révocation) → Rate limit (IP) → Quota (transaction Firestore, date locale) → Contexte (Admin SDK) → Adaptateur → Validation Zod → Écriture → Réponse`

- **Adaptateur** (`lib/ai/providers.ts`) : Groq (OpenAI-compatible) / Gemini / OpenRouter. Ordre : fournisseur configuré → autres fournisseurs disposant d'une clé (fallback transparent, jamais simulé). Timeout 45 s, réessai unique sur 429/5xx/réseau.
- **Mission Engine** : sort exactement 3 missions `{title, instructions, durationMin, goalId, priority}` en respectant la disponibilité, la progression (priorise les objectifs les moins avancés), la période préférée et l'historique récent (anti-répétition).
- **Coach Engine** : contexte = objectifs + missions du jour + bilan de la veille ; garde-fous anti-médical/psychologique/financier dans le prompt système.
- **Review Engine** : `{summary, adjustments[1..4], focus}` validé par Zod.
- **Quotas** : consommation atomique avant appel ; remboursement si le fournisseur échoue ; limites résolues depuis `systemConfig/quotas` (jamais depuis le navigateur).

## Sécurité

1. **Sessions** : ID token Firebase en cookie `d1_session` (1 h) pour le redirect middleware ; chaque API re-vérifie le token via `verifyIdToken(token, true)`.
2. **Autorisation** : `ownerId` comparé côté serveur ; admins par Custom Claims ; plan et quotas lus par l'Admin SDK.
3. **Règles Firestore** : refus par défaut ; écritures confinées au propriétaire ; `plan` intouchable par le client ; `systemConfig`, `globalMetrics`, `auditLogs` en lecture selon rôle, écriture interdite.
4. **Suppression du compte** : énumération explicite de toutes les sous-collections (`messages`, `usage`) avant suppression du compte auth.
5. **Rate limiting** : fenêtre glissante en mémoire par instance (complément du quota persistant).
6. **Secrets** : jamais en `NEXT_PUBLIC_*`, jamais dans Git ; `.env.example` documente la structure.

## PWA

- `manifest.webmanifest` : standalone, icônes any + maskable, raccourcis Missions/Coach.
- `sw.js` : cache-first pour assets immuables, network-first pour navigations avec fallback `offline.html`, bypass `/api/`.
- Firestore IndexedDB persistant (multi-onglets) : données déjà chargées consultables hors ligne ; génération IA et coach nécessitent le réseau (comportement annoncé).

## Décisions notables

- **Id déterministes** (`{uid}_{date}`) pour plans et bilans : idempotence sans transaction supplémentaire.
- **Pas de Cloud Functions** : la logique serveur vit dans les Route Handlers Node.js (déploiement Vercel unique).
- **i18n maison** (~250 clés × 3 langues, typées par le dictionnaire EN) : zéro dépendance, langue persistée en cookie (SSR) + profil.
- **Quotas serveur configurables** : l'admin ajuste les limites sans redeploiement ; audit systématique.
