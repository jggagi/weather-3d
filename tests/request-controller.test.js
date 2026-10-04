import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers';
import { createWeatherRequestController } from '../src/request-controller.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeController(overrides = {}) {
  const states = [];
  const controller = createWeatherRequestController({
    geocodeCity: async (city) => ({ latitude: city === 'Oldtown' ? 1 : 2, longitude: 3, name: city }),
    fetchWeather: async (lat) => ({ cityLatitude: lat }),
    reverseGeocode: async () => 'Resolved place',
    fetchIPLocation: async () => ({ latitude: 4, longitude: 5, city: 'IP place' }),
    onState: (state) => states.push(state),
    ...overrides,
  });
  return { controller, states, current: () => states.at(-1) };
}

test('late older city success cannot overwrite a newer city selection', async () => {
  const oldGeocode = deferred();
  const weatherRequests = [];
  const fixture = makeController({
    geocodeCity: (city) => city === 'Oldtown' ? oldGeocode.promise : Promise.resolve({ latitude: 22, longitude: 23, name: city }),
    fetchWeather: async (lat) => {
      weatherRequests.push(lat);
      return { cityLatitude: lat };
    },
  });

  const older = fixture.controller.requestCity('Oldtown');
  await fixture.controller.requestCity('Newcity');
  oldGeocode.resolve({ latitude: 11, longitude: 12, name: 'Oldtown' });
  await older;

  assert.equal(fixture.current().locationName, 'Newcity');
  assert.deepEqual(fixture.current().coords, { lat: 22, lon: 23 });
  assert.deepEqual(weatherRequests, [22]);
  assert.equal(fixture.current().error, null);
});

test('late older weather failure cannot replace a newer success', async () => {
  const oldWeather = deferred();
  const oldWeatherStarted = deferred();
  const fixture = makeController({
    geocodeCity: async (city) => ({ latitude: city === 'Oldtown' ? 1 : 2, longitude: 3, name: city }),
    fetchWeather: (lat) => {
      if (lat === 1) {
        oldWeatherStarted.resolve();
        return oldWeather.promise;
      }
      return Promise.resolve({ cityLatitude: lat });
    },
  });

  const older = fixture.controller.requestCity('Oldtown');
  await oldWeatherStarted.promise;
  await fixture.controller.requestCity('Newcity');
  oldWeather.reject(new Error('stale failure'));
  await older;

  assert.equal(fixture.current().weatherData.cityLatitude, 2);
  assert.equal(fixture.current().locationName, 'Newcity');
  assert.equal(fixture.current().error, null);
  assert.equal(fixture.current().loading, false);
});

test('cancelled startup callback does not begin IP lookup after user search', async () => {
  let geolocationError;
  let ipCalls = 0;
  const fixture = makeController({
    fetchIPLocation: async () => {
      ipCalls += 1;
      return { latitude: 9, longitude: 9, city: 'IP' };
    },
  });
  fixture.controller.startBootstrap({
    getCurrentPosition(_success, error) { geolocationError = error; },
  });

  await fixture.controller.requestCity('Newcity');
  geolocationError(new Error('denied late'));

  assert.equal(ipCalls, 0);
  assert.equal(fixture.current().locationName, 'Newcity');
});

test('refresh failure retains visible data and retry can recover', async () => {
  let weatherCall = 0;
  const fixture = makeController({
    fetchWeather: async () => {
      weatherCall += 1;
      if (weatherCall === 2) throw new Error('temporary outage');
      return { temperature: weatherCall };
    },
  });

  await fixture.controller.requestCity('Newcity');
  const previousWeather = fixture.current().weatherData;
  const previousLocation = fixture.current().locationName;
  await fixture.controller.refresh(fixture.current().coords, previousLocation);

  assert.equal(fixture.current().weatherData, previousWeather);
  assert.equal(fixture.current().locationName, previousLocation);
  assert.equal(fixture.current().error, 'Failed to fetch weather data');
  assert.equal(fixture.current().loading, false);

  await fixture.controller.retry();
  assert.equal(fixture.current().weatherData.temperature, 3);
  assert.equal(fixture.current().error, null);
  assert.equal(fixture.current().loading, false);
});

test('initial failure can be retried explicitly', async () => {
  let calls = 0;
  const fixture = makeController({
    fetchIPLocation: async () => ({ latitude: 1, longitude: 2, city: 'Fallback' }),
    fetchWeather: async () => {
      calls += 1;
      if (calls === 1) throw new Error('offline');
      return { temperature: 18 };
    },
  });

  fixture.controller.startBootstrap(null);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fixture.current().loading, false);
  assert.equal(fixture.current().error, 'Failed to fetch weather data');
  assert.equal(fixture.current().weatherData, null);

  await fixture.controller.retry();
  assert.equal(fixture.current().weatherData.temperature, 18);
  assert.equal(fixture.current().error, null);
  assert.equal(fixture.current().loading, false);
});

test('dispose invalidates pending work and suppresses later state updates', async () => {
  const pendingWeather = deferred();
  const fixture = makeController({ fetchWeather: () => pendingWeather.promise });
  const request = fixture.controller.requestCity('Newcity');
  const emittedBeforeDispose = fixture.states.length;

  fixture.controller.dispose();
  pendingWeather.resolve({ temperature: 22 });
  await request;

  assert.equal(fixture.states.length, emittedBeforeDispose);
  assert.equal(fixture.controller.isCurrent(1), false);
});
