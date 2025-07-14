# 🔄 Git-Flow Workflow - Card Estimation Game Beta 2.0

## Branch-Struktur

### 🎯 Main Branch (`main`)
- **Zweck**: Nur für stabile, getestete Releases
- **Schutz**: Keine direkten Commits erlaubt
- **Merges**: Nur von `develop` via Pull Request
- **Tags**: Alle Releases werden hier getaggt (v2.0.0-beta, v3.0.0, etc.)

### 🚀 Develop Branch (`develop`)
- **Zweck**: Hauptentwicklungszweig
- **Basis**: Für alle neuen Features
- **Merges**: Von Feature-Branches via Pull Request
- **Tests**: Automatische Tests bei jedem Merge

### 🌟 Feature Branches (`feature/feature-name`)
- **Zweck**: Entwicklung neuer Features
- **Basis**: Immer von `develop` abzweigen
- **Naming**: `feature/add-multiplayer-chat`, `feature/improve-card-ui`
- **Lebensdauer**: Kurzlebig, nach Merge löschen

### 🔧 Hotfix Branches (`hotfix/issue-description`)
- **Zweck**: Schnelle Fixes für kritische Bugs in Production
- **Basis**: Von `main` abzweigen
- **Merge**: Zurück zu `main` UND `develop`
- **Naming**: `hotfix/fix-game-crash`, `hotfix/security-patch`

### 🎁 Release Branches (`release/version-number`)
- **Zweck**: Vorbereitung neuer Releases
- **Basis**: Von `develop` abzweigen
- **Naming**: `release/v3.0.0`, `release/v2.1.0-beta`
- **Merge**: Zu `main` (nach Tests) und zurück zu `develop`

## 🔄 Workflow-Prozess

### Neue Feature entwickeln

```bash
# 1. Zu develop wechseln und aktualisieren
git checkout develop
git pull origin develop

# 2. Feature-Branch erstellen
git checkout -b feature/mein-neues-feature

# 3. Entwickeln und committen
git add .
git commit -m "feat: Add new feature implementation"

# 4. Branch pushen
git push -u origin feature/mein-neues-feature

# 5. Pull Request erstellen (auf GitHub)
# - Base: develop
# - Compare: feature/mein-neues-feature

# 6. Nach Merge: Branch löschen
git branch -d feature/mein-neues-feature
git push origin --delete feature/mein-neues-feature
```

### Hotfix für Production

```bash
# 1. Von main abzweigen
git checkout main
git pull origin main
git checkout -b hotfix/fix-critical-bug

# 2. Fix implementieren
git add .
git commit -m "fix: Resolve critical game crash bug"

# 3. Zu main mergen
git checkout main
git merge hotfix/fix-critical-bug
git push origin main

# 4. Auch zu develop mergen
git checkout develop
git merge hotfix/fix-critical-bug
git push origin develop

# 5. Hotfix-Branch löschen
git branch -d hotfix/fix-critical-bug
git push origin --delete hotfix/fix-critical-bug

# 6. Hotfix-Tag erstellen
git tag -a v2.0.1-hotfix -m "Hotfix: Critical bug resolution"
git push origin v2.0.1-hotfix
```

### Release vorbereiten

```bash
# 1. Release-Branch von develop erstellen
git checkout develop
git pull origin develop
git checkout -b release/v3.0.0

# 2. Version aktualisieren
# - package.json Version ändern
# - README.md aktualisieren
# - CHANGELOG.md erstellen

# 3. Final Testing
npm test
npm run build

# 4. Release committen
git add .
git commit -m "chore: Prepare release v3.0.0"

# 5. Zu main mergen
git checkout main
git merge release/v3.0.0
git push origin main

# 6. Release taggen
git tag -a v3.0.0 -m "Release: Card Estimation Game v3.0.0"
git push origin v3.0.0

# 7. Zurück zu develop mergen
git checkout develop
git merge release/v3.0.0
git push origin develop

# 8. Release-Branch löschen
git branch -d release/v3.0.0
git push origin --delete release/v3.0.0
```

## 📋 Commit-Konventionen

### Commit-Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Commit-Types
- **feat**: Neue Features
- **fix**: Bug-Fixes
- **docs**: Dokumentation
- **style**: Code-Formatierung
- **refactor**: Code-Refactoring
- **test**: Tests hinzufügen/ändern
- **chore**: Build-Prozess, Dependencies

### Beispiele
```bash
git commit -m "feat(game): Add multiplayer chat functionality"
git commit -m "fix(ui): Resolve card positioning bug"
git commit -m "docs(readme): Update installation instructions"
git commit -m "test(game): Add comprehensive board logic tests"
```

## 🛡️ Branch-Schutzregeln (GitHub)

### Main Branch
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Include administrators in restrictions
- ✅ Require linear history

### Develop Branch
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging

## 🚀 Automatisierung

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run build
        run: npm run build
```

## 📊 Release-Zyklen

### Version-Schema
- **Major**: v3.0.0 (Breaking Changes)
- **Minor**: v2.1.0 (Neue Features)
- **Patch**: v2.0.1 (Bug-Fixes)
- **Pre-Release**: v3.0.0-beta, v3.0.0-alpha

### Release-Zeitplan
- **Major Release**: Alle 6 Monate
- **Minor Release**: Alle 4-6 Wochen
- **Patch Release**: Nach Bedarf
- **Hotfix**: Sofort bei kritischen Bugs

## 🔍 Code-Review-Prozess

### Pull Request Checkliste
- [ ] Tests hinzugefügt/aktualisiert
- [ ] Dokumentation aktualisiert
- [ ] Code-Standards eingehalten
- [ ] Breaking Changes dokumentiert
- [ ] Performance-Impact bewertet

### Review-Kriterien
- **Funktionalität**: Code funktioniert wie erwartet
- **Qualität**: Sauberer, lesbarer Code
- **Tests**: Angemessene Test-Abdeckung
- **Sicherheit**: Keine Sicherheitslücken
- **Performance**: Keine Performance-Regression

## 📝 Schnell-Referenz

```bash
# Neues Feature beginnen
git checkout develop && git pull origin develop
git checkout -b feature/mein-feature

# Feature abschließen
git push -u origin feature/mein-feature
# → GitHub PR erstellen

# Hotfix erstellen
git checkout main && git pull origin main
git checkout -b hotfix/fix-bug

# Release vorbereiten
git checkout develop && git pull origin develop
git checkout -b release/v3.0.0

# Status prüfen
git status
git branch -a
git log --oneline -10

# Branches aufräumen
git branch -d feature/completed-feature
git push origin --delete feature/completed-feature
```

---

**Wichtig**: Niemals direkt auf `main` committen! Alle Änderungen gehen über Pull Requests.
