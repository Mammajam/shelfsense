# Devpost submission draft: Qloo Agentic Hackathon

Deadline: Oct 30, 2026, 11:45 pm ET. Required: working demo URL, public repo with a licence visible in the
About section, and a text description (no video is required by the rules; add one anyway if time allows).
Items in [brackets] must be filled in once the real Qloo data is in.

## Tagline
Chain-level taste intelligence for the corner shop: what to stock, based on what the neighbourhood actually likes.

## Inspiration
Independent shops restock what already sells and follow supplier pushes. They cannot see how the area around
them differs from the next street, or how it is changing, while chains buy that data. ShelfSense gives a single
merchant a ranked, evidence-backed answer without a data team or budget.

## What it does
The owner enters a location, categories and current range (a simple CSV, with optional weekly sales). ShelfSense:
1. reads the area's taste profile from Qloo (brands and venues, with a location signal),
2. compares it against a reference area to find what is distinctive here,
3. maps the taste signals onto the shop's own range to find gaps and poor-fit lines,
4. returns a ranked list of what to add, what to reduce and who to partner with, each with a plain-language reason that
   cites the Qloo evidence behind it.

A side-by-side panel shows the same shop answered by a plain LLM with no Qloo data: generic advice versus
location-specific gaps with evidence.

## How we built it
Next.js and TypeScript on Vercel. Typed Qloo tool layer with response caching, a catalog mapper that matches taste
signals to a merchant's range, a deterministic ranking engine so every recommendation traces to a Qloo response,
and Claude to write the reasons using only the attached evidence. [Add: which Qloo endpoints are used.]

## Challenges
Qloo returns entities (brands, places, tags), not product SKUs, so the mapper works at brand and category level.
[Add: data coverage findings for the demo city.]

## What's next
Trending-based promotion timing and weekly re-runs.

## Demo script (about 2 minutes)
1. (0:00) The problem: one shop, one blind spot. Show the CSV range.
2. (0:20) Run the analysis. Show the area view: what [city] likes, with affinity and lift.
3. (0:45) Walk the top three actions and their cited reasons.
4. (1:15) Show the plain-LLM panel for the same shop: generic, no evidence.
5. (1:40) Change the location and re-run: the recommendations change with the area.
6. (1:55) Close on the repo and licence.

## Links
- Demo: https://shelfsense-lime.vercel.app
- Repo: https://github.com/Mammajam/shelfsense
