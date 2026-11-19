import { DroneStatus } from '../api.service';
import { TextKey } from '../i18n.service';

/** The text key of a drone status, so every page names the three states the same way (REQ-002, REQ-024). */
export function statusKey(status: DroneStatus): TextKey {
  switch (status) {
    case 'Loaned':
      return 'status.loaned';
    case 'Defective':
      return 'status.defective';
    default:
      return 'status.available';
  }
}
