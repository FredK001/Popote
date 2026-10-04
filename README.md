# Popote

Application de recettes sociale (PWA) : ton carnet de recettes, partagé avec tes copains.

- Brief produit : [`popote-prompt-claude-code.md`](popote-prompt-claude-code.md)
- Maquette de référence : [`design/popote-v4-ingredients.html`](design/popote-v4-ingredients.html)
- Conventions et décisions : [`CLAUDE.md`](CLAUDE.md)

## Démarrer

```bash
nvm use            # Node 22
npm install
cp .env.example .env.local   # puis remplir les clés
npm run dev        # http://localhost:3000
```

Page de référence des composants : http://localhost:3000/design-system

Base de données : projet Supabase distant (pas de Docker en local). Les migrations et les tests RLS tournent dans la CI.
