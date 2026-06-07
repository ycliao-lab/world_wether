const state = {
  unit: "celsius",
  lastPlace: null,
  recents: JSON.parse(localStorage.getItem("weather-recents") || "[]"),
};

const form = document.querySelector("#search-form");
const input = document.querySelector("#city-input");
const statusEl = document.querySelector("#status");
const unitButtons = document.querySelectorAll(".unit-option");
const currentLocationButton = document.querySelector("#current-location");
const clearRecentsButton = document.querySelector("#clear-recents");
const recentList = document.querySelector("#recent-list");

const weatherCodes = {
  0: ["Clear sky", "☀"],
  1: ["Mainly clear", "🌤"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁"],
  45: ["Foggy", "🌫"],
  48: ["Rime fog", "🌫"],
  51: ["Light drizzle", "🌦"],
  53: ["Drizzle", "🌦"],
  55: ["Dense drizzle", "🌧"],
  56: ["Freezing drizzle", "🌧"],
  57: ["Dense freezing drizzle", "🌧"],
  61: ["Light rain", "🌧"],
  63: ["Rain", "🌧"],
  65: ["Heavy rain", "🌧"],
  66: ["Freezing rain", "🌧"],
  67: ["Heavy freezing rain", "🌧"],
  71: ["Light snow", "🌨"],
  73: ["Snow", "🌨"],
  75: ["Heavy snow", "❄"],
  77: ["Snow grains", "❄"],
  80: ["Light showers", "🌦"],
  81: ["Showers", "🌧"],
  82: ["Heavy showers", "⛈"],
  85: ["Light snow showers", "🌨"],
  86: ["Heavy snow showers", "❄"],
  95: ["Thunderstorm", "⛈"],
  96: ["Thunderstorm with hail", "⛈"],
  99: ["Severe thunderstorm with hail", "⛈"],
};

const selectors = {
  placeName: document.querySelector("#place-name"),
  placeMeta: document.querySelector("#place-meta"),
  weatherSymbol: document.querySelector("#weather-symbol"),
  temperature: document.querySelector("#temperature"),
  condition: document.querySelector("#condition"),
  feelsLike: document.querySelector("#feels-like"),
  humidity: document.querySelector("#humidity"),
  wind: document.querySelector("#wind"),
  pressure: document.querySelector("#pressure"),
  hourlyStrip: document.querySelector("#hourly-strip"),
  forecastList: document.querySelector("#forecast-list"),
  updatedAt: document.querySelector("#updated-at"),
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = input.value.trim();

  if (!query) {
    setStatus("Please enter a city to search.", true);
    return;
  }

  await searchByName(query);
});

unitButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const nextUnit = button.dataset.unit;
    if (nextUnit === state.unit) return;
    state.unit = nextUnit;
    unitButtons.forEach((item) => item.classList.toggle("active", item.dataset.unit === state.unit));

    if (state.lastPlace) {
      await loadWeather(state.lastPlace);
    }
  });
});

currentLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported by this browser.", true);
    return;
  }

  setStatus("Getting your current location...");
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      await loadWeather({
        name: "Current Location",
        country: "",
        admin1: "",
        latitude: coords.latitude,
        longitude: coords.longitude,
        timezone: "auto",
      });
    },
    () => setStatus("Unable to get location permission. Please search by city instead.", true),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

clearRecentsButton.addEventListener("click", () => {
  state.recents = [];
  saveRecents();
  renderRecents();
});

async function searchByName(query) {
  setLoading(true, "Searching for location...");

  try {
    const params = new URLSearchParams({
      name: query,
      count: "1",
      language: "en",
      format: "json",
    });
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);

    if (!response.ok) throw new Error("geocode");
    const data = await response.json();
    const place = data.results?.[0];

    if (!place) {
      setStatus(`Could not find "${query}". Try a different city name or add the country.`, true);
      return;
    }

    await loadWeather(place);
    addRecent(place);
  } catch {
    setStatus("Search failed. Please check your network connection and try again.", true);
  } finally {
    setLoading(false);
  }
}

async function loadWeather(place) {
  state.lastPlace = place;
  setLoading(true, "Loading weather data...");

  try {
    const params = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "precipitation",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
        "pressure_msl",
      ].join(","),
      hourly: ["temperature_2m", "weather_code", "precipitation_probability"].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "uv_index_max",
      ].join(","),
      forecast_days: "7",
      timezone: "auto",
      temperature_unit: state.unit,
      wind_speed_unit: state.unit === "fahrenheit" ? "mph" : "kmh",
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error("forecast");
    const data = await response.json();

    renderWeather(place, data);
    setStatus("");
  } catch {
    setStatus("Failed to load weather data. Please try again later.", true);
  } finally {
    setLoading(false);
  }
}

