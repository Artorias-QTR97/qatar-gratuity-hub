// Money-transfer providers shown in the "Send money home" section.
// To earn commission, replace `url` with the network-issued affiliate link and set `isAffiliate: true`;
// the affiliate disclosure appears automatically when any shown partner is an affiliate.
// Only list providers confirmed to accept QAR-funded transfers from Qatar residents (LEGAL-VERIFY.md B1).

export interface Partner {
  id: string;
  name: string;
  url: string;
  /** Currencies the provider is confirmed to send to from Qatar. */
  corridors: string[];
  qatarSenderSupport: 'confirmed' | 'unconfirmed';
  confirmedOn?: string;
  maxPerTransferQAR?: number;
  isAffiliate: boolean;
}

export const CURRENCIES = ['INR', 'PKR', 'NPR', 'BDT', 'PHP', 'LKR', 'EGP', 'KES', 'USD', 'GBP', 'EUR'] as const;

export const PARTNERS: Partner[] = [
  {
    id: 'western-union',
    name: 'Western Union',
    url: 'https://www.westernunion.com/qa/en/home.html',
    corridors: [...CURRENCIES],
    qatarSenderSupport: 'confirmed',
    confirmedOn: '2026-10-22',
    maxPerTransferQAR: 34_500,
    isAffiliate: false,
  },
  {
    id: 'worldremit',
    name: 'WorldRemit',
    url: 'https://www.worldremit.com/',
    corridors: ['INR', 'PHP', 'KES'],
    qatarSenderSupport: 'confirmed',
    confirmedOn: '2026-10-22',
    isAffiliate: false,
  },
  {
    id: 'wise',
    name: 'Wise',
    url: 'https://wise.com/',
    corridors: [],
    qatarSenderSupport: 'unconfirmed',
    isAffiliate: false,
  },
  {
    id: 'remitly',
    name: 'Remitly',
    url: 'https://www.remitly.com/',
    corridors: [],
    qatarSenderSupport: 'unconfirmed',
    isAffiliate: false,
  },
];

export function partnersFor(currency: string): Partner[] {
  return PARTNERS.filter((p) => p.qatarSenderSupport === 'confirmed' && p.corridors.includes(currency));
}
