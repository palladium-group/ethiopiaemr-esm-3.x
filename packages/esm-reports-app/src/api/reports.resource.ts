import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';

export interface ReportSummary {
  uuid: string;
  name: string;
  description: string | null;
  indicator: boolean;
}

export type GroupedReports = Record<string, Array<ReportSummary>>;

export interface ReportParameter {
  name: string;
  label: string;
  type: string;
}

export interface ReportDesign {
  uuid: string;
  name: string;
}

export interface ReportDefinition {
  uuid: string;
  name: string;
  description: string | null;
  indicator: boolean;
  parameters: Array<ReportParameter>;
  designs: Array<ReportDesign>;
}

// These are legacy module fragment actions served directly by the servlet container,
// not REST resources — intentionally omitting restBaseUrl. The proxy must allow these paths.
const GROUPED_REPORTS_URL = '/ethiopiaemrreports/report/reportUtils/getGroupedReports.action';
const REPORT_DETAILS_URL = '/ethiopiaemrreports/report/reportUtils/getReportDetails.action';

/**
 * Fetches the EthiopiaEMR reports grouped by category (Common, Cohort Analysis,
 * EHR Reports) from the legacy module's fragment action. The categories live only
 * in the Java ReportManager, so this dedicated endpoint is the only source for them.
 */
export function useGroupedReports() {
  const { data, error, isLoading } = useSWR<{ data: GroupedReports }, Error>(GROUPED_REPORTS_URL, openmrsFetch);

  return {
    groupedReports: data?.data ?? {},
    isLoading,
    error,
  };
}

/**
 * Fetches a single report's details (parameters + available rendering designs)
 * from the legacy module action. That action also persists the report definition
 * so reportingrest can subsequently evaluate it — mirroring the old GSP page load.
 *
 * reportingrest's own reportDefinition resource omits designs, which is why this
 * goes through the module action instead.
 */
export function useReportDefinition(reportUuid: string | undefined) {
  const url = reportUuid ? `${REPORT_DETAILS_URL}?reportUuid=${encodeURIComponent(reportUuid)}` : null;
  const { data, error, isLoading } = useSWR<{ data: ReportDefinition }, Error>(url, openmrsFetch);

  return {
    reportDefinition: data?.data ?? null,
    isLoading,
    error,
  };
}
