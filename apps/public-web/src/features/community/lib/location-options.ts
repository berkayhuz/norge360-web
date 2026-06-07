export type CommunityLocationDistrictOption = {
  label: string;
  value: string;
};

export type CommunityLocationCityOption = {
  label: string;
  value: string;
  districts: CommunityLocationDistrictOption[];
};

export const COMMUNITY_LOCATION_OPTIONS: CommunityLocationCityOption[] = [
  {
    label: "Oslo",
    value: "oslo",
    districts: [
      { label: "Sentrum", value: "sentrum" },
      { label: "Grunerlokka", value: "grunerlokka" },
      { label: "Frogner", value: "frogner" },
      { label: "St. Hanshaugen", value: "st-hanshaugen" },
      { label: "Majorstuen", value: "majorstuen" },
    ],
  },
  {
    label: "Bergen",
    value: "bergen",
    districts: [
      { label: "Bergenhus", value: "bergenhus" },
      { label: "Arstad", value: "arstad" },
      { label: "Fana", value: "fana" },
      { label: "Laksevag", value: "laksevag" },
    ],
  },
  {
    label: "Trondheim",
    value: "trondheim",
    districts: [
      { label: "Midtbyen", value: "midtbyen" },
      { label: "Lerkendal", value: "lerkendal" },
      { label: "Byasen", value: "byasen" },
      { label: "Heimdal", value: "heimdal" },
    ],
  },
  {
    label: "Stavanger",
    value: "stavanger",
    districts: [
      { label: "Eiganes og Valand", value: "eiganes-og-valand" },
      { label: "Hinna", value: "hinna" },
      { label: "Madla", value: "madla" },
      { label: "Storhaug", value: "storhaug" },
    ],
  },
  {
    label: "Tromso",
    value: "tromso",
    districts: [
      { label: "Sentrum", value: "sentrum" },
      { label: "Tromsdalen", value: "tromsdalen" },
      { label: "Kvaloysletta", value: "kvaloysletta" },
      { label: "Breivika", value: "breivika" },
    ],
  },
];

export const DEFAULT_COMMUNITY_LOCATION = {
  city: COMMUNITY_LOCATION_OPTIONS[0]?.value ?? "oslo",
  district: COMMUNITY_LOCATION_OPTIONS[0]?.districts[0]?.value ?? "sentrum",
};

export function getCommunityDistrictOptions(cityValue: string) {
  return COMMUNITY_LOCATION_OPTIONS.find((item) => item.value === cityValue)?.districts ?? [];
}

function normalizeLookup(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function normalizeCommunityCityValue(city?: string | null) {
  const normalized = normalizeLookup(city);
  const byValue = COMMUNITY_LOCATION_OPTIONS.find((item) => item.value === normalized);
  if (byValue) {
    return byValue.value;
  }

  const byLabel = COMMUNITY_LOCATION_OPTIONS.find((item) => normalizeLookup(item.label) === normalized);
  return byLabel?.value ?? city?.trim() ?? DEFAULT_COMMUNITY_LOCATION.city;
}

export function normalizeCommunityDistrictValue(city?: string | null, district?: string | null) {
  const cityOption = COMMUNITY_LOCATION_OPTIONS.find(
    (item) => item.value === normalizeCommunityCityValue(city) || normalizeLookup(item.label) === normalizeLookup(city),
  );
  const normalizedDistrict = normalizeLookup(district);
  const byValue = cityOption?.districts.find((item) => item.value === normalizedDistrict);
  if (byValue) {
    return byValue.value;
  }

  const byLabel = cityOption?.districts.find((item) => normalizeLookup(item.label) === normalizedDistrict);
  return byLabel?.value ?? district?.trim() ?? DEFAULT_COMMUNITY_LOCATION.district;
}

export function getCommunityLocationLabel(city?: string | null, district?: string | null) {
  if (!city || !district) {
    return null;
  }

  const cityOption = COMMUNITY_LOCATION_OPTIONS.find(
    (item) => item.value === normalizeCommunityCityValue(city) || normalizeLookup(item.label) === normalizeLookup(city),
  );
  const districtOption = cityOption?.districts.find(
    (item) => item.value === normalizeCommunityDistrictValue(city, district) || normalizeLookup(item.label) === normalizeLookup(district),
  );

  if (cityOption && districtOption) {
    return `${cityOption.label}/${districtOption.label}`;
  }

  return `${city}/${district}`;
}
