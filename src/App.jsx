import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import WeatherScene from './components/WeatherScene';
import WeatherUI from './components/WeatherUI';
import { fetchWeather, geocodeCity, reverseGeocode, fetchIPLocation, REFRESH_INTERVAL } from './api/weather';
import { createWeatherRequestController } from './request-controller';

const INITIAL_WEATHER_STATE = {
  weatherData: null,
  locationName: '',
  coords: null,
  error: null,
  loading: true,
};

function App() {
  const [weatherState, setWeatherState] = useState(INITIAL_WEATHER_STATE);
  const requestControllerRef = useRef(null);
  const { weatherData, locationName, coords, error, loading } = weatherState;

  useEffect(() => {
    const controller = createWeatherRequestController({
      fetchWeather,
      geocodeCity,
      reverseGeocode,
      fetchIPLocation,
      onState: setWeatherState,
    });
    requestControllerRef.current = controller;
    controller.startBootstrap(navigator.geolocation || null);

    return () => {
      controller.dispose();
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!coords) return undefined;

    const interval = setInterval(() => {
      requestControllerRef.current?.refresh(coords, locationName);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [coords, locationName]);

  const handleRefresh = useCallback(() => {
    requestControllerRef.current?.refresh(coords, locationName);
  }, [coords, locationName]);

  const handleSearch = useCallback((city) => {
    requestControllerRef.current?.requestCity(city);
  }, []);

  const handleRetry = useCallback(() => {
    requestControllerRef.current?.retry();
  }, []);

  const dismissError = useCallback(() => {
    setWeatherState((current) => ({ ...current, error: null }));
  }, []);

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
        onRetry={handleRetry}
        loading={loading}
        error={error}
      />

      {error && (
        <div className="error-toast" role="alert" aria-live="assertive">
          <span>⚠️ {error}</span>
          <button className="error-dismiss" type="button" onClick={dismissError} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
