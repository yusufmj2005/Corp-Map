# Contributing to CorpMap

Thanks for your interest in improving CorpMap! Bug reports, feature ideas and pull requests are all welcome.

## Development setup

1. Fork the repository and clone your fork.
2. Install dependencies with `npm install`. Node.js 20 or newer is required.
3. Optionally, copy `.env.example` to `.env` and add an `ANTHROPIC_API_KEY` to work on the AI research feature.
4. Start the website and API with `npm run dev`. Then open http://localhost:5173.

## Before you open a pull request

Run these checks locally. CI runs the same ones on every push and pull request.

```bash
npm run lint
npm run typecheck
npm run build
```

Then:

- Check your change in the browser, in both light and dark mode.
- Keep pull requests focused: one fix or feature per PR.
- Describe what changed and why. Add screenshots for UI changes.

## Code style

- TypeScript everywhere. Avoid `any`, and put shared shapes in `src/lib/types.ts`.
- Style with Tailwind utility classes. Use the semantic colour tokens (`bg-surface`, `text-fg`, `text-muted`, `border-line`, `accent`) rather than raw colours, so dark mode keeps working.
- Keep data fetching in `src/lib/`. Components and pages should stay presentational.
- Use the existing `.editorconfig` settings: 2-space indentation and LF line endings.

## Commit messages

Write short, imperative subject lines, for example:

```
Add stock exchange filter to search
Fix flow chart not fitting on first load
```

## Data issues

Company data comes from Wikidata. If a parent, subsidiary or brand is missing or wrong, the best fix is usually to edit the item on [wikidata.org](https://www.wikidata.org). Every CorpMap user then benefits. Open an issue here when CorpMap itself shows the data incorrectly.

## Reporting security issues

Please don't open a public issue for security problems. See [SECURITY.md](SECURITY.md).
