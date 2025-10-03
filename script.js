const apiKey = "ed271b66e15675769c1454b251b0a22e"; // replace with your OpenWeatherMap API key

// Chart.js global style
Chart.defaults.color = "#fff";
Chart.defaults.borderColor = "rgba(255,255,255,0.2)";

let forecastData = null;  // store forecast data globally
let currentView = "hourly"; // track chart state
let chartInstance = null;   // store Chart.js instance

// 🔎 Search bar enter binding
document.querySelector(".search input").addEventListener("keyup", (e) => {
  if (e.key === "Enter") getWeather();
});

// 🌍 Get weather by city search
async function getWeather() {
  const city = document.getElementById("cityInput").value;
  if (!city) return alert("No city entered");

  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  await fetchAndDisplayWeather(weatherUrl);

  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
  await fetchForecast(forecastUrl);
}

// 📍 Auto get location weather
window.onload = getLocationWeather;
document.getElementById("homeLogo").addEventListener("click", () => {
  window.location.href = "index.html"; // Redirect explicitly to index.html
});

function getLocationWeather() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      await fetchAndDisplayWeather(weatherUrl);

      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      await fetchForecast(forecastUrl);
    }, () => alert("Location access denied. Please search manually."));
  } else alert("Geolocation not supported in this browser.");
}

