import type { RestrictedZoneDraft } from "@/types/zones";

export type FleetControlCommand =
  | {
      type: "zone.create";
      zone: RestrictedZoneDraft;
    }
  | {
      type: "zone.update";
      zoneId: string;
      zone: RestrictedZoneDraft;
    }
  | {
      type: "zone.delete";
      zoneId: string;
    }
  | {
      type: "alert.acknowledge";
      alertId: string;
    }
  | {
      type: "alert.resolve";
      alertId: string;
    };
