import type { IndexData, Prisma } from "@prisma/client";
import type { CapitalFlowEntry } from "@/lib/types/capitalFlow";
import prisma from "@/lib/prisma";

const REMOTE_API_URL =
  process.env.REMOTE_API_URL ??
  "https://mg.go-goal.cn/api/v1/ft_fin_app_etf_plate/indthmbro_stat?type=3%2C4&page=1&rows=1000&order=price_change_rate&order_type=1";

const REQUEST_HEADERS = {
  accept: "*/*",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  "content-type": "application/x-www-form-urlencoded",
  cookie:
    "sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%2219a85016aaa168b-09b6e32258128a8-1d525631-1484784-19a85016aab2012%22%2C%22first_id%22%3A%22%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTlhODUwMTZhYWExNjhiLTA5YjZlMzIyNTgxMjhhOC0xZDUyNTYzMS0xNDg0Nzg0LTE5YTg1MDE2YWFiMjAxMiJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%22%2C%22value%22%3A%22%22%7D%7D; acw_tc=1a142a8617634336968401675e310e0014be816bf852fe9d82bc4b29896662",
  dnt: "1",
  priority: "u=1, i",
  referer: "https://mg.go-goal.cn/etf/pages/index-analysis?gogoalbar=0&keyword=",
  "sec-ch-ua": '"Not_A Brand";v="99", "Chromium";v="142"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
};

const COLUMN_CONFIGS = [
  {
    key: "price_change_rate",
    displayName: "实时涨幅",
    description: "最新价格变动",
    displayOrder: 1,
  },
  {
    key: "etf_latest_scales",
    displayName: "ETF规模",
    description: "最新规模",
    displayOrder: 2,
  },
  {
    key: "turnover",
    displayName: "当日成交额",
    description: "成交额",
    displayOrder: 3,
  },
  {
    key: "etf_net_pur_redeem",
    displayName: "单日净申赎",
    description: "当日净申赎",
    displayOrder: 4,
  },
  {
    key: "latest_week_flow",
    displayName: "近一周净申赎",
    description: "近周净申赎",
    displayOrder: 5,
  },
  {
    key: "etf_net_pur_redeem1m",
    displayName: "近1月净申赎",
    description: "近一月净申赎",
    displayOrder: 6,
  },
  {
    key: "chg_rate_d5",
    displayName: "近5日涨幅",
    description: "近五日涨幅",
    displayOrder: 7,
  },
  {
    key: "chg_rate_m1",
    displayName: "近1月涨幅",
    description: "近一月涨幅",
    displayOrder: 8,
  },
  {
    key: "chg_rate_year",
    displayName: "今年涨幅",
    description: "今年涨幅",
    displayOrder: 9,
  },
  {
    key: "pe_ttm",
    displayName: "PE",
    description: "市盈率（TTM）",
    displayOrder: 10,
  },
  {
    key: "pe_ttm_percent_y3",
    displayName: "PE分位",
    description: "PE历史分位",
    displayOrder: 11,
  },
  {
    key: "pb",
    displayName: "PB",
    description: "市净率",
    displayOrder: 12,
  },
  {
    key: "pb_percent_y3",
    displayName: "PB分位",
    description: "PB历史分位",
    displayOrder: 13,
  },
  {
    key: "dividend_yield_ratio",
    displayName: "股息率",
    description: "股息率",
    displayOrder: 14,
  },
  {
    key: "roe",
    displayName: "ROE",
    description: "净资产收益率（暂无）",
    displayOrder: 15,
  },
];

type RemoteNumberValue = number | string | null | undefined;

type RemoteRecord = {
  index_code: string;
  index_name: string;
  source?: string | null;
  index_source?: string | null;
  trade_date?: string | null;
  tradeDate?: string | null;
  price_change_rate?: RemoteNumberValue;
  priceChangeRate?: RemoteNumberValue;
  etf_latest_scales?: RemoteNumberValue;
  etfLatestScales?: RemoteNumberValue;
  turnover?: RemoteNumberValue;
  etf_net_pur_redeem?: RemoteNumberValue;
  etfNetPurRedeem?: RemoteNumberValue;
  etf_net_pur_redeem1m?: RemoteNumberValue;
  chg_rate_d5?: RemoteNumberValue;
  chg_rate_m1?: RemoteNumberValue;
  chg_rate_year?: RemoteNumberValue;
  pe_ttm?: RemoteNumberValue;
  pe_ttm_percent_y3?: RemoteNumberValue;
  pb?: RemoteNumberValue;
  pb_percent_y3?: RemoteNumberValue;
  dividend_yield_ratio?: RemoteNumberValue;
  capital_flow_w8?: CapitalFlowEntry[] | Prisma.JsonValue | null;
  capitalFlowW8?: CapitalFlowEntry[] | Prisma.JsonValue | null;
} & Record<string, unknown>;

type RemoteApiResponse = {
  data?: {
    records?: RemoteRecord[];
  };
};

const fetchRemoteRecordsFromApi = async () => {
  const response = await fetch(REMOTE_API_URL, {
    method: "GET",
    headers: REQUEST_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "远程接口异常");
  }

  const payload = (await response.json()) as RemoteApiResponse;
  return (payload.data?.records ?? []) as RemoteRecord[];
};

