# Connecter Firebase à DAYONE AI

Ce guide part de zéro. À la fin, l'application déployée sur Vercel aura un backend fonctionnel (authentification, base de données, sécurité).

## 1. Créer le projet Firebase

1. Ouvrir <https://console.firebase.google.com> → **Add project** → nom : `dayone-ai` (ou autre) → Google Analytics : facultatif.
2. Une fois créé, ouvrir **Project settings** (icône engrenage).

## 2. Activer l'authentification

1. **Build → Authentication → Get started**.
2. Activer **Email/Password**.
3. Activer **Google** (choisir un e-mail de support).
4. Onglet **Settings → Authorized domains** : ajouter le domaine Vercel de l'application (ex. `dayone-ai.vercel.app` et le domaine de prévisualisation si utilisé).

## 3. Créer la base Firestore

1. **Build → Firestore Database → Create database**.
2. Choisir une région proche des utilisateurs (ex. `europe-west`).
3. Démarrer en **production mode** (les règles du dépôt prennent le relais).

## 4. Récupérer la configuration web (non secrète)

**Project settings → General → Your apps → Web app (</>)** → enregistrer une app → copier les valeurs dans les variables d'environnement :

| Config Firebase | Variable d'environnement |
| --- | --- |
| apiKey | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| authDomain | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| projectId | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| storageBucket | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| messagingSenderId | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| appId | `NEXT_PUBLIC_FIREBASE_APP_ID` |

Ces identifiants sont publics par conception (ils identifient le projet, ne l'autorisent pas).

## 5. Créer le compte de service (SECRET)

1. **Project settings → Service accounts → Generate new private key** → télécharger le JSON.
2. En extraire :

| Champ JSON | Variable d'environnement |
| --- | --- |
| project_id | `FIREBASE_ADMIN_PROJECT_ID` |
| client_email | `FIREBASE_ADMIN_CLIENT_EMAIL` |
| private_key | `FIREBASE_ADMIN_PRIVATE_KEY` (garder les `\n` dans la valeur) |

Ce compte de service donne un accès total au projet : **ne jamais le committer, ne jamais le placer dans `NEXT_PUBLIC_*`, ne le configurer que dans les variables serveur (Vercel).**

## 6. Déployer les règles et les index

Depuis la racine du projet, avec la CLI Firebase (`npm i -g firebase-tools`, puis `firebase login` et `firebase use --add`) :

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Sans CLI : coller le contenu de `firestore.rules` dans **Firestore → Rules**, puis créer les index de `firestore.indexes.json` via **Firestore → Indexes → Add index** (les mêmes champs/ranges).

## 7. Promouvoir un administrateur

Le rôle admin est porté par un Custom Claim (impossible à falsifier depuis le client) :

```bash
FIREBASE_ADMIN_PROJECT_ID=... \
FIREBASE_ADMIN_CLIENT_EMAIL=... \
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
node dayone-scripts/set-admin.mjs votre-email@example.com admin
```

Se déconnecter/reconnecter pour rafraîchir les claims, puis ouvrir `/admin`.

## 8. Configurer Vercel

Dans **Vercel → Project → Settings → Environment Variables**, ajouter :

- les 6 variables `NEXT_PUBLIC_FIREBASE_*`
- les 3 variables `FIREBASE_ADMIN_*` (Encrypté)
- `AI_PROVIDER=groq` + les clés IA (`GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`)

Puis **Redeploy** (les variables `NEXT_PUBLIC_*` sont injectées au build).

## 9. Vérifier

- `GET /api/health` → `firebaseClient: true`, `firebaseAdmin: true`.
- Créer un compte → vérification e-mail envoyée → onboarding → dashboard.
- Générer les missions du jour → 3 missions apparaissent.
- Coach → réponse en 5 messages (Free).
- `/admin` avec un compte non-admin → « Accès refusé ».

## Dépannage

| Symptôme | Cause probable |
| --- | --- |
| « Backend configuration required » | Variables `NEXT_PUBLIC_FIREBASE_*` absentes → redeploiement |
| 503 sur les routes `/api/*` | Variables `FIREBASE_ADMIN_*` absentes |
| `auth/configuration-not-found` Google | Provider Google non activé, ou domaine non autorisé |
| Erreur d'index Firestore | Index composites de `firestore.indexes.json` non créés |
| Quota dépassé alors que non consommé | `systemConfig/quotas` invalide → valeurs par défaut appliquées |
