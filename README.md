# ShelfSense

Location-specific stocking recommendations for independent merchants, backed by Qloo taste data.

## Setup
```bash
npm install
cp .env.example .env.local   # add QLOO_API_KEY (and ANTHROPIC_API_KEY later)
npm run dev
```

## Phase 1: Qloo spike
```bash
npm run spike -- "Brooklyn, NY" Nivea
```
Saves raw responses to `fixtures/` and prints which calls worked for that city.

## License
MIT
