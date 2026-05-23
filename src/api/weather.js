import axios from 'axios';

// Open-Meteo Geocoding API
export const geocodeCity = async (cityName) => {
  try {
    const response = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`
    );
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }
    throw new Error('City not found');
  } catch (error) {
    console.error("Geocoding error:", error);
    throw error;
  }
};

// Reverse geocoding — convert lat/lon to city name
export const reverseGeocode = async (lat, lon) => {
  try {
    // Open-Meteo doesn't have reverse geocoding, so we use a free nominatim endpoint
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'Weather3DApp/1.0' } }
    );
    const addr = response.data.address;
    return addr.city || addr.town || addr.village || addr.county || response.data.display_name.split(',')[0];
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }
};

// WMO Weather interpretation codes (WW)
// https://open-meteo.com/en/docs
const weatherCodeMap = {
  0: { description: 'Clear sky', icon: '☀️' },
  1: { description: 'Mainly clear', icon: '🌤️' },
  2: { description: 'Partly cloudy', icon: '⛅' },
  3: { description: 'Overcast', icon: '☁️' },
  45: { description: 'Fog', icon: '🌫️' },
  48: { description: 'Rime fog', icon: '🌫️' },
  51: { description: 'Light drizzle', icon: '🌦️' },
  53: { description: 'Moderate drizzle', icon: '🌦️' },
  55: { description: 'Dense drizzle', icon: '🌧️' },
  56: { description: 'Freezing drizzle', icon: '🌧️' },
  57: { description: 'Heavy freezing drizzle', icon: '🌧️' },
  61: { description: 'Slight rain', icon: '🌧️' },
  63: { description: 'Moderate rain', icon: '🌧️' },
  65: { description: 'Heavy rain', icon: '🌧️' },
  66: { description: 'Freezing rain', icon: '🌧️' },
  67: { description: 'Heavy freezing rain', icon: '🌧️' },
  71: { description: 'Slight snow', icon: '🌨️' },
  73: { description: 'Moderate snow', icon: '🌨️' },
  75: { description: 'Heavy snow', icon: '❄️' },
  77: { description: 'Snow grains', icon: '❄️' },
  80: { description: 'Slight showers', icon: '🌦️' },
  81: { description: 'Moderate showers', icon: '🌧️' },
  82: { description: 'Violent showers', icon: '🌧️' },
  85: { description: 'Slight snow showers', icon: '🌨️' },
  86: { description: 'Heavy snow showers', icon: '❄️' },
  95: { description: 'Thunderstorm', icon: '⛈️' },
  96: { description: 'Thunderstorm with hail', icon: '⛈️' },
  99: { description: 'Thunderstorm with heavy hail', icon: '⛈️' },
};

export const getWeatherInfo = (code) => {
  return weatherCodeMap[code] || { description: 'Unknown', icon: '❓' };
};

// Map WMO codes to our 3D Scene types
export const getWeatherConditionType = (code) => {
  if (code === 0 || code === 1) return 'sunny';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'cloudy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'rain';
  return 'cloudy';
};

// Determine if it's currently night (for scene theming)
export const isNightTime = (currentTime, sunrise, sunset) => {
  if (!currentTime || !sunrise || !sunset) return false;
  const now = new Date(currentTime);
  const rise = new Date(sunrise);
  const set = new Date(sunset);
  return now < rise || now > set;
};

// Full weather fetch — current + hourly + daily forecasts
export const fetchWeather = async (lat, lon) => {
  try {
    const response = await axios.get(
      'https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: lat,
          longitude: lon,
          current: [
            'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
            'is_day', 'precipitation', 'weather_code', 'wind_speed_10m',
            'wind_direction_10m', 'surface_pressure', 'cloud_cover',
            'uv_index'
          ].join(','),
          hourly: [
            'temperature_2m', 'weather_code', 'precipitation_probability'
          ].join(','),
          daily: [
            'weather_code', 'temperature_2m_max', 'temperature_2m_min',
            'sunrise', 'sunset', 'precipitation_sum', 'uv_index_max',
            'precipitation_probability_max'
          ].join(','),
          timezone: 'auto',
          forecast_days: 7,
          forecast_hours: 24
        }
      }
    );

    const data = response.data;
    const current = data.current;
    const weatherInfo = getWeatherInfo(current.weather_code);

    // Parse hourly forecast (next 24 hours)
    const hourlyForecast = [];
    if (data.hourly) {
      const now = new Date(current.time);
      for (let i = 0; i < data.hourly.time.length; i++) {
        const hourTime = new Date(data.hourly.time[i]);
        if (hourTime > now && hourlyForecast.length < 12) {
          const hInfo = getWeatherInfo(data.hourly.weather_code[i]);
          hourlyForecast.push({
            time: hourTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            temperature: Math.round(data.hourly.temperature_2m[i]),
            icon: hInfo.icon,
            precipitationProbability: data.hourly.precipitation_probability[i],
          });
        }
      }
    }

    // Parse daily forecast (7 days)
    const dailyForecast = [];
    if (data.daily) {
      for (let i = 0; i < data.daily.time.length; i++) {
        const dayDate = new Date(data.daily.time[i]);
        const dInfo = getWeatherInfo(data.daily.weather_code[i]);
        dailyForecast.push({
          date: dayDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
          weekday: dayDate.toLocaleDateString([], { weekday: 'short' }),
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
          icon: dInfo.icon,
          description: dInfo.description,
          precipitationSum: data.daily.precipitation_sum[i],
          precipProbability: data.daily.precipitation_probability_max[i],
          uvIndexMax: data.daily.uv_index_max[i],
        });
      }
    }

    // Determine if it's night
    const isNight = current.is_day === 0;

    return {
      // Current conditions
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      pressure: Math.round(current.surface_pressure),
      cloudCover: current.cloud_cover,
      uvIndex: current.uv_index != null ? current.uv_index : 0,
      precipitation: current.precipitation,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      conditionCode: current.weather_code,
      conditionType: getWeatherConditionType(current.weather_code),
      isNight,
      lastUpdated: new Date(current.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),

      // Forecasts
      hourlyForecast,
      dailyForecast,

      // Sunrise/sunset from daily[0]
      sunrise: data.daily?.sunrise?.[0] || null,
      sunset: data.daily?.sunset?.[0] || null,
    };
  } catch (error) {
    console.error("Weather fetching error:", error);
    throw error;
  }
};

// Auto-refresh interval in milliseconds (5 minutes)
export const REFRESH_INTERVAL = 5 * 60 * 1000;

// Fetch location by IP address with fallback to Shanghai
export const fetchIPLocation = async () => {
  try {
    const response = await axios.get('https://ipapi.co/json/', { timeout: 4000 });
    if (response.data && response.data.latitude && response.data.longitude) {
      return {
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        city: response.data.city || 'Shanghai'
      };
    }
  } catch (err) {
    console.warn('IP geolocation via ipapi.co failed, trying backup...', err.message);
    try {
      const response = await axios.get('https://ipwho.is/', { timeout: 4000 });
      if (response.data && response.data.success && response.data.latitude && response.data.longitude) {
        return {
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          city: response.data.city || 'Shanghai'
        };
      }
    } catch (backupErr) {
      console.warn('Backup IP geolocation failed:', backupErr.message);
    }
  }
  // Ultimate fallback is Shanghai
  return {
    latitude: 31.2304,
    longitude: 121.4737,
    city: 'Shanghai'
  };
};
