export interface SearchResult {
  id: string; // Wikidata QID
  label: string;
  description?: string;
}

export type OrgKind = 'company' | 'brand';

export interface RelatedOrg {
  id: string;
  label: string;
  logo?: string | null;
  kind: OrgKind;
  typeLabel?: string; // Wikidata "instance of" label, e.g. "perfume brand"
}

export interface CompanyDetails {
  id: string;
  label: string;
  description?: string;
  extract?: string; // Wikipedia summary
  wikipediaUrl?: string;
  website?: string;
  logo?: string | null;
  image?: string | null;
  countries: string[];
  headquarters: string[];
  founded?: string;
  industries: string[];
  founders: string[];
  ceo: string[];
  numEmployees?: string;
  tickers: { exchangeLabel: string; symbol?: string }[];
  isListed: boolean;
  parents: RelatedOrg[];
  shareholders: RelatedOrg[];
  subsidiaries: RelatedOrg[];
  ownedCompanies: RelatedOrg[];
  ownedBrands: RelatedOrg[];
}
