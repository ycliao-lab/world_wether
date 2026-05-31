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
  0: ["晴朗", "☀"],
  1: ["大致晴朗", "🌤"],
  2: ["局部多雲", "⛅"],
  3: ["多雲", "☁"],
  45: ["有霧", "🌫"],
  48: ["霧凇", "🌫"],
  51: ["毛毛雨", "🌦"],
  53: ["毛毛雨", "🌦"],
  55: ["較強毛毛雨", "🌧"],
  56: ["凍毛毛雨", "🌧"],
  57: ["強凍毛毛雨", "🌧"],
  61: ["小雨", "🌧"],
  63: ["降雨", "🌧"],
  65: ["大雨", "🌧"],
  66: ["凍雨", "🌧"],
  67: ["強凍雨", "🌧"],
  71: ["小雪", "🌨"],
  73: ["降雪", "🌨"],
  75: ["大雪", "❄"],
  77: ["雪粒", "❄"],
  80: ["短暫陣雨", "🌦"],
  81: ["陣雨", "🌧"],
  82: ["強陣雨", "⛈"],
  85: ["短暫陣雪", "🌨"],
  86: ["強陣雪", "❄"],
  95: ["雷雨", "⛈"],
  96: ["雷雨伴隨冰雹", "⛈"],
  99: ["強雷雨伴隨冰雹", "⛈"],
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
    setStatus("請輸入想查詢的城市。", true);
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
    setStatus("這個瀏覽器不支援定位功能。", true);
    return;
  }

  setStatus("正在取得目前位置...");
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      await loadWeather({
        name: "目前位置",
        country: "",
        admin1: "",
        latitude: coords.latitude,
        longitude: coords.longitude,
        timezone: "auto",
      });
    },
    () => setStatus("無法取得位置權限，請改用城市搜尋。", true),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

clearRecentsButton.addEventListener("click", () => {
  state.recents = [];
  saveRecents();
  renderRecents();
});

async function searchByName(query) {
  setLoading(true, "正在搜尋地點...");

  try {
    const params = new URLSearchParams({
      name: query,
      count: "1",
      language: "zh",
      format: "json",
    });
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);

    if (!response.ok) throw new Error("geocode");
    const data = await response.json();
    const place = data.results?.[0];

    if (!place) {
      setStatus(`找不到「${query}」，請試試英文城市名或加上國家。`, true);
      return;
    }

    await loadWeather(place);
    addRecent(place);
  } catch {
    setStatus("搜尋失敗，請確認網路連線後再試一次。", true);
  } finally {
    setLoading(false);
  }
}

async function loadWeather(place) {
  state.lastPlace = place;
  setLoading(true, "正在讀取天氣...");

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
    setStatus("讀取天氣資料失敗，請稍後再試。", true);
  } finally {
    setLoading(false);
  }
}

function renderWeather(place, data) {
  const current = data.current;
  const [condition, icon] = describeWeather(current.weather_code);
  const unitSymbol = state.unit === "fahrenheit" ? "°F" : "°C";
  const windUnit = state.unit === "fahrenheit" ? "mph" : "km/h";

  selectors.placeName.textContent = place.name || "目前位置";
  selectors.placeMeta.textContent = formatPlaceMeta(place, data.timezone);
  selectors.weatherSymbol.textContent = icon;
  selectors.temperature.textContent = `${Math.round(current.temperature_2m)}°`;
  selectors.condition.textContent = condition;
  selectors.feelsLike.textContent = `${Math.round(current.apparent_temperature)}${unitSymbol}`;
  selectors.humidity.textContent = `${current.relative_humidity_2m}%`;
  selectors.wind.textContent = `${Math.round(current.wind_speed_10m)} ${windUnit}`;
  selectors.pressure.textContent = `${Math.round(current.pressure_msl)} hPa`;
  selectors.updatedAt.textContent = `更新時間：${formatDateTime(current.time)}`;

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
        <small>降雨 ${hourly.precipitation_probability[sourceIndex] ?? 0}%</small>
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
    recentList.innerHTML = `<p class="empty-state">搜尋過的城市會出現在這裡。</p>`;
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
  return weatherCodes[code] || ["天氣變化中", "🌡"];
}

function formatPlaceMeta(place, timezone) {
  const pieces = [place.admin1, place.country].filter(Boolean);
  const suffix = pieces.length ? pieces.join("，") : "座標查詢";
  return `${suffix} · ${timezone || place.timezone || "自動時區"}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parseLocalTime(value));
}

function formatHour(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parseLocalTime(value));
}

function formatDay(value, index) {
  if (index === 0) return "今天";
  if (index === 1) return "明天";
  return new Intl.DateTimeFormat("zh-TW", {
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