function renderWeather(place, data) {
  const current = data.current;
  const [condition, icon] = describeWeather(current.weather_code);
  const unitSymbol = state.unit === "fahrenheit" ? "°F" : "°C";
  const windUnit = state.unit === "fahrenheit" ? "mph" : "km/h";

  selectors.placeName.textContent = place.name || "Current Location";
  selectors.placeMeta.textContent = formatPlaceMeta(place, data.timezone);
  selectors.weatherSymbol.textContent = icon;
  selectors.temperature.textContent = `${Math.round(current.temperature_2m)}°`;
  selectors.condition.textContent = condition;
  selectors.feelsLike.textContent = `${Math.round(current.apparent_temperature)}${unitSymbol}`;
  selectors.humidity.textContent = `${current.relative_humidity_2m}%`;
  selectors.wind.textContent = `${Math.round(current.wind_speed_10m)} ${windUnit}`;
  selectors.pressure.textContent = `${Math.round(current.pressure_msl)} hPa`;
  selectors.updatedAt.textContent = `Updated: ${formatDateTime(current.time)}`;

  renderHourly(data.hourly, unitSymbol, current.time);
  renderDaily(data.daily, unitSymbol);
}

function renderHourly(hourly, unitSymbol, currentTime) {
  const nextHourIndex = hourly.time.findIndex((time) => time >= currentTime);
  const startIndex = nextHourIndex === -1 ? 0 : nextHourIndex;
  const hours = hourly.time.slice(startIndex, startIndex + 24);

  selectors.hourlyStrip.innerHTML = hours.map((time, index) => {
    const sourceIndex = startIndex + index;
    const [condition, icon] = describeWeather(hourly.weather_code[sourceIndex]);
    return `
      <div class="hour-card" title="${condition}">
        <span>${formatHour(time)}</span>
        <span class="hour-icon" aria-hidden="true">${icon}</span>
        <strong>${Math.round(hourly.temperature_2m[sourceIndex])}${unitSymbol}</strong>
        <small>Rain ${hourly.precipitation_probability[sourceIndex] ?? 0}%</small>
      </div>
    `;
  }).join("");
}

function renderDaily(daily, unitSymbol) {
  selectors.forecastList.innerHTML = daily.time.map((time, index) => {
    const [condition, icon] = describeWeather(daily.weather_code[index]);
    const max = Math.round(daily.temperature_2m_max[index]);
    const min = Math.round(daily.temperature_2m_min[index]);

    return `
      <div class="forecast-row">
        <div>
          <strong>${formatDay(time, index)}</strong>
          <p class="muted">${condition}</p>
        </div>
        <span class="day-icon" aria-hidden="true">${icon}</span>
        <div class="temp-bar" aria-hidden="true"></div>
        <strong class="forecast-temp">${min}${unitSymbol} / ${max}${unitSymbol}</strong>
      </div>
    `;
  }).join("");
}

function renderRecents() {
  if (!state.recents.length) {
    recentList.innerHTML = `<p class="empty-state">Cities you search for will appear here.</p>`;
    return;
  }

  recentList.innerHTML = state.recents.map((place, index) => `
    <button class="recent-chip" type="button" data-index="${index}">
      ${place.name}${place.country ? `, ${place.country}` : ""}
    </button>
  `).join("");

  recentList.querySelectorAll(".recent-chip").forEach((button) => {
    button.addEventListener("click", async () => {
      await loadWeather(state.recents[Number(button.dataset.index)]);
    });
  });
}

function addRecent(place) {
  const normalized = {
    name: place.name,
    country: place.country || "",
    admin1: place.admin1 || "",
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone || "auto",
  };

  state.recents = [
    normalized,
    ...state.recents.filter((item) => item.name !== normalized.name || item.country !== normalized.country),
  ].slice(0, 6);

  saveRecents();
  renderRecents();
}

function saveRecents() {
  localStorage.setItem("weather-recents", JSON.stringify(state.recents));
}

function setLoading(isLoading, message = "") {
  document.querySelector("#search-button").disabled = isLoading;
  currentLocationButton.disabled = isLoading;
  if (message) setStatus(message);
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function describeWeather(code) {
  return weatherCodes[code] || ["Changing weather", "🌡"];
}

function formatPlaceMeta(place, timezone) {
  const pieces = [place.admin1, place.country].filter(Boolean);
  const suffix = pieces.length ? pieces.join(", ") : "Coordinate lookup";
  return `${suffix} · ${timezone || place.timezone || "Auto timezone"}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parseLocalTime(value));
}

function formatHour(value) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parseLocalTime(value));
}

function formatDay(value, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  }).format(parseLocalTime(value));
}

function parseLocalTime(value) {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

renderRecents();
searchByName("Taipei");
