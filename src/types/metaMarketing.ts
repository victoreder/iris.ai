export type MetaAdAccount = {
  id: string;
  name: string;
  accountId: string | null;
  currency: string | null;
};

export type MetaMarketingAd = {
  id: string;
  name: string;
  status: string;
};

export type MetaMarketingAdset = {
  id: string;
  name: string;
  status: string;
  ads: MetaMarketingAd[];
};

export type MetaMarketingCampaign = {
  id: string;
  name: string;
  status: string;
  objective: string | null;
  adsets: MetaMarketingAdset[];
};
