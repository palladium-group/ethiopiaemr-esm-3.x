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
  AddProcedureOrder = 'o3: View Procedure Order',

  // Triage Permissions
  ViewTriage = 'ethiopiaemr: Triage: View Triage',
  AddTriageForm = 'ethiopiaemr: Triage: Add Triage Form',
  TriageRegisterNewPatient = 'ethiopiaemr: Triage: Register Patient',
  ViewAdultTriageDashboard = 'ethiopiaemr: Triage: View Adult Triage Dashboard',
  ViewPediatricTriageDashboard = 'ethiopiaemr: Triage: View Pediatric Triage Dashboard',
  ViewEmergencyTriageDashboard = 'ethiopiaemr: Triage: View Emergency Triage Dashboard',
  ViewGynecologicalTriageDashboard = 'ethiopiaemr: Triage: View Gynecological Triage Dashboard',
  ViewPsychiatryTriageDashboard = 'ethiopiaemr: Triage: View Psychiatry Triage Dashboard',

  // MRU Permissions
  ViewMRU = 'ethiopiaemr: MRU: View MRU',
  EditBillingInformation = 'ethiopiaemr: MRU: Edit Billing Information',
  MRUEditPatient = 'ethiopiaemr: MRU: Edit Patient',

  // Patient Transfer Permissions
  TransferPatient = 'ethiopiaemr: Transfer Patient',

  // Ward / Admission Permissions
  ViewWardDashboard = 'o3: View Ward Dashboard',

  // Clinical Forms Permissions
  ViewClinicalForms = 'o3: View Patient Forms',
}
