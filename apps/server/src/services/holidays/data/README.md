# India regional holiday calendars

`india2026.ts` is the bundled 2026 snapshot for all 28 states and 8 union territories. `IndianHolidayProvider` supplies it through `DefaultHolidayProvider`; sync, Month holidays and Week capacity use it. No runtime Python installation, subscription key or network fetch is needed for these regional records.

Each calendar and feed record retains its source URL. Thirty-two locations use Office Holidays' published `ics-all/india/<location>` feeds; [subscription documentation](https://www.officeholidays.com/subscribe/india/maharashtra) explains the public feeds. Dates and location labels are validated before a refresh writes the snapshot. These are published annual calendars; all later statutory amendments have not been independently certified.

Four calendars are transcribed in `../indiaGovernment2026.ts` from government public and restricted tables:

- [Andaman and Nicobar annual gazette](https://andamannicobar.gov.in/admin-pannel/othersdoc/1-29-Holiday%20List%202026%20Gazette.pdf), with [April 14 addition](https://dt.andamannicobar.gov.in/epaper/15042026100010632.pdf) and [Bakrid moved to May 28](https://dt.andamannicobar.gov.in/epaper/27052026092402123.pdf).
- [Dadra and Nagar Haveli and Daman and Diu gazette](https://cdnbbsr.s3waas.gov.in/s371e09b16e21f7b6919bbfc43f6a5b2f0/uploads/2026/01/202601061474429779.pdf), annual holiday tables on pages 64–67.
- [Ladakh government calendar](https://cdn.s3waas.gov.in/s341ae36ecb9b3eee609d05b90c14222fb/uploads/2025/11/17631844945463.pdf), including district-only dates as local records.
- [Lakshadweep government calendar](https://cdn.s3waas.gov.in/s358238e9ae2dd305d79c2ebc8c1883422/uploads/2026/01/17681938343951.pdf). Its optional Shivaji date prints 2025 in a 2026 table; that ambiguous row is omitted pending correction.

[Maharashtra's annual government calendar](https://maharashtra.gov.in/site/Upload/pdf/Public-Holiday-2026.pdf) was also cross-checked. Public holidays reduce weekday capacity. Optional, bank-only, district/occupation-only holidays and observances remain visible without consuming statewide capacity. A full regional calendar replaces the central list, preventing dates from another calendar from being added incorrectly.

To maintain the snapshot, review government amendments and update the manual tables first. From `apps/server`, run `pnpm holidays:data:refresh` to retrieve the 32 subscription calendars; inspect the generated differences and update the script's `reviewedOn` date after source review. Run the focused holiday tests and builds. When changing published dates or classifications, bump `INDIAN_CALENDAR_SOURCE` and ensure sync replaces the previous managed source before force-refreshing all locations. Verify `pnpm holidays:sync --all-regions --year 2026` and the live planner suite after import.

Do not reuse 2026 dates for another year. Add a separate sourced annual snapshot and coverage tests before extending supported years. Missing-data notices continue to apply wherever neither the bundled provider nor an external provider supplies regional coverage.
