# World Weather

A lightweight static web page for checking weather around the world. It uses the Open-Meteo APIs directly from the browser, so no backend server or API key is required.

## Features

- Search weather by city, region, or country
- Show current weather, apparent temperature, humidity, wind speed, and pressure
- Show the next 24 hours of hourly forecast
- Show a 7-day daily forecast
- Switch between Celsius and Fahrenheit
- Use browser geolocation for current-location weather
- Save recent searches in local storage

## Project Files

```text
.
├── index.html
├── styles.css
├── app.js
├── README.md
└── .gitignore
```

## Run Locally

Open `index.html` directly in a browser.

No install step is needed.

## Deploy to GitHub Pages

1. Push this project to GitHub.
2. Open the repository settings.
3. Go to `Pages`.
4. Set `Source` to `Deploy from a branch`.
5. Select the `main` branch and `/ root` folder.
6. Save and wait for GitHub Pages to publish the site.

For the repository `git@github.com:ycliao-lab/world_wether.git`, the GitHub Pages URL will usually be:

```text
https://ycliao-lab.github.io/world_wether/
```

## Data Source

Weather and geocoding data are provided by Open-Meteo:

- Weather forecast API: https://open-meteo.com/
- Geocoding API: https://open-meteo.com/en/docs/geocoding-api

## Notes

The site calls Open-Meteo from the user's browser. If weather lookup fails, check the browser network connection or try another city name.
