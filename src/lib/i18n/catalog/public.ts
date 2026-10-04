// UI text for the public area. Keys start with "public.".
export const publicPages = {
  // Landing: hero and map
  "public.hero.title": "Crop stage, calculated from the weather that happened",
  "public.hero.intro":
    "Mecropolis sums growing degree days from recorded Open-Meteo temperatures since planting, and moves each Western Cape season to its next stage when the total crosses the crop's threshold.",
  "public.hero.openDashboard": "Open the dashboard",
  "public.map.loading": "Loading the map…",
  "public.map.couldNotLoad": "The map could not load ({error}).",
  "public.map.layerGroup": "Map layer",
  "public.map.layer.gdd": "Degree days",
  "public.map.layer.temp": "Max temperature",
  "public.map.layer.rain": "Rain, 7 days",
  "public.map.gridReadFailed":
    "The regional grid could not be read from Sanity ({error}). Nothing is drawn in its place.",
  "public.map.gridLoading": "Loading the regional grid…",
  "public.map.firstRefreshFailed":
    "The first Open-Meteo refresh failed ({error}). Nothing is drawn in its place.",
  "public.map.gridFetching":
    "The grid is being fetched from Open-Meteo for the first time. It appears here when the refresh finishes.",
  "public.map.gridNotes":
    "{count} Open-Meteo grid points at 0.25°, one cell each, not interpolated. Degree days to {date}.",
  "public.map.gridNotesForecast":
    "{count} Open-Meteo grid points at 0.25°, one cell each, not interpolated. Degree days to {date}; forecast retrieved {time}.",
  "public.map.modelNote": "Model parameters are hand-authored and not validated.",
  "public.map.lastRefreshFailed": "Last refresh failed: {error}. Showing the last stored grid.",
  "public.map.refreshRequestFailed":
    "Refresh request failed: {error}. Showing the last stored grid.",
  "public.map.summary":
    "Map of the Western Cape: {layer} across {count} grid points, from {min} to {max} {unit}.",
  "public.map.summaryEmpty": "Map of the Western Cape. No values for this layer.",
  "public.map.baseFailed": "The base map failed: {error}",
  "public.map.noData": "no data",
  "public.map.source": "Open-Meteo, 0.25° grid",
  "public.legend.gdd": "Degree days since {start}, wheat model (base 0 °C)",
  "public.legend.gddMay": "1 May",
  "public.legend.temp": "Forecast maximum today, °C",
  "public.legend.rain": "Forecast rain over the next 7 days, mm",

  // Landing: farm panel
  "public.what.farm": "farm",
  "public.what.liveConditions": "live conditions",
  "public.what.yieldStats": "yield statistics",
  "public.farm.gone": "This farm is no longer in the dataset.",
  "public.farm.gridPointBefore": "Grid point at this farm:",
  "public.farm.gridPointAfter":
    "degree days since 1 May (wheat, base 0 °C). Regional context, not a season total.",
  "public.farm.since": "since {date}",
  "public.farm.sinceAt": "since {date} at {gdd} GDD",
  "public.farm.maturityAt": "maturity at {gdd} GDD",
  "public.farm.cropNotSet": "Crop not set",
  "public.farm.noSeason": "No season recorded",
  "public.farm.footLive":
    "Fields, stages and the GDD recorded at each stage change from Sanity, updated live.",
  "public.farm.footGrid": "Degree days from the Open-Meteo archive to {date}.",

  // Landing: sections
  "public.how.title": "From planting date to stage",
  "public.how.lead":
    "Stage is usually entered by hand and is only as current as the last update. Here it is derived from recorded weather, and every change stores its evidence.",
  "public.how.stagesLabel": "Season stages",
  "public.step.1.title": "Record what the farmer knows",
  "public.step.1.body": "Farms, fields, crops and planting dates are stored in Sanity.",
  "public.step.2.title": "Fetch the weather that happened",
  "public.step.2.body":
    "Daily temperatures for the field's coordinates come from the Open-Meteo archive, from planting to today.",
  "public.step.3.title": "Accumulate degree days",
  "public.step.3.body":
    "Growing degree days (GDD) are summed against the crop model. When a threshold is crossed, the reconciler moves the season to the next stage and records the basis.",
  "public.models.title": "Crop models in use",
  "public.models.badge": "Not validated",
  "public.models.lead":
    "Degree days needed to reach thermal maturity. These parameters are hand-authored and have no citations yet.",
  "public.models.row": "base {temp} °C · {gdd} GDD",
  "public.live.title": "Conditions at the Swartland demo farm",
  "public.live.lead": "Readings from public sources, refreshed every 30 minutes.",
  "public.yields.title": "Published yield benchmarks",
  "public.honesty.title": "How data is handled",
  "public.honesty.1.title": "Yield is entered by the operator",
  "public.honesty.1.body": "Until an operator records a yield, the app shows “Not recorded”.",
  "public.honesty.2.title": "Benchmarks are separate records",
  "public.honesty.2.body":
    "Regional and national statistics are stored in their own documents with source and unit. They are not compared with a field's yield.",
  "public.honesty.3.title": "Pest records are regional",
  "public.honesty.3.body":
    "GBIF occurrence records are shown as sightings within 100 km, with the distance.",
  "public.honesty.4.title": "Weather is live",
  "public.honesty.4.body": "Temperatures are fetched from the Open-Meteo archive at request time.",
  "public.open.title": "Open a season",
  "public.open.body":
    "Sign in to the demo dashboard to view a season's GDD curve and the evidence behind its stage.",

  // Live conditions
  "public.live.tab.weather": "Weather",
  "public.live.tab.soil": "Soil",
  "public.live.tab.pests": "Pests",
  "public.live.tabsLabel": "Live data",
  "public.live.unavailable":
    "{source} data is unavailable right now ({reason}). Nothing is shown in its place.",
  "public.live.sourceBefore": "Source:",
  "public.live.sourceAfter": ". Retrieved {time}; refreshed every 30 minutes.",
  "public.live.today": "Today",
  "public.live.rainToday": "Rain today",
  "public.live.rainDays": "Rain, {count} days",
  "public.live.wetDays": "Wet days",
  "public.live.na": "n/a",
  "public.live.weatherChart":
    "Daily minimum and maximum temperature and rainfall for the forecast period",
  "public.live.rainTallest": "Rain, tallest bar {mm} mm",
  "public.live.sand": "Sand",
  "public.live.silt": "Silt",
  "public.live.clay": "Clay",
  "public.live.texture": "Texture class, 0 to 5 cm",
  "public.live.soilType": "Field soil type: {type}",
  "public.live.soilChart": "Sand {sand}%, silt {silt}%, clay {clay}%",
  "public.live.pestsLead": "Georeferenced records within {radius} km of the farm.",
  "public.live.pestCrop": "{crop} pest",
  "public.live.records": "records",
  "public.live.mostRecent": "Most recent: {date}",
  "public.live.noDated": "No dated records",

  // Yield panel
  "public.yield.unavailable": "Data unavailable right now ({reason}).",
  "public.yield.sourceBefore": "Source:",
  "public.yield.sourceAfter": ".",
  "public.yield.source": "Source",
  "public.yield.lead":
    "The three series measure different things at different scales and are not comparable with each other or with any field.",

  // About
  "public.about.title": "About",
  "public.about.heading": "About Mecropolis",
  "public.about.lead": "Mecropolis is a field and crop tracker for a Western Cape farm.",
  "public.about.why.title": "Why it exists",
  "public.about.why.body":
    "Stage fields go out of date and yields are entered from memory. Mecropolis calculates stage from recorded weather. Every number comes from an operator or a named public source.",
  "public.about.design.title": "Design",
  "public.about.design.1.lead": "Stage is derived.",
  "public.about.design.1.body":
    "Growing degree days accumulate from the planting date using the Open-Meteo archive. Each stage change stores its evidence: the date it took effect, the GDD total and what it was derived from.",
  "public.about.design.2.lead": "Thermal maturity.",
  "public.about.design.2.body":
    "The stage after pre-harvest is labelled thermal maturity because no harvest event is recorded.",
  "public.about.design.3.lead": "Yield is operator-entered.",
  "public.about.design.4.lead": "Benchmarks are context.",
  "public.about.design.4.body":
    "They are stored in their own documents with source, unit and licence.",
  "public.about.stack.title": "Stack",
  "public.about.stack.body":
    "A Vite and React 19 single-page app on Cloudflare Pages. The browser reads the public Sanity dataset directly with GROQ and a real-time listener. Writes and keyed data go through Cloudflare Pages Functions, which check a signed session cookie. Zod at the boundaries, Vitest for tests and Tailwind 4 for styling.",
  "public.about.limits.title": "Known limitations",
  "public.about.limits.1":
    "Crop model parameters (base temperature, thermal time to emergence and maturity) are hand-authored and have no citations yet.",
  "public.about.limits.2":
    "The lupin benchmark comes from HarvestStat for 2000 to 2007 only, and the seed run resolved no lupin benchmark documents.",
  "public.about.limits.3":
    "Pest data are GBIF occurrence records near the farm. They show where a species was recorded near the farm.",
  "public.about.limits.4":
    "The demo has a single shared sign-in and an in-memory rate limiter. The sign-in hides the dashboard pages but does not protect the data: the dataset is public-read. It does protect every write.",

  // Login
  "public.login.failed": "Sign-in failed",
  "public.login.subtitle": "Field and crop tracker",
  "public.login.username": "Username",
  "public.login.password": "Password",
  "public.login.submitting": "Signing in…",
} as const
