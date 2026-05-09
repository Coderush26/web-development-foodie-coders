"use client";

import { useMemo, useRef } from "react";

import {
  FeatureGroup as LeafletFeatureGroup,
  Polygon as LeafletPolygon,
  type DrawEvents,
  type LatLng,
} from "leaflet";
import { EditControl } from "react-leaflet-draw";
import { FeatureGroup, Polygon, Tooltip } from "react-leaflet";

import type { GeoPoint } from "@/types/fleet";
import type { RestrictedZone, RestrictedZoneDraft } from "@/types/zones";

type RestrictedZoneControlsProps = {
  role: "command" | "captain";
  zones: RestrictedZone[];
  onCreateZone?: (zone: RestrictedZoneDraft) => void | Promise<void>;
  onUpdateZone?: (zoneId: string, zone: RestrictedZoneDraft) => void | Promise<void>;
  onDeleteZone?: (zoneId: string) => void | Promise<void>;
};

const zonePathOptions = {
  color: "#c2410c",
  dashArray: "8 6",
  fillColor: "#f97316",
  fillOpacity: 0.14,
  weight: 2,
};

function toLatLng(point: GeoPoint): [number, number] {
  return [point.lat, point.lng];
}

function isLeafletPolygon(layer: unknown): layer is LeafletPolygon {
  return layer instanceof LeafletPolygon;
}

function toGeoPoints(layer: LeafletPolygon) {
  const latLngs = layer.getLatLngs();
  const ring = (Array.isArray(latLngs[0]) ? latLngs[0] : latLngs) as LatLng[];

  return ring.map((point) => ({
    lat: point.lat,
    lng: point.lng,
  }));
}

export function RestrictedZoneControls({
  role,
  zones,
  onCreateZone,
  onUpdateZone,
  onDeleteZone,
}: RestrictedZoneControlsProps) {
  const featureGroupRef = useRef<LeafletFeatureGroup | null>(null);
  const zoneLayersRef = useRef(new Map<string, LeafletPolygon>());
  const zonesById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);

  function setZoneLayerRef(zoneId: string) {
    return (layer: LeafletPolygon | null) => {
      if (layer) {
        zoneLayersRef.current.set(zoneId, layer);
        return;
      }

      zoneLayersRef.current.delete(zoneId);
    };
  }

  function findZoneId(layer: LeafletPolygon) {
    for (const [zoneId, zoneLayer] of zoneLayersRef.current.entries()) {
      if (zoneLayer === layer) {
        return zoneId;
      }
    }

    return null;
  }

  async function handleCreated(event: DrawEvents.Created) {
    if (event.layerType !== "polygon" || !isLeafletPolygon(event.layer) || !onCreateZone) {
      return;
    }

    featureGroupRef.current?.removeLayer(event.layer);
    await onCreateZone({ name: "", points: toGeoPoints(event.layer) });
  }

  async function handleEdited(event: DrawEvents.Edited) {
    if (!onUpdateZone) {
      return;
    }

    const updates: Array<Promise<void> | void> = [];

    event.layers.eachLayer((layer) => {
      if (!isLeafletPolygon(layer)) {
        return;
      }

      const zoneId = findZoneId(layer);
      const zone = zoneId ? zonesById.get(zoneId) : null;

      if (!zoneId || !zone) {
        return;
      }

      updates.push(onUpdateZone(zoneId, { name: zone.name, points: toGeoPoints(layer) }));
    });

    await Promise.all(updates);
  }

  async function handleDeleted(event: DrawEvents.Deleted) {
    if (!onDeleteZone) {
      return;
    }

    const zoneIds: string[] = [];

    event.layers.eachLayer((layer) => {
      if (!isLeafletPolygon(layer)) {
        return;
      }

      const zoneId = findZoneId(layer);

      if (zoneId) {
        zoneIds.push(zoneId);
      }
    });

    for (const zoneId of zoneIds) {
      await onDeleteZone(zoneId);
    }
  }

  const zonePolygons = zones.map((zone) => (
    <Polygon
      key={zone.id}
      ref={setZoneLayerRef(zone.id)}
      positions={zone.points.map(toLatLng)}
      pathOptions={zonePathOptions}
    >
      <Tooltip sticky direction="top" offset={[0, -8]}>
        {zone.name}
      </Tooltip>
    </Polygon>
  ));

  if (role !== "command") {
    return <>{zonePolygons}</>;
  }

  return (
    <FeatureGroup ref={featureGroupRef}>
      <EditControl
        position="topright"
        onCreated={(event) => {
          void handleCreated(event);
        }}
        onEdited={(event) => {
          void handleEdited(event);
        }}
        onDeleted={(event) => {
          void handleDeleted(event);
        }}
        draw={{
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: zonePathOptions,
          },
          polyline: false,
          rectangle: false,
          circle: false,
          marker: false,
          circlemarker: false,
        }}
        edit={{
          edit: {
            selectedPathOptions: {
              color: "#c2410c",
              fillColor: "#fb923c",
              fillOpacity: 0.18,
              weight: 2,
            },
          },
          remove: true,
        }}
      />
      {zonePolygons}
    </FeatureGroup>
  );
}
