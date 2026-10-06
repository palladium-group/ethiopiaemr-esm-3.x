export interface RadiologyReportTemplate {
  uuid: string;
  display?: string;
  name: string;
  contentJson: string;
  dateCreated?: string;
  dateChanged?: string;
  voided?: boolean;
  voidReason?: string;
}

export interface RadiologyReportTemplatePayload {
  name: string;
  contentJson: string;
}
