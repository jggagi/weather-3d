const FALLBACK_LOCATION = { latitude: 31.2304, longitude: 121.4737, city: 'Shanghai' };

/**
 * Keeps asynchronous location/weather work scoped to the latest request.
 * Superseded HTTP work is allowed to finish, but it cannot publish state or
 * start follow-up geocoding/IP requests.
 */
export function createWeatherRequestController({
  geocodeCity,
  fetchWeather,
  reverseGeocode,
  fetchIPLocation,
  onState,
  fallbackLocation = FALLBACK_LOCATION,
}) {
  let requestIdentity = 0;
  let disposed = false;
  let retryAction = null;
  let state = {
    weatherData: null,
    locationName: '',
    coords: null,
    error: null,
    loading: true,
  };

  const publish = (patch, identity = requestIdentity) => {
    if (disposed || identity !== requestIdentity) return false;
    state = { ...state, ...patch };
    onState({ ...state });
    return true;
  };

  const begin = (retry) => {
    if (disposed) return null;
    requestIdentity += 1;
    retryAction = retry;
    publish({ loading: true, error: null });
    return requestIdentity;
  };

  const isCurrent = (identity) => !disposed && identity === requestIdentity;

  const fail = (identity, message) => publish({ loading: false, error: message }, identity);

  const loadCoordinates = async (identity, lat, lon, cityName) => {
    try {
      const weatherData = await fetchWeather(lat, lon);
      if (!isCurrent(identity)) return false;

      const resolvedName = cityName || await reverseGeocode(lat, lon);
      if (!isCurrent(identity)) return false;

      publish({
        weatherData,
        coords: { lat, lon },
        locationName: resolvedName,
        loading: false,
        error: null,
      }, identity);
      return true;
    } catch (error) {
      if (isCurrent(identity)) {
        console.error(error);
        fail(identity, 'Failed to fetch weather data');
      }
      return false;
    }
  };

  const requestCity = async (city) => {
    const identity = begin(() => requestCity(city));
    if (identity === null) return false;
    try {
      const geoData = await geocodeCity(city);
      if (!isCurrent(identity)) return false;
      return await loadCoordinates(identity, geoData.latitude, geoData.longitude, geoData.name || city);
    } catch (error) {
      if (isCurrent(identity)) {
        console.error(error);
        fail(identity, `City "${city}" not found`);
      }
      return false;
    }
  };

  const requestCoordinates = (lat, lon, cityName) => {
    const identity = begin(() => requestCoordinates(lat, lon, cityName));
    if (identity === null) return Promise.resolve(false);
    return loadCoordinates(identity, lat, lon, cityName);
  };

  const loadIpLocation = async (identity) => {
    if (!isCurrent(identity)) return false;
    try {
      const location = await fetchIPLocation();
      if (!isCurrent(identity)) return false;
      return await loadCoordinates(identity, location.latitude, location.longitude, location.city);
    } catch (error) {
      if (!isCurrent(identity)) return false;
      console.error('IP location failed, defaulting to Shanghai:', error);
      return loadCoordinates(identity, fallbackLocation.latitude, fallbackLocation.longitude, fallbackLocation.city);
    }
  };

  const startBootstrap = (geolocation = null) => {
    const identity = begin(() => startBootstrap(geolocation));
    if (identity === null) return null;

    if (geolocation && typeof geolocation.getCurrentPosition === 'function') {
      try {
        geolocation.getCurrentPosition(
          (position) => {
            if (!isCurrent(identity)) return;
            loadCoordinates(identity, position.coords.latitude, position.coords.longitude, null);
          },
          () => {
            if (isCurrent(identity)) loadIpLocation(identity);
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
        );
      } catch {
        loadIpLocation(identity);
      }
    } else {
      return loadIpLocation(identity);
    }
    return identity;
  };

  const refresh = (coords, locationName) => {
    if (!coords || state.loading) return Promise.resolve(false);
    return requestCoordinates(coords.lat, coords.lon, locationName || null);
  };

  return {
    requestCity,
    requestCoordinates,
    startBootstrap,
    refresh,
    retry() {
      if (disposed || !retryAction) return Promise.resolve(false);
      const retry = retryAction;
      return retry();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      requestIdentity += 1;
      retryAction = null;
    },
    isCurrent,
  };
}
