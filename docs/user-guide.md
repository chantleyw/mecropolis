# How to use Mecropolis

A short guide in plain words. It tells you what the app is for, who it is for and what every part of it does.

This is the English copy of the guide at `/guide` in the app. Pick a language at the top of any page to read it in another language.

## What Mecropolis is

Mecropolis is a field and crop tracker for farms. It works out how far along each crop is by adding up the warm weather it has had since planting, and it shows you the weather, soil and pests around your farm in one place.

It was built for farms in the Western Cape in South Africa, but the same idea works for any farm, any region and any season.

## Who it is for

It is for the person who looks after the fields, like a farmer, a farm manager or an advisor who helps them.

You do not need to know anything about computers or weather science. If you can open a website, you can use Mecropolis.

## Why you would use it

- You can see at a glance which crops are just planted, which are growing and which are nearly ready.
- You do not have to update every field by hand, because the app moves each crop forward on its own when the weather says it is time.
- It warns you about frost and heat in the next few days and about pests seen near your farm.
- Everything written down about a field, like a spray, a pest you saw or a note, stays in one place with its date, so you can look back later.
- Every number shows where it came from, so you know what you can trust.

## How the app knows where a crop is

Plants grow faster when it is warm and slower when it is cold. Mecropolis counts this warmth every day as heat units, which scientists call growing degree days or GDD.

Each day it takes the middle of the highest and lowest temperature and takes away the temperature where the crop stops growing. What is left is that day's heat units. A cold day adds nothing.

Each crop needs a certain total of heat units before it is ready. As the total since planting gets closer to that number, the crop moves on to the next stage.

The temperatures come from Open-Meteo, a free weather service that records the weather for every place on earth.

## The six stages

Every crop on every field goes through these stages, in this order.

1. **Planning.** The season is set up, but the crop is not in the ground yet.
2. **Planted.** The planting date has passed.
3. **Growing.** The crop is collecting heat units.
4. **Pre-harvest.** The crop has collected most of the heat it needs, so it is time to get ready for harvest.
5. **Thermal maturity.** The crop has collected all the heat it needs, so it should be ready. Only you can say if it was really harvested, so the app calls this thermal maturity.
6. **Review.** The season is over and you can look back at how it went.

The app checks every crop each night and each time someone adds an observation or a treatment. You can also press Reconcile now on a season to check straight away.

## Getting started

1. Open the home page. You can see the weather map, soil, pests and yields for the demo farm without signing in.
2. Press Sign in at the top and use the demo account details you were given.
3. Pick a farm. This opens the dashboard for that farm.
4. Press a season to see everything about that one crop on that one field.
5. Use the language box at the top of any page to change the language. The app remembers your choice next time.

## The home page

The home page shows a map of the region coloured by how much heat the land has had this season. It also shows the weather now and for the next few days, the soil at the demo farm, pests seen nearby lately and the average yields for the region. You do not need to sign in to see it.

## The farm dashboard

The dashboard shows one farm. These are its parts from the top of the page to the bottom. The farm box at the top lets you jump to another farm.

- **Farm summary.** How many fields and hectares the farm has, how many seasons are running and how many crops are ready.
- **Needs attention.** Short warnings, like frost or heat in the forecast, a crop that is ready, a season that has not started on time or pests seen near a field. Each warning says what caused it.
- **Farm conditions.** Today's weather, the forecast, the soil and pests near this farm.
- **Season progress.** A card for each crop that shows how much of its heat it has collected. You can compare fields side by side and download the list as a spreadsheet file (CSV).
- **Fields.** Every field on the farm with its size, its soil and its crops.
- **Search records.** Type what you are looking for in normal words, like aphids on the wheat. It finds observations and treatments that mean the same thing, even when they use other words.
- **Recommendations.** Suggested work for a field, like a spray or fertiliser. You can approve or reject each one, and mark it done once the work is finished.
- **Recent activity.** A list of when each crop moved to a new stage.

## The season page

A season is one crop on one field in one year. Its page has everything about it.

- **Top of the page.** The crop, the field, the planting date, the expected harvest and the yield once you have entered it.
- **Stage pipeline.** The six stages with the current one marked. Press Reconcile now to check right away if the crop should move on.
- **Decision readiness.** A checklist of what the app needs before it can move the crop on, like a planting date and enough weather data. Each item says Pass, Warning or Blocked, and a blocked item tells you what is missing.
- **Evidence.** The records the app used for its decisions, so you can check them.
- **Propose a recommendation.** Suggest work for this field with the season's evidence attached. It waits as a draft until someone approves it on the dashboard.
- **Growing degree days.** A chart of heat units adding up since planting, with a line for the total the crop needs.
- **What if?.** Try an earlier or later planting date or a warmer or colder season, and see how the heat units would change. Nothing is saved.
- **Season summary.** A short summary of the season's records written by AI. Read it as a helper and check the records when something looks wrong.
- **Season notes.** Dated notes for the season. You can add, change and delete them, and bring back an older version of a note.
- **Field photo and soil test report.** Upload a photo of the field and the soil test PDF from the lab.
- **Field log.** What you saw in the field (observations) and what you did to it (treatments, like a spray with its product and rate).
- **Revision history.** Every saved change to this season with its date.
- **Regional benchmark.** The average yield for the region from public statistics. It is there for comparison and is not the yield of your field.
- **Regional pest occurrences.** Pests reported near the field on GBIF, a public database of sightings. Press Fetch sightings to get the latest ones.

## Where the numbers come from

- Weather comes from Open-Meteo, for today, the forecast and past days.
- Soil comes from SoilGrids, a world map of soil.
- Pest sightings come from GBIF, a public database of sightings.
- Regional yields come from USDA FAS, HarvestStat-Africa and the World Bank.
- Everything else, like notes, treatments and your own yields, is what you or your team typed in.

## What it cannot do

- The heat units each crop needs are our own estimates and have not been tested in the field. Use them as a guide and trust what you see in your field.
- Thermal maturity means the weather says the crop should be ready. Only you know if it really is.
- The translations were written by AI. They should be easy to follow, but a native speaker has not checked every language.
- The demo is open to everyone, so do not type anything private into it.
