# Guide des Tests Unitaires 🧪

## 🚀 Comment utiliser les tests

### Commandes disponibles :
- **`npm test`** : Lance tous les tests une fois
- **`npm run test:watch`** : Lance les tests en mode surveillance (recommandé pendant le développement)

### 📁 Ce qui est testé :

#### 1. **Test d'inscription** (`__tests__/signup.test.ts`)
- Validation des champs obligatoires (email, mot de passe, prénom, nom)
- Création de compte avec données valides
- Gestion des erreurs (email déjà utilisé, etc.)

#### 2. **Test de création de tournoi** (`__tests__/create-tournament.test.ts`)
- Validation des champs obligatoires (difficulté, juge, date)
- Validation des dates (pas dans le passé)
- Validation du nombre d'équipes (entre 4 et 128)
- Validation des niveaux de difficulté (P25, P100, etc.)

### ✅ Exemple de résultat
```
Test Suites: 2 passed, 2 total
Tests:       7 passed, 7 total
```

### 💡 Ajouter de nouveaux tests :
1. Crée un fichier `nom-du-test.test.ts` dans le dossier `__tests__`
2. Lance `npm run test:watch` pour voir tes tests en temps réel
3. Écris tes tests avec la syntaxe Jest standard

**C'est tout !** Les tests vérifient automatiquement que ton code fonctionne correctement. 🎯