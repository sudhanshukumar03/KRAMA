# Indian regional holiday calendars

Krama bundles a 2026 holiday snapshot for all 28 Indian states and 8 union territories in `india2026.ts`. `IndianHolidayProvider` exposes these records through `DefaultHolidayProvider`, and Planner uses them for holiday views and capacity calculations. The bundled records do not require a runtime network request, Python installation, or subscription key.

## Sources and coverage

Each calendar and record retains its source URL. Thirty-two locations use Office Holidays' published `ics-all/india/<location>` feeds. Their [subscription documentation](https://www.officeholidays.com/subscribe/india/maharashtra) describes the public calendar format.

The remaining four calendars are transcribed in `../indiaGovernment2026.ts` from government public and restricted holiday tables:

| Location | Sources used in the snapshot |
| --- | --- |
| Andaman and Nicobar | [Annual gazette](https://andamannicobar.gov.in/admin-pannel/othersdoc/1-29-Holiday%20List%202026%20Gazette.pdf), [April 14 addition](https://dt.andamannicobar.gov.in/epaper/15042026100010632.pdf), and [Bakrid date amendment](https://dt.andamannicobar.gov.in/epaper/27052026092402123.pdf) |
| Dadra and Nagar Haveli and Daman and Diu | [Annual gazette, pages 64–67](https://cdnbbsr.s3waas.gov.in/s371e09b16e21f7b6919bbfc43f6a5b2f0/uploads/2026/01/202601061474429779.pdf) |
| Ladakh | [Government calendar](https://cdn.s3waas.gov.in/s341ae36ecb9b3eee609d05b90c14222fb/uploads/2025/11/17631844945463.pdf), including district-specific local records |
| Lakshadweep | [Government calendar](https://cdn.s3waas.gov.in/s358238e9ae2dd305d79c2ebc8c1883422/uploads/2026/01/17681938343951.pdf) |

The snapshot was also checked against [Maharashtra's annual calendar](https://maharashtra.gov.in/site/Upload/pdf/Public-Holiday-2026.pdf). The Lakshadweep table contains an optional Shivaji row with a 2025 date inside the 2026 calendar; that ambiguous row is omitted pending correction.

This is a sourced annual snapshot. It does not certify that every later amendment has been incorporated. Consult current official notices when a date is material to a particular workplace.

## Capacity rules

Public holidays reduce weekday capacity. Optional, bank-only, district-specific, occupation-specific, and observance dates can remain visible without reducing statewide working capacity. A full regional calendar replaces the central list so dates from incompatible calendars are not combined.

## Refresh the data

Review government amendments and update manual tables first. From the repository root, fetch the subscription calendars with:

```sh
pnpm --filter server holidays:data:refresh
```

Inspect the generated differences, validate dates and locations, and update the refresh script's `reviewedOn` date only after source review. Run the focused holiday tests and builds. When dates or classifications change, update `INDIAN_CALENDAR_SOURCE` and verify that synchronization replaces the previous managed source.

Check an all-region import with:

```sh
pnpm --filter server holidays:sync --all-regions --year 2026
```

Verify the live Planner results after import, including regional precedence and public-holiday capacity deductions. Use a dedicated test environment for verification that creates records.

## Add another year

Each supported year needs its own sourced snapshot and coverage tests. Do not relabel the 2026 dates as another year's calendar. Missing-data notices remain appropriate when neither the bundled dataset nor an external provider has the requested regional coverage.
