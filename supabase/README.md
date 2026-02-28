# Supabase – CODAG Request Manager

## Schéma

Appliquer le schéma SQL :

```bash
# Depuis le dossier du projet, avec Supabase CLI lié au projet
supabase db push
# ou exécuter manuellement le contenu de schema.sql dans le SQL Editor du Dashboard
```

## Stockage (pièces jointes)

Pour que l’upload des pièces jointes fonctionne sur la page « Nouvelle demande » :

1. Dans le **Dashboard Supabase** → **Storage**, créez un bucket nommé **`ticket-attachments`**.
2. Rendez-le **public** (Policy : lecture publique pour `getPublicUrl`) ou configurez des RLS adaptées si vous préférez des URLs signées.

Sans ce bucket, la création de ticket avec pièces jointes renverra une erreur au moment de l’upload.

## Email de clôture (Resend)

Une Edge Function envoie un email au demandeur lorsque le GDR clôture un ticket (statut « Terminé »).

### Déploiement

1. [Installer le Supabase CLI](https://supabase.com/docs/guides/cli) et vous connecter au projet.
2. Créer une clé API sur [Resend](https://resend.com/api-keys).
3. Définir le secret pour la fonction :
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxx
   ```
   Optionnel : `RESEND_FROM` (ex. `CODAG <noreply@votredomaine.com>`), sinon `onboarding@resend.dev` est utilisé.
4. Déployer la fonction :
   ```bash
   supabase functions deploy send-closure-email
   ```

Si la fonction n’est pas déployée ou si `RESEND_API_KEY` n’est pas défini, la clôture du ticket reste possible ; seul l’envoi d’email est ignoré.
