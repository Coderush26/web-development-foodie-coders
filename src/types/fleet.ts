export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ScenarioMetadata {
  name: string;
  description: string;
  coordinateFormat: string;
  units: {
    speed: string;
    fuel: string;
    heading: string;
  };
}

export type ShipStatus =
  | "normal"
  | "rerouting"
  | "distressed"
  | "stopped"
  | "stranded"
  | "insufficient-fuel"
  | "out-of-fuel"
  | "arrived";

export type ShipIntentType = "destination-port" | "waypoint" | "hold-position";

export interface ShipRouteIntent {
  type: ShipIntentType;
  portId?: string;
  waypoint?: GeoPoint;
}

export interface Port {
  id: string;
  name: string;
  position: GeoPoint;
}

export interface ShipSnapshot {
  shipId: string;
  name: string;
  position: GeoPoint;
  speedKnots: number;
  headingDegrees: number;
  destinationPortId: string;
  fuelTons: number;
  cargo: string;
  status: ShipStatus;
  intent: ShipRouteIntent;
}

export interface FleetScenarioSeed {
  metadata: ScenarioMetadata;
  bounds: BoundingBox;
  navigableWater: GeoPoint[];
  ports: Port[];
  ships: ShipSnapshot[];
}
