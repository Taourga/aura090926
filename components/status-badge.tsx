import type { PermissionStatus } from "@/lib/types";
import { permissionLabels } from "@/lib/types";

const classes: Record<PermissionStatus, string> = {
  submitted: "badge-info", waiting: "badge-warning", approved: "badge-success", refused: "badge-danger", cancelled: "badge-neutral", departed: "badge-warning", returned: "badge-success",
};

export function StatusBadge({ status }: { status: PermissionStatus }) {
  return <span className={`badge ${classes[status]}`}>{permissionLabels[status]}</span>;
}
