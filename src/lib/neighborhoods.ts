// Approximate neighborhood centroids. Used ONLY in the browser to turn a geolocation
// fix into a coarse neighborhood name — coordinates never leave the device.

export interface Neighborhood {
  name: string;
  borough: string;
  lat: number;
  lng: number;
}

export const NEIGHBORHOODS: Neighborhood[] = [
  // Brooklyn
  { name: "Williamsburg", borough: "Brooklyn", lat: 40.7081, lng: -73.9571 },
  { name: "Greenpoint", borough: "Brooklyn", lat: 40.7304, lng: -73.9515 },
  { name: "Bushwick", borough: "Brooklyn", lat: 40.6944, lng: -73.9213 },
  { name: "Bed-Stuy", borough: "Brooklyn", lat: 40.6872, lng: -73.9418 },
  { name: "Clinton Hill", borough: "Brooklyn", lat: 40.6895, lng: -73.9661 },
  { name: "Fort Greene", borough: "Brooklyn", lat: 40.6892, lng: -73.9742 },
  { name: "DUMBO", borough: "Brooklyn", lat: 40.7033, lng: -73.9881 },
  { name: "Brooklyn Heights", borough: "Brooklyn", lat: 40.6960, lng: -73.9936 },
  { name: "Downtown Brooklyn", borough: "Brooklyn", lat: 40.6930, lng: -73.9866 },
  { name: "Cobble Hill", borough: "Brooklyn", lat: 40.6862, lng: -73.9962 },
  { name: "Park Slope", borough: "Brooklyn", lat: 40.6710, lng: -73.9814 },
  { name: "Prospect Heights", borough: "Brooklyn", lat: 40.6775, lng: -73.9692 },
  { name: "Crown Heights", borough: "Brooklyn", lat: 40.6694, lng: -73.9422 },
  { name: "Gowanus", borough: "Brooklyn", lat: 40.6733, lng: -73.9900 },
  { name: "Red Hook", borough: "Brooklyn", lat: 40.6757, lng: -74.0099 },
  { name: "Sunset Park", borough: "Brooklyn", lat: 40.6455, lng: -74.0124 },
  { name: "Flatbush", borough: "Brooklyn", lat: 40.6415, lng: -73.9594 },
  { name: "Bay Ridge", borough: "Brooklyn", lat: 40.6264, lng: -74.0299 },
  // Manhattan
  { name: "Financial District", borough: "Manhattan", lat: 40.7075, lng: -74.0113 },
  { name: "Tribeca", borough: "Manhattan", lat: 40.7163, lng: -74.0086 },
  { name: "SoHo", borough: "Manhattan", lat: 40.7233, lng: -74.0030 },
  { name: "Lower East Side", borough: "Manhattan", lat: 40.7150, lng: -73.9843 },
  { name: "Chinatown", borough: "Manhattan", lat: 40.7158, lng: -73.9970 },
  { name: "East Village", borough: "Manhattan", lat: 40.7265, lng: -73.9815 },
  { name: "West Village", borough: "Manhattan", lat: 40.7358, lng: -74.0036 },
  { name: "Greenwich Village", borough: "Manhattan", lat: 40.7336, lng: -73.9990 },
  { name: "Chelsea", borough: "Manhattan", lat: 40.7465, lng: -74.0014 },
  { name: "Flatiron", borough: "Manhattan", lat: 40.7410, lng: -73.9897 },
  { name: "Gramercy", borough: "Manhattan", lat: 40.7368, lng: -73.9845 },
  { name: "Murray Hill", borough: "Manhattan", lat: 40.7479, lng: -73.9757 },
  { name: "Midtown", borough: "Manhattan", lat: 40.7549, lng: -73.9840 },
  { name: "Hell's Kitchen", borough: "Manhattan", lat: 40.7638, lng: -73.9918 },
  { name: "Upper West Side", borough: "Manhattan", lat: 40.7870, lng: -73.9754 },
  { name: "Upper East Side", borough: "Manhattan", lat: 40.7736, lng: -73.9566 },
  { name: "Roosevelt Island", borough: "Manhattan", lat: 40.7617, lng: -73.9501 },
  { name: "Harlem", borough: "Manhattan", lat: 40.8116, lng: -73.9465 },
  { name: "Washington Heights", borough: "Manhattan", lat: 40.8417, lng: -73.9394 },
  // Queens
  { name: "Long Island City", borough: "Queens", lat: 40.7447, lng: -73.9485 },
  { name: "Astoria", borough: "Queens", lat: 40.7644, lng: -73.9235 },
  { name: "Sunnyside", borough: "Queens", lat: 40.7433, lng: -73.9196 },
  { name: "Ridgewood", borough: "Queens", lat: 40.7043, lng: -73.9018 },
  { name: "Jackson Heights", borough: "Queens", lat: 40.7557, lng: -73.8831 },
  { name: "Forest Hills", borough: "Queens", lat: 40.7181, lng: -73.8448 },
  { name: "Flushing", borough: "Queens", lat: 40.7675, lng: -73.8331 },
  // Bronx / Staten Island / Jersey side commuters
  { name: "Mott Haven", borough: "Bronx", lat: 40.8091, lng: -73.9229 },
  { name: "Riverdale", borough: "Bronx", lat: 40.8900, lng: -73.9124 },
  { name: "St. George", borough: "Staten Island", lat: 40.6437, lng: -74.0736 },
  { name: "Jersey City", borough: "New Jersey", lat: 40.7178, lng: -74.0431 },
  { name: "Hoboken", borough: "New Jersey", lat: 40.7440, lng: -74.0324 },
];

export const NEIGHBORHOOD_NAMES = new Set(NEIGHBORHOODS.map((n) => n.name));

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Nearest neighborhood within maxKm, or null if the user is outside the NYC area. */
export function nearestNeighborhood(lat: number, lng: number, maxKm = 6): Neighborhood | null {
  let best: Neighborhood | null = null;
  let bestD = Infinity;
  for (const n of NEIGHBORHOODS) {
    const d = haversineKm(lat, lng, n.lat, n.lng);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return bestD <= maxKm ? best : null;
}
