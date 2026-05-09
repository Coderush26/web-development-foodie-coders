import type { DirectiveType } from "@/types/directives";
import type { GeoPoint } from "@/types/fleet";
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
    }
  | {
      type: "directive.issue";
      shipId: string;
      directiveType: DirectiveType;
      targetPortId?: string;
      waypoint?: GeoPoint;
      note?: string;
    }
  | {
      type: "directive.accept";
      directiveId: string;
    }
  | {
      type: "directive.escalate-distress";
      directiveId: string;
      distressMessage: string;
    };
