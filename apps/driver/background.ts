import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

export const TASK = 'FAIRFLOW_BG_LOC';

TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = data as any;
  const loc = locations?.[0];
  if (!loc) return;
  const token = (globalThis as any).FAIRFLOW_TOKEN;
  try {
    await fetch('http://localhost:3001/api/mobile/position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ lat: loc.coords.latitude, lng: loc.coords.longitude, speedKph: (loc.coords.speed ?? 0) * 3.6 })
    });
  } catch {}
});

export async function startBackground(token: string){
  (globalThis as any).FAIRFLOW_TOKEN = token;
  const { status } = await Location.requestForegroundPermissionsAsync();
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted' || bg !== 'granted') return false;
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,
    distanceInterval: 10,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: true,
    foregroundService: { notificationTitle: 'FairFlow', notificationBody: 'Tracking your route…' }
  });
  return true;
}