import type { GeoPoint } from "@/types/fleet";

export interface RestrictedZoneDraft {
  name: string;
  points: GeoPoint[];
}

export interface RestrictedZone extends RestrictedZoneDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
}
