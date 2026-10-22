// Official Qatar government sources users can open to check the figures themselves.
// Checked 2026-10-22: the Ministry of Labour pages load in English and Arabic; the Al Meezan
// address is the Labour Law (LawID 3961) entry on the Ministry of Justice legal portal.

export interface OfficialLinks {
  ministry: string;
  complaint: string;
  law: string;
}

export function officialLinks(lang: string): OfficialLinks {
  const l = lang === 'ar' ? 'ar' : 'en';
  return {
    ministry: 'https://www.mol.gov.qa/',
    complaint: `https://www.mol.gov.qa/${l}/contactus/Pages/ComplaintsAndSuggestions.aspx`,
    law: `https://www.almeezan.qa/LawView.aspx?opt&LawID=3961&language=${l}`,
  };
}
