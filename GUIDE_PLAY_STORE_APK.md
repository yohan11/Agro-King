# 📱 Guide : Transformation en Application Téléchargeable (APK & Google Play Store)

L'application **AGRO KING** est désormais 100% optimisée pour fonctionner comme une **véritable application mobile native** sur smartphone et être publiée sur le **Google Play Store**.

---

## Option 1 : Installation Directe sur Smartphone en 1 Clic (Sans passer par le Store)

1. Ouvrez l'application sur le navigateur de votre smartphone (Chrome, Safari, Edge, Samsung Internet).
2. Une bannière verte en haut s'affiche automatiquement : **« 📲 Installer l'Application »**.
3. Appuyez sur **Installer** :
   - Sur **Android** : L'icône AGRO KING s'installe directement sur l'écran d'accueil de votre téléphone, sans barre de navigation web, avec démarrage instantané en plein écran comme une application téléchargée.
   - Sur **iPhone (iOS)** : Appuyez sur le bouton *Partager* ⬆️ puis *« Sur l'écran d'accueil »* ➕.

---

## Option 2 : Générer le Fichier `.APK` & le Bundle Google Play Store (`.AAB`)

Pour distribuer votre application sous forme de fichier `.apk` téléchargeable ou la publier sur la console **Google Play** :

### Méthode Recommandée : Via PWABuilder (Certifié Google & Microsoft)
1. Rendez-vous sur [PWABuilder.com](https://www.pwabuilder.com/).
2. Entrez l'URL de votre application déployée (ex: `https://votre-domaine-agroking.vercel.app`).
3. PWABuilder vérifiera automatiquement le `manifest.json` et le `sw.js` (qui sont déjà configurés à 100%).
4. Cliquez sur **« Package For Stores »** puis choisissez **Android**.
5. Cliquez sur **« Download Package »** :
   - Vous obtiendrez votre fichier **`.apk`** (pour installation manuelle sur n'importe quel téléphone Android).
   - Et votre fichier **`.aab`** (Android App Bundle prêt à être soumis sur le Google Play Store).

---

## Option 3 : Compilation Native via Bubblewrap (Ligne de commande Google TWA)

Si vous disposez de Node.js et du SDK Android :
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://votre-domaine-agroking.vercel.app/manifest.webmanifest
bubblewrap build
```
Le fichier `app-release-signed.apk` sera généré dans votre dossier.