const buildIndexDataBaseFields = (item: RemoteRecord) => ({
  indexName: item.index_name,
  source: item.source ?? item.index_source ?? "SW",
  priceChangeRate: safeNumber(item.price_change_rate ?? item.priceChangeRate),
  etfLatestScales: safeNumber(item.etf_latest_scales ?? item.etfLatestScales),
  turnover: safeNumber(item.turnover),
  etfNetPurRedeem: safeNumber(item.etf_net_pur_redeem ?? item.etfNetPurRedeem),
  etfNetPurRedeem1m: safeNumber(item.etf_net_pur_redeem1m),
  chgRateD5: safeNumber(item.chg_rate_d5),
  chgRateM1: safeNumber(item.chg_rate_m1),
  chgRateYear: safeNumber(item.chg_rate_year),
  peTtm: safeNumber(item.pe_ttm),
  peTtmPercentY3: safeNumber(item.pe_ttm_percent_y3),
  pb: safeNumber(item.pb),
  pbPercentY3: safeNumber(item.pb_percent_y3),
  dividendYieldRatio: safeNumber(item.dividend_yield_ratio),
  capitalFlowW8: item.capital_flow_w8 ?? item.capitalFlowW8 ?? [],
  rawData: item,
});

export const formatDateKey = (date: Date) => date.toISOString().split("T")[0];

export const normalizeTradeDate = (value: string | Date | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

const safeNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeCapitalFlowEntries = (value: Prisma.JsonValue | null): CapitalFlowEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: CapitalFlowEntry[] = [];
  value.forEach((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return;
    }
    const candidate = entry as Record<string, unknown>;
    entries.push({
      statistic_date:
        typeof candidate.statistic_date === "string"
          ? candidate.statistic_date
          : undefined,
      week_purchase_redeem: safeNumber(candidate.week_purchase_redeem),
    });
  });
  return entries;
};

export const mapIndexData = (record: IndexData) => ({
  id: record.id,
  index_code: record.indexCode,
  index_name: record.indexName,
  source: record.source,
  trade_date: record.tradeDate.toISOString(),
  price_change_rate: record.priceChangeRate,
  etf_latest_scales: record.etfLatestScales,
  turnover: record.turnover,
  etf_net_pur_redeem: record.etfNetPurRedeem,
  etf_net_pur_redeem1m: record.etfNetPurRedeem1m,
  chg_rate_d5: record.chgRateD5,
  chg_rate_m1: record.chgRateM1,
  chg_rate_year: record.chgRateYear,
  pe_ttm: record.peTtm,
  pe_ttm_percent_y3: record.peTtmPercentY3,
  pb: record.pb,
  pb_percent_y3: record.pbPercentY3,
  dividend_yield_ratio: record.dividendYieldRatio,
  capital_flow_w8: normalizeCapitalFlowEntries(record.capitalFlowW8),
});

const upsertColumnNames = async () => {
  await Promise.all(
    COLUMN_CONFIGS.map((column) =>
      prisma.columnName.upsert({
        where: { key: column.key },
        update: {
          displayName: column.displayName,
          description: column.description,
          displayOrder: column.displayOrder,
        },
        create: column,
      })
    )
  );
};

export const refreshRemoteRecords = async () => {
  const records = await fetchRemoteRecordsFromApi();

  await Promise.all([
    upsertColumnNames(),
    ...records.map(async (item) => {
      const tradeDateRaw = normalizeTradeDate(item.trade_date ?? item.tradeDate);
      if (!tradeDateRaw) {
        return;
      }
      const baseFields = buildIndexDataBaseFields(item);
      await prisma.indexData.upsert({
        where: {
          indexCode_tradeDate: {
            indexCode: item.index_code,
            tradeDate: tradeDateRaw,
          },
        },
        create: {
          indexCode: item.index_code,
          tradeDate: tradeDateRaw,
          ...baseFields,
        },
        update: baseFields,
      });
    }),
  ]);

  return records.length;
};

export const fetchRemoteRecords = async () => {
  const records = await fetchRemoteRecordsFromApi();
  const mapped = records
    .map((item, index) => {
      const tradeDateRaw = normalizeTradeDate(item.trade_date ?? item.tradeDate);
      if (!tradeDateRaw) {
        return null;
      }
      return {
        id: index + 1,
        index_code: item.index_code,
        index_name: item.index_name,
        source: item.source ?? item.index_source ?? "SW",
        trade_date: tradeDateRaw.toISOString(),
        price_change_rate: safeNumber(item.price_change_rate ?? item.priceChangeRate),
        etf_latest_scales: safeNumber(item.etf_latest_scales ?? item.etfLatestScales),
        turnover: safeNumber(item.turnover),
        etf_net_pur_redeem: safeNumber(item.etf_net_pur_redeem ?? item.etfNetPurRedeem),
        etf_net_pur_redeem1m: safeNumber(item.etf_net_pur_redeem1m),
        chg_rate_d5: safeNumber(item.chg_rate_d5),
        chg_rate_m1: safeNumber(item.chg_rate_m1),
        chg_rate_year: safeNumber(item.chg_rate_year),
        pe_ttm: safeNumber(item.pe_ttm),
        pe_ttm_percent_y3: safeNumber(item.pe_ttm_percent_y3),
        pb: safeNumber(item.pb),
        pb_percent_y3: safeNumber(item.pb_percent_y3),
        dividend_yield_ratio: safeNumber(item.dividend_yield_ratio),
        capital_flow_w8: normalizeCapitalFlowEntries(
          (item.capital_flow_w8 ?? item.capitalFlowW8 ?? []) as Prisma.JsonValue
        ),
      };
    })
    .filter(Boolean);

  return mapped as ReturnType<typeof mapIndexData>[];
};
