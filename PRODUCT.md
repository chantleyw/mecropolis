# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Farm operator:** runs several Western Cape farms (the dataset holds Overberg Wheat Estate,
  Ruens Mixed Farm and Swartland Grain Farm, 12 fields). Tracks fields and crop seasons, reviews
  recommendations, logs observations. Wants to know where each season stands without keeping a
  stage field up to date by hand.
- **DEV.to judges:** evaluate the build (Path Two submission, due 2026-10-04) through the public
  site and the published demo login.

## Product Purpose

A field and crop tracker. Season stage (planning, planted, growing, pre-harvest, harvested,
review) is derived from growing degree days accumulated from recorded Open-Meteo weather, and
each stage change stores its evidence. Success: the operator can see every season's stage and
the reason for it, and judges can see a working Sanity-backed workflow, not a static site.

## Positioning

Stage is calculated, not typed. Every number is operator-entered or comes from a named public
source (Open-Meteo, SoilGrids, GBIF, USDA PSD, HarvestStat-Africa, World Bank) with its source
shown. No synthetic data anywhere.

## Operating Context

- Public site: landing (live conditions for the Swartland demo site, regional yields), about,
  docs.
- App (sign-in required, demo login): farm picker, farm dashboard, season detail, login.
- The sign-in gate on app routes is a UX gate only: the Sanity dataset is public-read and writes
  go through session-checked Pages Functions. Say this plainly where security is described.

## Capabilities and Constraints

- Vite + React SPA on Cloudflare Pages, Pages Functions for writes and keyed data, Sanity
  Content Lake (public-read, Live Content API).
- Crop model parameters are hand-authored and uncited; never present them as validated.
- The stage after pre-harvest is labelled thermal maturity because no harvest event is recorded.
- Benchmarks are context, stored separately, never compared with a field's yield.
- Open-Meteo Climate projections use temperature and rainfall only.

## Brand Commitments

Name "Mecropolis". Plain, factual voice: state what is measured and where it came from. No
dashes in UI copy.

## Evidence on Hand

Live API data and seeded Sanity documents only. No testimonials, users, customers or
benchmarks beyond the named sources. Empty or failed states must say so, never show placeholder
numbers.

## Product Principles

1. Show the evidence behind every derived value.
2. Name the source of every external number.
3. Failure is visible: an unavailable source reads as unavailable, not as zero.
4. Honest limits: state what the model does not know.
