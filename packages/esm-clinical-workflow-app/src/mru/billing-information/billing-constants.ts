export const PAYMENT_MODE_UUIDS = {
  CASH: '6aed743e-ab3f-48c1-ba63-0ed5094a3d7b',
  CBHI: '8c3d7d31-3852-4e6c-98e7-199cda1f150a',
  SHI: '27338050-4d36-42ad-9c30-5e1bf5001f96',
  INSURANCE: '07b3594e-13c2-4dcd-85e6-c0fc9d29a440',
  CREDIT_COMPANY: '2245d3b6-f1cc-4713-a935-ec345fb03b72',
  FREE_24_HOURS: '90fbd295-45ee-4272-9cb7-7b9000ee5fa2',
  MOBILE_MONEY: 'ae737650-a72c-4b5e-9fb4-5692e0305408',
  ETH_SWITCH: 'b7c2d4e8-1a9f-4d3c-8e5b-6f0a2c4d8e91',
} as const;

export const EXCLUDED_PAYMENT_MODE_UUIDS = [PAYMENT_MODE_UUIDS.MOBILE_MONEY, PAYMENT_MODE_UUIDS.ETH_SWITCH] as const;

export const INSURANCE_ATTRIBUTE_UUIDS = {
  insuranceId: 'd498a5e1-e7ed-4f6d-98f9-59aa4fb66686',
  insuranceName: 'e0ab3a3a-a8f2-4bc3-b442-cadfea0be3f3',
  insuranceCode: '3c14369b-a1d5-4ebb-a0c8-cb620bbfa0cf',
  insuranceZone: '50e0ce2f-8fa3-43da-9ab0-cd71d7d65c50',
  insuranceExpiryDate: '910e1dd1-a389-4019-95ea-8f0d862780c5',
  accidentDate: '8eb13ec7-4ae6-4755-88c5-3401710f61f0',
  accidentPlace: '6080c9f2-ef30-4d4d-b745-b2c397a4b69b',
  policeOfficerName: 'f16587ff-621c-4972-8923-8abf6df0f365',
  policeOfficerPhone: 'd4351d46-1590-4db2-b7c0-6517784c87d9',
  atFaultDriverPlateNo: '0a693807-43fc-45fc-9467-e1feff1a5998',
} as const;

export const CBHI_ATTRIBUTE_UUIDS = {
  cbhiRegion: '6ce27d93-9595-4296-bb21-de1ff1f4c15e',
  cbhiZone: 'a62cb690-eb52-4aef-b279-70b26735a81f',
  cbhiWoreda: 'd45dc73c-9350-4323-84c3-22d3cfb53564',
  cbhiId: '2333b8ae-732a-4f0f-a192-ae84e1793071',
  cbhiExpiryDate: '77704fac-33eb-4732-acb0-8c2b0b2a256f',
  // Search fields
  id: 'b4382a14-9d76-4615-87ae-c1457fa541f9',
  fullName: 'c242e7cf-a8bc-485a-878e-87bdf36575d3',
  accountNo: '6f5b3f9d-1dc6-4871-be4a-c7c59205ccac',
  membershipType: '935bb6fd-3aa0-4556-b4ec-8e227811579e',
  insuredId: '7dc76b96-e889-48b4-aa26-3e2ac0add8d4',
} as const;

export const SHI_ATTRIBUTE_UUIDS = {
  shiId: 'a30c0244-eba2-41ff-a273-71c168dd57f5',
  shiExpiryDate: '248574a5-a9af-481f-a08e-95b716867bb4',
} as const;

export const CREDIT_COMPANY_ATTRIBUTE_UUIDS = {
  creditCompany: 'c760c7d2-a44e-480c-bc70-623b2a0db264',
} as const;

export const isExcludedPaymentMode = (mode: { uuid?: string; name?: string }): boolean => {
  if (mode.uuid && (EXCLUDED_PAYMENT_MODE_UUIDS as readonly string[]).includes(mode.uuid)) {
    return true;
  }
  const normalized = mode.name?.toLowerCase().replace(/[\s_-]/g, '') || '';
  return normalized === 'mobilemoney' || normalized === 'ethswitch' || normalized === 'ethioswitch';
};

export const isCbhiPaymentMode = (uuid?: string, name?: string): boolean =>
  uuid === PAYMENT_MODE_UUIDS.CBHI || name?.toLowerCase()?.trim() === 'cbhi';

export const isShiPaymentMode = (uuid?: string, name?: string): boolean =>
  uuid === PAYMENT_MODE_UUIDS.SHI || name?.toLowerCase()?.trim() === 'shi';

export const isInsurancePaymentMode = (uuid?: string, name?: string): boolean =>
  uuid === PAYMENT_MODE_UUIDS.INSURANCE || name?.toLowerCase()?.trim() === 'insurance';

export const isCreditCompanyPaymentMode = (uuid?: string, name?: string): boolean => {
  if (uuid === PAYMENT_MODE_UUIDS.CREDIT_COMPANY) {
    return true;
  }
  const normalized = name?.toLowerCase()?.trim();
  return normalized === 'credit company' || normalized === 'credit companies';
};

export const isCreditPaymentMode = (uuid?: string, name?: string): boolean =>
  isCbhiPaymentMode(uuid, name) ||
  isCreditCompanyPaymentMode(uuid, name) ||
  isInsurancePaymentMode(uuid, name) ||
  isShiPaymentMode(uuid, name);

export const hasAttributeValue = (val: unknown): boolean =>
  val !== undefined && val !== null && String(val).trim() !== '';
