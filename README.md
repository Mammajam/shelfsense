# ShelfSense

Location-specific stocking recommendations for independent merchants, backed by Qloo taste data.
A shop owner enters a location and current range; the agent reads the area's taste profile, compares it
to the range, and returns a ranked list of what to add, reduce and partner with, each citing its evidence.

Built for the Qloo Agentic Hackathon.

## How it works
1. **Sense** – Qloo Insights with a location signal returns the area's taste profile (brands, venues).
2. **Compare** – the area is compared against a reference area to find what is distinctive here.
3. **Map** – the catalog mapper matches taste signals to the shop's uploaded range CSV.
4. **Decide** – gaps are ranked by affinity x lift; reduce calls need the optional sales column.
5. **Explain** – Claude rewrites each reason in plain language using only the attached evidence.

A side panel shows the same shop answered by a plain LLM with no Qloo data, for contrast.

## Setup
```bash
npm install
cp .env.example .env.local   # add QLOO_API_KEY and ANTHROPIC_API_KEY
npm run dev
```
Without `QLOO_API_KEY` the app runs on clearly labelled demo data. Set `QLOO_MODE=mock` to force that.
Without `ANTHROPIC_API_KEY` reasons use plain templates and the baseline panel shows a generic example.

## Scripts
- `npm run spike -- "Brooklyn, NY" Nivea` – call Qloo and save raw responses to `fixtures/`
- `npm test` – unit tests for the mapper and engine

## Range CSV
Header `name,brand,category,weekly_sales` (brand and sales optional). Example in the UI.

## Deploy
Import the repo into Vercel and set `QLOO_API_KEY` and `ANTHROPIC_API_KEY` as environment variables.

## License
MIT
