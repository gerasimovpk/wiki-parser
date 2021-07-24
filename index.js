import { parseYearlyPage } from "./parser.js";

for (let year = 1900; year < 1910; year++) {
    await parseYearlyPage(year);
}