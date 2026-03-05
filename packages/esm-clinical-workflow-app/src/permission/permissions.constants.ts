export enum Permissions {
  // Common permissions
  RegisterNewPatient = 'o3: Register Patient',
  EditPatient = 'o3: Edit Patient',

  // Encounter permissions
  ViewEncounter = 'o3: View Encounters',
  EditEncounter = 'o3: Edit Encounters',
  DeleteEncounter = 'o3: Delete Encounters',

  // Visit Note permissions
  ViewVisitNote = 'o3: View Visit Notes',
  AddVisitNote = 'o3: Add Visit Notes',
  EditVisitNote = 'o3: Edit Visit Notes',
  DeleteVisitNote = 'o3: Delete Visit Notes',

  // Order Permissions
  AddDrugOrder = 'o3: View Medication Order Form',
  AddLabOrder = 'o3: View Test Order Form',
  AddImagingOrder = 'o3: View Imaging Order Form',
  AddProcedureOrder = 'o3: View Patient Chart Order Dashboard',

  // Triage Permissions
  ViewTriage = 'ethiopiaemr: Triage: View Triage',
  AddTriageForm = 'ethiopiaemr: Triage: Add Triage Form',

  // MRU Permissions
  ViewMRU = 'ethiopiaemr: MRU: View MRU',
  EditBillingInformation = 'ethiopiaemr: MRU: Edit Billing Information',

  // Patient Transfer Permissions
  TransferPatient = 'ethiopiaemr: Transfer Patient',
}