// 🔄 Fetch weather + update UI
async function fetchAndDisplayWeather(url) {
  const response = await fetch(url);
  const data = await response.json();

  // Update UI
  document.getElementById("cityName").innerText = data.name;
  document.getElementById("temperature").innerText = `${Math.round(data.main.temp)}°C`;
  document.getElementById("condition").innerText = data.weather[0].description;
  document.getElementById("wind").innerText = `${data.wind.speed} m/s`;
  document.getElementById("humidity").innerText = `${data.main.humidity}%`;

  // Sunrise & Sunset
  const sunrise = new Date(data.sys.sunrise * 1000);
  const sunset = new Date(data.sys.sunset * 1000);
  document.getElementById("sunrise").innerText = sunrise.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  document.getElementById("sunset").innerText = sunset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Sun Progress
  const now = new Date();
  const progress = ((now - sunrise) / (sunset - sunrise)) * 100;
  document.getElementById("sunProgress").style.width = `${Math.min(Math.max(progress, 0), 100)}%`;

  // Weather Icon
  const iconEl = document.getElementById("weatherIcon");
  const weather = data.weather[0].main;
  const iconMap = {
    Clear: "wi wi-day-sunny",
    Clouds: "wi wi-cloudy",
    Rain: "wi wi-rain",
    Thunderstorm: "wi wi-thunderstorm",
    Snow: "wi wi-snow"
  };
  iconEl.className = iconMap[weather] || "wi wi-na";

  

  // Detect day/night
  const currentTime = Math.floor(new Date().getTime() / 1000);
  const isNight = currentTime < data.sys.sunrise || currentTime > data.sys.sunset;
  updateBackground(weather.toLowerCase(), isNight);

  // Advice
  const adviceMap = {
    Rain: "🌧 Carry an umbrella!",
    Clear: isNight ? "🌙 Enjoy the clear night sky!" : "😎 Wear sunglasses!",
    Snow: "🧥 Dress warmly!",
    Thunderstorm: "⚡ Stay indoors!"
  };
  document.getElementById("adviceMsg").innerText = adviceMap[weather] || "🌤 Have a great day!";

  // Air Quality
  const aqiRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${data.coord.lat}&lon=${data.coord.lon}&appid=${apiKey}`);
  const aqiData = await aqiRes.json();
  const aqi = aqiData.list[0].main.aqi;
  const aqiText = ["Good 😊", "Fair 🙂", "Moderate 😐", "Poor 😷", "Very Poor 🤢"];
  document.getElementById("aqi").innerText = aqiText[aqi - 1];
}

// 🌦 Fetch Forecast Data
async function fetchForecast(forecastUrl) {
  const response = await fetch(forecastUrl);
  forecastData = await response.json();

  // Show default chart as Hourly
  renderChart("hourly");

  // ✅ Toggle Button
  document.getElementById("toggleBtn").onclick = () => {
    currentView = currentView === "hourly" ? "weekly" : "hourly";
    renderChart(currentView);
    document.getElementById("chartTitle").textContent =
      currentView === "hourly" ? "Hourly Forecast" : "Weekly Forecast";
    document.getElementById("toggleBtn").textContent =
      currentView === "hourly" ? "Switch to Weekly" : "Switch to Hourly";
  };

  // Also show forecast cards
  displayForecast(forecastData.list);
}

// 📊 Render Chart (hourly or weekly)
function renderChart(type) {
  const ctx = document.getElementById("forecastChart").getContext("2d");

  let labels = [];
  let temps = [];

  if (type === "hourly") {
    labels = forecastData.list.slice(0, 8).map(item => new Date(item.dt * 1000).getHours() + ":00");
    temps = forecastData.list.slice(0, 8).map(item => item.main.temp);
  } else {
    for (let i = 0; i < forecastData.list.length; i += 8) {
      labels.push(new Date(forecastData.list[i].dt * 1000).toLocaleDateString());
      temps.push(forecastData.list[i].main.temp);
    }
  }

  // Destroy old chart
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: type === "hourly" ? "line" : "bar",
    data: {
      labels,
      datasets: [{
        label: type === "hourly" ? "Hourly Temp (°C)" : "Daily Avg Temp (°C)",
        data: temps,
        borderColor: "yellow",
        backgroundColor: type === "hourly" ? "transparent" : "lightblue",
        fill: false,
      }]
    }
  });
}

// 📅 Display Forecast Cards
function displayForecast(list) {
  const forecastContainer = document.querySelector(".forecast-cards");
  forecastContainer.innerHTML = "";
  const dailyData = list.filter(item => item.dt_txt.includes("12:00:00"));

  dailyData.forEach(day => {
    const date = new Date(day.dt_txt).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric"
    });
    const temp = Math.round(day.main.temp);

    const card = `
      <div class="forecast-card">
        <div class="date">${date}</div>
        <i class="wi wi-owm-${day.weather[0].id}"></i>
        <div class="desc">${day.weather[0].description}</div>
        <div class="temp">${temp}°C</div>
      </div>
    `;
    forecastContainer.insertAdjacentHTML("beforeend", card);
  });
}

// 🎨 Background + weather effects
function updateBackground(condition, isNight) {
  const sky = document.querySelector(".sky");
  const sun = document.querySelector(".sun");
  const moon = document.querySelector(".moon");

  sun.style.display = "none";
  moon.style.display = "none";
  removeWeatherEffects();
  removeStars();

  if (isNight) {
    sky.style.background = "linear-gradient(to bottom, #0f2027, #203a43, #2c5364)";
    moon.style.display = "block";
    createStars(sky);
  } else {
    sky.style.background = "linear-gradient(to bottom, #87ceeb, #f0f8ff)";
    sun.style.display = "block";
  }

  if (condition.includes("rain")) createRain();
  if (condition.includes("thunderstorm")) createThunderstorm();
  if (condition.includes("snow")) createSnow();
}

// 🌟 Stars
function createStars(sky) {
  for (let i = 0; i < 40; i++) {
    const star = document.createElement("div");
    star.classList.add("stars");
    star.style.top = Math.random() * 100 + "%";
    star.style.left = Math.random() * 100 + "%";
    star.style.animationDuration = 1 + Math.random() * 2 + "s";
    sky.appendChild(star);
  }
}
function removeStars() {
  document.querySelectorAll(".sky .stars").forEach(star => star.remove());
}

// 🌧 Rain
function createRain(numDrops = 100) {
  removeWeatherEffects();
  for (let i = 0; i < numDrops; i++) {
    const drop = document.createElement("div");
    drop.classList.add("rain");
    drop.style.left = Math.random() * window.innerWidth + "px";
    drop.style.animationDuration = (0.5 + Math.random() * 1.5) + "s";
    drop.style.animationDelay = Math.random() * 2 + "s";
    drop.style.height = 10 + Math.random() * 20 + "px";
    document.body.appendChild(drop);
  }
}

// ❄ Snow
function createSnow(numFlakes = 100) {
  removeWeatherEffects();
  for (let i = 0; i < numFlakes; i++) {
    const flake = document.createElement("div");
    flake.classList.add("snowflake");
    flake.style.left = Math.random() * window.innerWidth + "px";
    flake.style.width = 4 + Math.random() * 4 + "px";
    flake.style.height = flake.style.width;
    flake.style.animationDuration = 3 + Math.random() * 3 + "s";
    flake.style.animationDelay = Math.random() * 3 + "s";
    document.body.appendChild(flake);
  }
}

// ⚡ Thunderstorm
function createThunderstorm(numDrops = 100) {
  removeWeatherEffects();
  createRain(numDrops);

  const lightning = document.createElement("div");
  lightning.classList.add("lightning");
  document.body.appendChild(lightning);

  function randomFlash() {
    const delay = 2000 + Math.random() * 3000;
    setTimeout(() => {
      lightning.style.opacity = Math.random() * 0.6 + 0.4;
      setTimeout(() => { lightning.style.opacity = 0; }, 200 + Math.random() * 300);
      randomFlash();
    }, delay);
  }
  randomFlash();
}

// ❌ Clear effects
function removeWeatherEffects() {
  document.querySelectorAll(".rain, .snowflake, .lightning").forEach(el => el.remove());
}