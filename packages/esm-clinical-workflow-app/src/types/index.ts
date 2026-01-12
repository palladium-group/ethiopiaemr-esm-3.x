export interface QueueEntry {
  uuid: string;
  patient: {
    uuid: string;
    display?: string;
  };
  visit: {
    uuid: string;
    display?: string;
  };
  status?: {
    uuid: string;
    display?: string;
  };
}
