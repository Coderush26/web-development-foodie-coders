import { writeAuditLog } from "@/server/auth/audit";
import type { FleetControlCommand } from "@/types/control";

type WriteOperationalAuditLogInput = {
  actorUserId?: string | null;
  command: FleetControlCommand;
  targetId?: string | null;
};

function resolveAuditAction(command: FleetControlCommand) {
  if (command.type === "zone.create") {
    return "fleet.zone.created";
  }

  if (command.type === "zone.update") {
    return "fleet.zone.updated";
  }

  if (command.type === "zone.delete") {
    return "fleet.zone.deleted";
  }

  if (command.type === "alert.acknowledge") {
    return "fleet.alert.acknowledged";
  }

  if (command.type === "alert.resolve") {
    return "fleet.alert.resolved";
  }

  if (command.type === "directive.issue") {
    return "fleet.directive.issued";
  }

  if (command.type === "directive.accept") {
    return "fleet.directive.accepted";
  }

  return "fleet.directive.escalated_distress";
}

function resolveAuditTargetType(command: FleetControlCommand) {
  if (command.type.startsWith("zone.")) {
    return "zone";
  }

  if (command.type.startsWith("alert.")) {
    return "alert";
  }

  return "directive";
}

function resolveAuditMetadata(
  command: FleetControlCommand
): Record<string, string | number | boolean | null> {
  if (command.type === "zone.create" || command.type === "zone.update") {
    return {
      zoneName: command.zone.name.trim() || "unnamed-zone",
      vertexCount: command.zone.points.length,
    };
  }

  if (command.type === "directive.issue") {
    return {
      shipId: command.shipId,
      directiveType: command.directiveType,
      targetPortId: command.targetPortId ?? null,
      waypointLat: command.waypoint?.lat ?? null,
      waypointLng: command.waypoint?.lng ?? null,
      hasNote: Boolean(command.note?.trim()),
    };
  }

  if (command.type === "directive.accept") {
    return {
      directiveId: command.directiveId,
    };
  }

  if (command.type === "directive.escalate-distress") {
    return {
      directiveId: command.directiveId,
      messageLength: command.distressMessage.length,
    };
  }

  if (command.type === "zone.delete") {
    return {
      zoneId: command.zoneId,
    };
  }

  return {
    alertId: command.alertId,
  };
}

export async function writeOperationalAuditLog(input: WriteOperationalAuditLogInput) {
  await writeAuditLog({
    actorUserId: input.actorUserId ?? null,
    action: resolveAuditAction(input.command),
    targetType: resolveAuditTargetType(input.command),
    targetId:
      input.targetId ??
      (input.command.type === "zone.delete"
        ? input.command.zoneId
        : input.command.type === "alert.acknowledge" || input.command.type === "alert.resolve"
          ? input.command.alertId
          : input.command.type === "directive.accept" ||
              input.command.type === "directive.escalate-distress"
            ? input.command.directiveId
            : null),
    metadata: resolveAuditMetadata(input.command),
  });
}
