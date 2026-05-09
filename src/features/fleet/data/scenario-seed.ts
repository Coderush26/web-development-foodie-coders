import fleetSeed from "@/docs/problem-statement/fleet.json";

import { captainSampleShipIds, gradingThresholds } from "@/config/scenario";
import type { FleetScenarioSeed, GeoPoint, Port, ShipSnapshot, ShipStatus } from "@/types/fleet";

type RawPoint = [number, number];

type RawScenario = {
  scenario: {
    name: string;
    description: string;
  };
  coordinateFormat: string;
  units: {
    speed: string;
    fuel: string;
    heading: string;
  };
  boundingBox: FleetScenarioSeed["bounds"];
  navigableWater: RawPoint[];
  ports: Array<{
    id: string;
    name: string;
    position: RawPoint;
  }>;
  fleet: Array<{
    shipId: string;
    name: string;
    position: RawPoint;
    speed: number;
    heading: number;
    destination: string;
    fuel: number;
    cargo: string;
    status: string;
  }>;
};

const rawScenario = fleetSeed as RawScenario;

if (rawScenario.fleet.length !== gradingThresholds.exactActiveShips) {
  throw new Error(
    `Expected ${gradingThresholds.exactActiveShips} ships in fleet seed, received ${rawScenario.fleet.length}.`
  );
}

const toPoint = ([lat, lng]: RawPoint): GeoPoint => ({ lat, lng });

const ports: Port[] = rawScenario.ports.map((port) => ({
  id: port.id,
  name: port.name,
  position: toPoint(port.position),
}));

const ships: ShipSnapshot[] = rawScenario.fleet.map((ship) => ({
  shipId: ship.shipId,
  name: ship.name,
  position: toPoint(ship.position),
  speedKnots: ship.speed,
  headingDegrees: ship.heading,
  destinationPortId: ship.destination,
  fuelTons: ship.fuel,
  cargo: ship.cargo,
  status: ship.status as ShipStatus,
  intent: {
    type: "destination-port",
    portId: ship.destination,
  },
}));

const portLookup = new Map(ports.map((port) => [port.id, port]));

const scenarioSeed: FleetScenarioSeed = {
  metadata: {
    name: rawScenario.scenario.name,
    description: rawScenario.scenario.description,
    coordinateFormat: rawScenario.coordinateFormat,
    units: rawScenario.units,
  },
  bounds: rawScenario.boundingBox,
  navigableWater: rawScenario.navigableWater.map(toPoint),
  ports,
  ships,
};

export function getFleetScenarioSeed(): FleetScenarioSeed {
  return scenarioSeed;
}

export function getFleetOverview() {
  return {
    shipCount: scenarioSeed.ships.length,
    portCount: scenarioSeed.ports.length,
    navigableVertexCount: scenarioSeed.navigableWater.length,
    bounds: scenarioSeed.bounds,
  };
}

export function getShipById(shipId: string) {
  return scenarioSeed.ships.find((ship) => ship.shipId === shipId);
}

export function getPortById(portId: string) {
  return portLookup.get(portId);
}

export function listCaptainRouteSamples() {
  return captainSampleShipIds
    .map((shipId) => getShipById(shipId))
    .filter((ship): ship is ShipSnapshot => Boolean(ship))
    .map((ship) => ({
      shipId: ship.shipId,
      name: ship.name,
      cargo: ship.cargo,
      status: ship.status,
      destinationName: getPortById(ship.destinationPortId)?.name ?? ship.destinationPortId,
      href: `/captain/${ship.shipId}`,
    }));
}
