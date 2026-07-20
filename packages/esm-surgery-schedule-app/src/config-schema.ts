import { Type } from '@openmrs/esm-framework';
import { ADMISSION_REQUEST_FORM_UUID } from './constants';
import { ElectiveSurgeryPermissions } from './permissions/permissions.constants';

export const configSchema = {
  admissionRequestFormUuid: {
    _type: Type.UUID,
    _description: 'Form resource UUID for viewing elective admission requests.',
    _default: ADMISSION_REQUEST_FORM_UUID,
  },
  viewSchedulePrivilege: {
    _type: Type.String,
    _description: 'Privilege required to view the elective surgery schedule tab and tables.',
    _default: ElectiveSurgeryPermissions.ViewSchedule,
  },
  recordContactPrivilege: {
    _type: Type.String,
    _description: 'Privilege required to record liaison contact outcomes.',
    _default: ElectiveSurgeryPermissions.RecordContact,
  },
  manageSchedulePrivilege: {
    _type: Type.String,
    _description: 'Privilege required to mark ready to admit or return from admission.',
    _default: ElectiveSurgeryPermissions.ManageSchedule,
  },
  removePatientPrivilege: {
    _type: Type.String,
    _description: 'Privilege required to remove patients from the elective surgery schedule.',
    _default: ElectiveSurgeryPermissions.RemovePatient,
  },
};

export interface SurgeryScheduleConfig {
  admissionRequestFormUuid: string;
  viewSchedulePrivilege: string;
  recordContactPrivilege: string;
  manageSchedulePrivilege: string;
  removePatientPrivilege: string;
}
