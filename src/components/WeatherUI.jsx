import React, { useState } from 'react';
import {
  Search, MapPin, Wind, Droplets, ThermometerSun,
  Gauge, Eye, Sun, CloudRain, RefreshCw, Clock
} from 'lucide-react';

const CitySearchForm = ({ onSearch }) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput);
      setSearchInput('');
    }
  };

  return (
    <form className="search-container" onSubmit={handleSearch} role="search" aria-label="Search weather by city">
      <Search className="search-icon" size={18} />
      <input
        type="text"
        className="search-input"
        placeholder="Search city..."
        aria-label="City name"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />
    </form>
  );
};

const WeatherUI = ({ weather, location, onSearch, onRefresh, onRetry, loading, error }) => {

  if (!weather) {
    return (
      <div className="ui-overlay">
        <div className="top-bar">
          <CitySearchForm onSearch={onSearch} />
        </div>
        <section aria-live="polite" aria-busy={loading} style={{ color: 'white', textAlign: 'center', margin: 'auto' }}>
          {loading ? (
            <>
              <div className="spinner" aria-hidden="true" style={{ margin: '0 auto' }}></div>
              <p>Finding a location and loading its weather…</p>
            </>
          ) : (
            <>
              <p>{error || 'Weather is unavailable. Search for a city or retry location detection.'}</p>
              <button className="error-retry" type="button" onClick={onRetry}>Retry</button>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="ui-overlay">
      {/* Top section: Location + Search */}
      <div className="top-bar animate-fade-in">
        <div className="current-weather">
          <div className="location-info">
            <MapPin size={18} />
            <span className="location-name">{location}</span>
            <button
              className="refresh-btn"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh weather data"
            >
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            </button>
          </div>
          <div className="temperature">
            <span className="temp-icon">{weather.icon}</span>
            <span className="temp-value">{weather.temperature}</span>
            <span className="temp-unit">°C</span>
          </div>
          <p className="weather-desc">{weather.description}</p>
          <p className="last-updated">
            <Clock size={12} />
            {weather.provider || 'Weather provider'} · reported: {weather.observedAt || weather.lastUpdated || 'time unavailable'}
          </p>
        </div>

        <CitySearchForm onSearch={onSearch} />
      </div>

      {error && (
        <p role="status" aria-live="polite" style={{ color: 'white', margin: '0 auto', maxWidth: '1200px', width: '100%' }}>
          Showing previous {weather.provider || 'provider'} data; refresh failed: {error}
        </p>
      )}

      {/* Middle section: Hourly Forecast */}
      {weather.hourlyForecast && weather.hourlyForecast.length > 0 && (
        <div className="hourly-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="section-title">Hourly Forecast</h3>
          <div className="hourly-scroll">
            {weather.hourlyForecast.map((hour, i) => (
              <div key={i} className="hourly-item glass-panel-sm">
                <span className="hourly-time">{hour.time}</span>
                <span className="hourly-icon">{hour.icon}</span>
                <span className="hourly-temp">{hour.temperature}°</span>
                {hour.precipitationProbability > 0 && (
                  <span className="hourly-precip">
                    <Droplets size={10} /> {hour.precipitationProbability}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom section: Details + Daily Forecast */}
      <div className="bottom-section animate-fade-in" style={{ animationDelay: '0.2s' }}>
        {/* Current Details */}
        <div className="details-grid glass-panel">
          <div className="detail-item">
            <div className="detail-icon">
              <ThermometerSun size={20} />
            </div>
            <div className="detail-info">
              <span className="detail-label">Feels Like</span>
              <span className="detail-value">{weather.feelsLike}°C</span>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <Droplets size={20} />
            </div>
            <div className="detail-info">
              <span className="detail-label">Humidity</span>
              <span className="detail-value">{weather.humidity}%</span>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <Wind size={20} />
            </div>
            <div className="detail-info">
              <span className="detail-label">Wind</span>
              <span className="detail-value">{weather.windSpeed} km/h</span>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <Gauge size={20} />
            </div>
            <div className="detail-info">
              <span className="detail-label">Pressure</span>
              <span className="detail-value">{weather.pressure} hPa</span>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <Sun size={20} />
            </div>
            <div className="detail-info">
              <span className="detail-label">UV Index</span>
              <span className="detail-value">{weather.uvIndex}</span>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <Eye size={20} />
            </div>
            <div className="detail-info">
              <span className="detail-label">Cloud Cover</span>
              <span className="detail-value">{weather.cloudCover}%</span>
            </div>
          </div>
        </div>

        {/* Daily Forecast */}
        {weather.dailyForecast && weather.dailyForecast.length > 0 && (
          <div className="daily-forecast glass-panel">
            <h3 className="section-title">7-Day Forecast</h3>
            {weather.dailyForecast.map((day, i) => (
              <div key={i} className="daily-item">
                <span className="daily-day">{day.weekday}</span>
                <span className="daily-icon">{day.icon}</span>
                <span className="daily-precip-bar">
                  {day.precipProbability > 0 && (
                    <>
                      <Droplets size={12} />
                      <span>{day.precipProbability}%</span>
                    </>
                  )}
                </span>
                <div className="daily-temp-range">
                  <span className="daily-temp-min">{day.tempMin}°</span>
                  <div className="temp-bar">
                    <div
                      className="temp-bar-fill"
                      style={{
                        left: `${Math.max(0, ((day.tempMin + 10) / 60) * 100)}%`,
                        right: `${Math.max(0, 100 - ((day.tempMax + 10) / 60) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="daily-temp-max">{day.tempMax}°</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherUI;
