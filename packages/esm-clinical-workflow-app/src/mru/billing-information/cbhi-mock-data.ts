export type CbhiFamilyMember = {
  name: string;
  relation: string;
  age: number;
  gender: string;
};

export type CbhiHouseholdHead = {
  name: string;
  age: number;
  gender: string;
  photo_url: string;
  kebele: string;
  region: string;
};

export type CbhiValidityPeriod = {
  start_date: string;
  end_date: string;
  status: string;
};

export type CbhiSchemeDetails = {
  annual_premium_paid: boolean;
  primary_health_center: string;
};

export type CbhiRecord = {
  identification_number: string;
  household_head: CbhiHouseholdHead;
  validity_period: CbhiValidityPeriod;
  family_members: CbhiFamilyMember[];
  scheme_details: CbhiSchemeDetails;
};

// Static CBHI mock data. Once the real API is available this file can be
// replaced by an API client without touching the rest of the UI.
export const cbhiMockData: CbhiRecord[] = [
  {
    identification_number: 'ET/CBHI/AA/2024/88921',
    household_head: {
      name: 'Abebe Bekele',
      age: 42,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_42_abebe.jpg',
      kebele: 'Woreda 03, Kebele 12',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'Expired',
    },
    family_members: [
      {
        name: 'Tigist Assefa',
        relation: 'Spouse',
        age: 38,
        gender: 'Female',
      },
      {
        name: 'Dawit Abebe',
        relation: 'Child',
        age: 14,
        gender: 'Male',
      },
      {
        name: 'Sara Abebe',
        relation: 'Child',
        age: 9,
        gender: 'Female',
      },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Bole Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00001',
    household_head: {
      name: 'Kebede Alemu',
      age: 50,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_50_kebede.jpg',
      kebele: 'Woreda 01, Kebele 05',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'Active',
    },
    family_members: [
      { name: 'Marta Kebede', relation: 'Spouse', age: 45, gender: 'Female' },
      { name: 'Alem Kebede', relation: 'Child', age: 20, gender: 'Male' },
      { name: 'Hanna Kebede', relation: 'Child', age: 17, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Bole Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00002',
    household_head: {
      name: 'Bekele Tadesse',
      age: 39,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_39_bekele.jpg',
      kebele: 'Woreda 02, Kebele 07',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2026-02-01',
      end_date: '2026-11-30',
      status: 'Active',
    },
    family_members: [
      { name: 'Rahel Bekele', relation: 'Spouse', age: 34, gender: 'Female' },
      { name: 'Samuel Bekele', relation: 'Child', age: 10, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Arada Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00003',
    household_head: {
      name: 'Lema Geremew',
      age: 47,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_47_lema.jpg',
      kebele: 'Woreda 04, Kebele 09',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-04-01',
      end_date: '2026-03-31',
      status: 'Active',
    },
    family_members: [
      { name: 'Aster Lema', relation: 'Spouse', age: 43, gender: 'Female' },
      { name: 'Biniam Lema', relation: 'Child', age: 16, gender: 'Male' },
      { name: 'Mahi Lema', relation: 'Child', age: 12, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Yeka Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00004',
    household_head: {
      name: 'Sisay Fekadu',
      age: 36,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_36_sisay.jpg',
      kebele: 'Woreda 05, Kebele 11',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-06-01',
      end_date: '2026-06-01',
      status: 'Active',
    },
    family_members: [
      { name: 'Genet Sisay', relation: 'Spouse', age: 33, gender: 'Female' },
      { name: 'Yonatan Sisay', relation: 'Child', age: 8, gender: 'Male' },
      { name: 'Lidya Sisay', relation: 'Child', age: 5, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Kolfe Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00005',
    household_head: {
      name: 'Mulu Habte',
      age: 55,
      gender: 'Female',
      photo_url: 'https://example.gov.et/photos/f_55_mulu.jpg',
      kebele: 'Woreda 06, Kebele 02',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-09-01',
      end_date: '2026-08-31',
      status: 'Active',
    },
    family_members: [
      { name: 'Hailu Mulu', relation: 'Child', age: 25, gender: 'Male' },
      { name: 'Ruth Hailu', relation: 'Grandchild', age: 3, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Gullele Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00006',
    household_head: {
      name: 'Solomon Getachew',
      age: 44,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_44_solomon.jpg',
      kebele: 'Woreda 07, Kebele 15',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-03-01',
      end_date: '2026-03-15',
      status: 'Active',
    },
    family_members: [
      { name: 'Eden Solomon', relation: 'Spouse', age: 40, gender: 'Female' },
      { name: 'Mikiyas Solomon', relation: 'Child', age: 13, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Akaki Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00007',
    household_head: {
      name: 'Hirut Lemma',
      age: 41,
      gender: 'Female',
      photo_url: 'https://example.gov.et/photos/f_41_hirut.jpg',
      kebele: 'Woreda 08, Kebele 04',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-11-01',
      end_date: '2026-10-31',
      status: 'Active',
    },
    family_members: [
      { name: 'Abel Tamiru', relation: 'Spouse', age: 46, gender: 'Male' },
      { name: 'Selam Abel', relation: 'Child', age: 9, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Kotebe Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00008',
    household_head: {
      name: 'Tesfaye Worku',
      age: 48,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_48_tesfaye.jpg',
      kebele: 'Woreda 09, Kebele 08',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-05-01',
      end_date: '2026-05-01',
      status: 'Active',
    },
    family_members: [
      { name: 'Meselech Tesfaye', relation: 'Spouse', age: 43, gender: 'Female' },
      { name: 'Nahom Tesfaye', relation: 'Child', age: 18, gender: 'Male' },
      { name: 'Sara Tesfaye', relation: 'Child', age: 15, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Kazanchis Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00009',
    household_head: {
      name: 'Meron Tsegaye',
      age: 37,
      gender: 'Female',
      photo_url: 'https://example.gov.et/photos/f_37_meron.jpg',
      kebele: 'Woreda 10, Kebele 03',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-08-01',
      end_date: '2026-07-31',
      status: 'Active',
    },
    family_members: [
      { name: 'Dagmawi Meron', relation: 'Child', age: 11, gender: 'Male' },
      { name: 'Abigail Meron', relation: 'Child', age: 7, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'CMC Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00010',
    household_head: {
      name: 'Abrham Adane',
      age: 46,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_46_abrham.jpg',
      kebele: 'Woreda 11, Kebele 06',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2026-01-15',
      end_date: '2026-12-14',
      status: 'Active',
    },
    family_members: [
      { name: 'Lulit Abrham', relation: 'Spouse', age: 42, gender: 'Female' },
      { name: 'Mahi Abrham', relation: 'Child', age: 13, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Piassa Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2025/00011',
    household_head: {
      name: 'Dereje Fikre',
      age: 52,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_52_dereje.jpg',
      kebele: 'Woreda 01, Kebele 10',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      status: 'Expired',
    },
    family_members: [
      { name: 'Seble Dereje', relation: 'Spouse', age: 49, gender: 'Female' },
      { name: 'Bethel Dereje', relation: 'Child', age: 21, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Bole Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00012',
    household_head: {
      name: 'Girma Mekonnen',
      age: 60,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_60_girma.jpg',
      kebele: 'Woreda 02, Kebele 04',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-12-01',
      end_date: '2026-11-30',
      status: 'Active',
    },
    family_members: [
      { name: 'Selamawit Girma', relation: 'Spouse', age: 55, gender: 'Female' },
      { name: 'Nahom Girma', relation: 'Child', age: 23, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Arada Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00013',
    household_head: {
      name: 'Fikirte Alemayehu',
      age: 35,
      gender: 'Female',
      photo_url: 'https://example.gov.et/photos/f_35_fikirte.jpg',
      kebele: 'Woreda 03, Kebele 09',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2026-02-01',
      end_date: '2027-01-31',
      status: 'Active',
    },
    family_members: [
      { name: 'Biniyam Bekele', relation: 'Spouse', age: 38, gender: 'Male' },
      { name: 'Nathan Biniyam', relation: 'Child', age: 4, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Yeka Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00014',
    household_head: {
      name: 'Haile Tesema',
      age: 49,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_49_haile.jpg',
      kebele: 'Woreda 04, Kebele 01',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-10-01',
      end_date: '2026-09-30',
      status: 'Active',
    },
    family_members: [
      { name: 'Wubit Haile', relation: 'Spouse', age: 45, gender: 'Female' },
      { name: 'Tomas Haile', relation: 'Child', age: 19, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Kolfe Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00015',
    household_head: {
      name: 'Yared Getu',
      age: 33,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_33_yared.jpg',
      kebele: 'Woreda 05, Kebele 03',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2026-01-10',
      end_date: '2026-12-09',
      status: 'Active',
    },
    family_members: [
      { name: 'Mekdes Yared', relation: 'Spouse', age: 30, gender: 'Female' },
      { name: 'Robel Yared', relation: 'Child', age: 6, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Gullele Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2024/00016',
    household_head: {
      name: 'Tesema Daba',
      age: 58,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_58_tesema.jpg',
      kebele: 'Woreda 06, Kebele 12',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2024-02-01',
      end_date: '2024-12-31',
      status: 'Expired',
    },
    family_members: [
      { name: 'Saba Tesema', relation: 'Spouse', age: 54, gender: 'Female' },
      { name: 'Dawit Tesema', relation: 'Child', age: 26, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: false,
      primary_health_center: 'Akaki Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00017',
    household_head: {
      name: 'Biruk Yohannes',
      age: 40,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_40_biruk.jpg',
      kebele: 'Woreda 07, Kebele 14',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-07-01',
      end_date: '2026-06-30',
      status: 'Active',
    },
    family_members: [
      { name: 'Rediet Biruk', relation: 'Spouse', age: 36, gender: 'Female' },
      { name: 'Nathan Biruk', relation: 'Child', age: 8, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Kotebe Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00018',
    household_head: {
      name: 'Mahlet Abera',
      age: 38,
      gender: 'Female',
      photo_url: 'https://example.gov.et/photos/f_38_mahlet.jpg',
      kebele: 'Woreda 08, Kebele 06',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-09-15',
      end_date: '2026-09-14',
      status: 'Active',
    },
    family_members: [
      { name: 'Kalkidan Haile', relation: 'Spouse', age: 42, gender: 'Male' },
      { name: 'Beza Kalkidan', relation: 'Child', age: 10, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Kazanchis Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00019',
    household_head: {
      name: 'Daniel Bekele',
      age: 45,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_45_daniel.jpg',
      kebele: 'Woreda 09, Kebele 01',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-11-01',
      end_date: '2026-10-31',
      status: 'Active',
    },
    family_members: [
      { name: 'Senait Daniel', relation: 'Spouse', age: 41, gender: 'Female' },
      { name: 'Abel Daniel', relation: 'Child', age: 15, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'CMC Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00020',
    household_head: {
      name: 'Saron Hailu',
      age: 32,
      gender: 'Female',
      photo_url: 'https://example.gov.et/photos/f_32_saron.jpg',
      kebele: 'Woreda 10, Kebele 05',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2026-01-20',
      end_date: '2027-01-19',
      status: 'Active',
    },
    family_members: [
      { name: 'Henok Taye', relation: 'Spouse', age: 36, gender: 'Male' },
      { name: 'Sara Henok', relation: 'Child', age: 2, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Piassa Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00021',
    household_head: {
      name: 'Mekonnen Girma',
      age: 53,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_53_mekonnen.jpg',
      kebele: 'Woreda 11, Kebele 08',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-04-01',
      end_date: '2026-03-31',
      status: 'Active',
    },
    family_members: [
      { name: 'Alem Mekonnen', relation: 'Spouse', age: 49, gender: 'Female' },
      { name: 'Yonas Mekonnen', relation: 'Child', age: 22, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Bole Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2025/00022',
    household_head: {
      name: 'Yeshiwork Taye',
      age: 57,
      gender: 'Female',
      photo_url: 'https://example.gov.et/photos/f_57_yeshiwork.jpg',
      kebele: 'Woreda 01, Kebele 02',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-02-01',
      end_date: '2025-12-31',
      status: 'Expired',
    },
    family_members: [{ name: 'Hailemichael Yeshi', relation: 'Child', age: 28, gender: 'Male' }],
    scheme_details: {
      annual_premium_paid: false,
      primary_health_center: 'Arada Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00023',
    household_head: {
      name: 'Sisay Abera',
      age: 43,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_43_sisay.jpg',
      kebele: 'Woreda 02, Kebele 06',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-06-01',
      end_date: '2026-05-31',
      status: 'Active',
    },
    family_members: [
      { name: 'Elshaday Sisay', relation: 'Spouse', age: 39, gender: 'Female' },
      { name: 'Martha Sisay', relation: 'Child', age: 12, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Yeka Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00024',
    household_head: {
      name: 'Abayneh Tadesse',
      age: 38,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_38_abayneh.jpg',
      kebele: 'Woreda 03, Kebele 11',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-09-01',
      end_date: '2026-08-31',
      status: 'Active',
    },
    family_members: [
      { name: 'Hanna Abayneh', relation: 'Spouse', age: 34, gender: 'Female' },
      { name: 'Nahom Abayneh', relation: 'Child', age: 7, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Kolfe Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00025',
    household_head: {
      name: 'Beletech Fisseha',
      age: 42,
      gender: 'Female',
      photo_url: 'https://example.gov.et/photos/f_42_beletech.jpg',
      kebele: 'Woreda 04, Kebele 10',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-11-01',
      end_date: '2026-10-31',
      status: 'Active',
    },
    family_members: [
      { name: 'Hagos Abera', relation: 'Spouse', age: 46, gender: 'Male' },
      { name: 'Kena Hagos', relation: 'Child', age: 14, gender: 'Female' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Gullele Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00026',
    household_head: {
      name: 'Robel Tsegaw',
      age: 30,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_30_robel.jpg',
      kebele: 'Woreda 05, Kebele 01',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'Active',
    },
    family_members: [
      { name: 'Sosina Robel', relation: 'Spouse', age: 27, gender: 'Female' },
      { name: 'Nathan Robel', relation: 'Child', age: 1, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Akaki Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00027',
    household_head: {
      name: 'Hirut Bekele',
      age: 48,
      gender: 'Female',
      photo_url: 'https://example.gov.et/photos/f_48_hirut.jpg',
      kebele: 'Woreda 06, Kebele 09',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-03-01',
      end_date: '2026-02-28',
      status: 'Active',
    },
    family_members: [{ name: 'Fikadu Hirut', relation: 'Child', age: 19, gender: 'Male' }],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Kotebe Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00028',
    household_head: {
      name: 'Nahom Asfaw',
      age: 36,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_36_nahom.jpg',
      kebele: 'Woreda 07, Kebele 07',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-05-01',
      end_date: '2026-04-30',
      status: 'Active',
    },
    family_members: [
      { name: 'Elena Nahom', relation: 'Spouse', age: 33, gender: 'Female' },
      { name: 'Noah Nahom', relation: 'Child', age: 5, gender: 'Male' },
    ],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Kazanchis Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2025/00029',
    household_head: {
      name: 'Getahun Dagne',
      age: 59,
      gender: 'Male',
      photo_url: 'https://example.gov.et/photos/m_59_getahun.jpg',
      kebele: 'Woreda 08, Kebele 02',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      status: 'Expired',
    },
    family_members: [{ name: 'Askale Getahun', relation: 'Spouse', age: 55, gender: 'Female' }],
    scheme_details: {
      annual_premium_paid: false,
      primary_health_center: 'CMC Health Center',
    },
  },
  {
    identification_number: 'ET/CBHI/AA/2026/00030',
    household_head: {
      name: 'Lulit Kebede',
      age: 29,
      gender: 'Female',
      photo_url: 'https://example.gov.et/photos/f_29_lulit.jpg',
      kebele: 'Woreda 09, Kebele 10',
      region: 'Addis Ababa',
    },
    validity_period: {
      start_date: '2026-02-15',
      end_date: '2027-02-14',
      status: 'Active',
    },
    family_members: [{ name: 'Biruk Tadesse', relation: 'Spouse', age: 31, gender: 'Male' }],
    scheme_details: {
      annual_premium_paid: true,
      primary_health_center: 'Piassa Health Center',
    },
  },
];
