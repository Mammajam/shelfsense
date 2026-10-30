# ShelfSense demo video script (~2:50)

Live site: https://shelfsense-lime.vercel.app · Repo: public, MIT licence

Before recording, confirm the video length limit and hosting rules on the Devpost rules page. This script assumes about 3 minutes and a public YouTube or Vimeo link.

## Pre-flight

- Run Brooklyn and Harlem once before recording so Qloo responses are cached and the agent is warm.
- The "Demo data" banner must not appear. If it does, the live key is not active.
- Browser at 1080p, zoom about 110%, bookmarks bar and notifications hidden, mic checked.
- The rate limit is 10 requests per 10 minutes per instance. Do the warm-up runs, then record with a few runs to spare.
- Record the results screen as a spare take in case a live call is slow. Trim the wait in editing.

## Script

| Time | On screen | Voice-over |
|---|---|---|
| 0:00-0:15 | Thumbnail, then the live site. | Big chains have data teams to decide what goes on their shelves. The corner shop down the street has a gut feeling. ShelfSense gives independent shop owners the same kind of insight, for their own neighbourhood. |
| 0:15-0:35 | Form prefilled: Corner General Store, Brooklyn NY, reference New York NY. Scroll the sample CSV range. | You tell it where your shop is and what you stock. ShelfSense asks Qloo what people in your area actually like, compares it with a reference area, and a Claude agent turns that into add, reduce and partner actions, each with its reason. |
| 0:35-1:25 | Click Run. Open the agent trace and let it scroll. Then show the area chips with rank against reference rank, and the "Live Qloo data" label. | This is the live app, calling the real Qloo API. The agent works with tools. It reads Brooklyn's taste for each category, compares it with New York overall, checks your range, then submits its recommendations. The chips show rank in Brooklyn against rank in the reference area. A brand that is first here and absent there is a real local signal. |
| 1:25-2:00 | Scroll the ranked actions. Pause on one add, one reduce, one partner, and point at the evidence under each. | Here are the actions. An add cites a brand that ranks high locally but is missing from your range. A reduce names an exact item from your own list. A partner points to a local venue the neighbourhood already loves. The agent cannot make a claim without evidence, and the app checks that every action cites a signal or one of your items. One honest limit: this works at brand and category level, not individual products. |
| 2:25-2:45 | Change the location to Harlem, NY and run it. Show the different brands. | Change the location to Harlem and the answer changes. Different brands rise to the top, because the neighbourhood is different. That is the point: stocking advice should depend on where the shop is. |
| 2:45-2:55 | Repo page, then the live URL. | ShelfSense is built with Next.js, the Qloo Insights API and a Claude tool-calling agent. The code is public under an MIT licence. Thanks for watching. |

## Things to say plainly if asked

- The area comparison uses ranks from Qloo's Insights API, not a dedicated compare endpoint.
- Reduce recommendations need the shop's own sales figures from the CSV.
- Input is validated and rate limited. If the agent fails, a deterministic pipeline answers instead.
