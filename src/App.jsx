import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import WeatherScene from './components/WeatherScene';
import WeatherUI from './components/WeatherUI';
import { fetchWeather, geocodeCity, reverseGeocode, fetchIPLocation, REFRESH_INTERVAL } from './api/weather';

function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState(null); // { lat, lon }
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Core function to fetch weather for specific coordinates
  const loadWeatherByCoords = useCallback(async (lat, lon, cityName) => {
    try {
      setError(null);
      const weather = await fetchWeather(lat, lon);
      setWeatherData(weather);
      setCoords({ lat, lon });

      // If no city name provided, reverse geocode
      if (cityName) {
        setLocationName(cityName);
      } else {
        const name = await reverseGeocode(lat, lon);
        setLocationName(name);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load weather by city name search
  const loadWeatherByCity = useCallback(async (city) => {
    try {
      setError(null);
      setLoading(true);
      const geoData = await geocodeCity(city);
      await loadWeatherByCoords(geoData.latitude, geoData.longitude, geoData.name);
    } catch (err) {
      console.error(err);
      setError(`City "${city}" not found`);
      setLoading(false);
    }
  }, [loadWeatherByCoords]);

  // On mount — try browser geolocation first, then IP-based geolocator, then fallback to Shanghai
  useEffect(() => {
    const initLocation = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            loadWeatherByCoords(position.coords.latitude, position.coords.longitude);
          },
          async (geoError) => {
            console.warn('Browser geolocation failed/denied, trying IP location:', geoError.message);
            try {
              const ipLoc = await fetchIPLocation();
              loadWeatherByCoords(ipLoc.latitude, ipLoc.longitude, ipLoc.city);
            } catch (ipErr) {
              console.error('IP location failed, defaulting to Shanghai:', ipErr);
              loadWeatherByCoords(31.2304, 121.4737, 'Shanghai');
            }
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
        );
      } else {
        fetchIPLocation().then((ipLoc) => {
          loadWeatherByCoords(ipLoc.latitude, ipLoc.longitude, ipLoc.city);
        }).catch(() => {
          loadWeatherByCoords(31.2304, 121.4737, 'Shanghai');
        });
      }
    };

    initLocation();
  }, [loadWeatherByCoords]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!coords) return;

    const interval = setInterval(() => {
      console.log('[Auto-refresh] Updating weather data...');
      loadWeatherByCoords(coords.lat, coords.lon, locationName);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [coords, locationName, loadWeatherByCoords]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    if (coords) {
      setLoading(true);
      loadWeatherByCoords(coords.lat, coords.lon, locationName);
    }
  }, [coords, locationName, loadWeatherByCoords]);

  // Search handler
  const handleSearch = useCallback((city) => {
    loadWeatherByCity(city);
  }, [loadWeatherByCity]);

  return (
    <div className="app-container">
      {/* 3D Background layer */}
      <WeatherScene
        conditionType={weatherData?.conditionType || 'sunny'}
        isNight={weatherData?.isNight || false}
      />

      {/* UI Overlay layer */}
      <WeatherUI
        weather={weatherData}
        location={locationName}
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* Error toast */}
      {error && (
        <div className="error-toast" onClick={() => setError(null)}>
          <span>⚠️ {error}</span>
          <span className="error-dismiss">×</span>
        </div>
      )}
    </div>
  );
}

export default App;
