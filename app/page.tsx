"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, HTMLAttributes, TdHTMLAttributes } from "react";
import {
  Button,
  Card,
  Divider,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Tag,
  Table,
  Tabs,
  Typography,
} from "antd";
import type { ColumnType } from "antd/es/table";
import { CaretUpOutlined, CaretDownOutlined } from "@ant-design/icons";
import type { CapitalFlowEntry } from "@/lib/types/capitalFlow";

type IndexRecord = {
  id: number | string;
  category?: "industry" | "theme" | "etf_index";
  index_code: string;
  index_name: string;
  price_change_rate?: number | null;
  etf_latest_scales?: number | null;
  turnover?: number | null;
  etf_net_pur_redeem?: number | null;
  etf_net_pur_redeem1w?: number | null;
  etf_net_pur_redeem1m?: number | null;
  chg_rate_d5?: number | null;
  chg_rate_m1?: number | null;
  chg_rate_year?: number | null;
  pe_ttm?: number | null;
  pe_ttm_percent_y3?: number | null;
  pb?: number | null;
  pb_percent_y3?: number | null;
  dividend_yield_ratio?: number | null;
  capital_flow_w8?: CapitalFlowEntry[];
  trade_date: string;
  source?: string | null;
};

type ColumnRecord = {
  id: number;
  key: string;
  displayName: string;
  description?: string | null;
  displayOrder: number;
  visible?: boolean;
};

type UserProfile = {
  id: number;
  username: string;
  role: string;
  createdAt: string;
  membershipExpiresAt: string | null;
  hasMembership: boolean;
};

const DEFAULT_COLUMN_CONFIGS: ColumnRecord[] = [
  {
    id: 0,
    key: "price_change_rate",
    displayName: "实时涨幅",
    description: "最新价格变动",
    displayOrder: 1,
  },
  {
    id: 0,
    key: "etf_latest_scales",
    displayName: "ETF规模",
    description: "最新规模",
    displayOrder: 2,
  },
  {
    id: 0,
    key: "turnover",
    displayName: "当日成交额",
    description: "成交额",
    displayOrder: 3,
  },
  {
    id: 0,
    key: "etf_net_pur_redeem",
    displayName: "单日净申赎",
    description: "当日净申赎",
    displayOrder: 4,
  },
  {
    id: 0,
    key: "latest_week_flow",
    displayName: "近一周净申赎",
    description: "近周净申赎",
    displayOrder: 5,
  },
  {
    id: 0,
    key: "etf_net_pur_redeem1m",
    displayName: "近1月净申赎",
    description: "近一月净申赎",
    displayOrder: 6,
  },
  {
    id: 0,
    key: "chg_rate_d5",
    displayName: "近5日涨幅",
    description: "近五日涨幅",
    displayOrder: 7,
  },
  {
    id: 0,
    key: "chg_rate_m1",
    displayName: "近1月涨幅",
    description: "近一月涨幅",
    displayOrder: 8,
  },
  {
    id: 0,
    key: "chg_rate_year",
    displayName: "今年涨幅",
    description: "今年涨幅",
    displayOrder: 9,
  },
  {
    id: 0,
    key: "pe_ttm",
    displayName: "PE",
    description: "市盈率（TTM）",
    displayOrder: 10,
  },
  {
    id: 0,
    key: "pe_ttm_percent_y3",
    displayName: "PE分位",
    description: "PE历史分位",
    displayOrder: 11,
  },
  {
    id: 0,
    key: "pb",
    displayName: "PB",
    description: "市净率",
    displayOrder: 12,
  },
  {
    id: 0,
    key: "pb_percent_y3",
    displayName: "PB分位",
    description: "PB历史分位",
    displayOrder: 13,
  },
  {
    id: 0,
    key: "dividend_yield_ratio",
    displayName: "股息率",
    description: "股息率",
    displayOrder: 14,
  },
  {
    id: 0,
    key: "roe",
    displayName: "ROE",
    description: "净资产收益率（暂无）",
    displayOrder: 15,
  },
];

const FLOW_COLUMN_KEYS = new Set([
  "price_change_rate",
  "etf_latest_scales",
  "turnover",
  "etf_net_pur_redeem",
  "latest_week_flow",
  "etf_net_pur_redeem1m",
  "chg_rate_d5",
  "chg_rate_m1",
  "chg_rate_year",
]);

const VALUATION_COLUMN_KEYS = new Set([
  "price_change_rate",
  "pe_ttm",
  "pe_ttm_percent_y3",
  "roe",
  "pb",
  "pb_percent_y3",
  "dividend_yield_ratio",
  "etf_latest_scales",
  "chg_rate_d5",
  "chg_rate_m1",
  "chg_rate_year",
  "roe",
]);

const toPercent = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }
  const percent = (value * 100).toFixed(2);
  return value > 0 ? `+${percent}%` : `${percent}%`;
};

const formatWithChineseUnits = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }
  const valueInYi = value / 1e8;
  const absValueInYi = Math.abs(valueInYi);
  if (absValueInYi >= 1000) {
    return `${(value / 1e12).toFixed(2)} 万亿`;
  }
  if (absValueInYi >= 1) {
    return `${valueInYi.toFixed(2)} 亿`;
  }
  return `${(value / 1e4).toFixed(2)} 万`;
};

const formatLargeNumber = formatWithChineseUnits;

/**
 * 后端 turnover 单位为「万元」，显示上需要与 etf_latest_scales 一致（按元 → 万/亿/万亿）
 */
const normalizeTurnoverToYuan = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return null;
  }
  // 万元 -> 元
  return value * 1e4;
};

const formatTurnoverFromWanYuan = (value?: number | null) => {
  const normalized = normalizeTurnoverToYuan(value);
  if (normalized === null) {
    return "--";
  }
  return formatWithChineseUnits(normalized);
};

const formatSignedChineseUnit = (value?: number | null) => {
  const formatted = formatWithChineseUnits(value);
  if (formatted === "--") {
    return "--";
  }
  return `${(value ?? 0) >= 0 ? "+" : ""}${formatted}`;
};

const latestWeekFlow = (record: IndexRecord) => {
  const number =
    typeof record.etf_net_pur_redeem1w === "number"
      ? record.etf_net_pur_redeem1w
      : record.capital_flow_w8?.at(-1)?.week_purchase_redeem;
  if (typeof number !== "number" || Number.isNaN(number)) {
    return "--";
  }
  return formatSignedChineseUnit(number);
};

const renderPercentValue = (value?: number | null) => {
  const text = toPercent(value);
  if (text === "--") {
    return <Typography.Text type="secondary">{text}</Typography.Text>;
  }
  const color =
    value && value > 0 ? "#f5222d" : value && value < 0 ? "#52c41a" : undefined;
  return <Typography.Text style={{ color }}>{text}</Typography.Text>;
};

const renderWeekFlowText = (record: IndexRecord) => {
  const text = latestWeekFlow(record);
  return text === "--" ? (
    <Typography.Text type="secondary">{text}</Typography.Text>
  ) : (
    <Typography.Text>{text}</Typography.Text>
  );
};

type SortKey =
  | "price_change_rate"
  | "etf_latest_scales"
  | "turnover"
  | "etf_net_pur_redeem"
  | "latest_week_flow"
  | "etf_net_pur_redeem1m"
  | "chg_rate_d5"
  | "chg_rate_m1"
  | "chg_rate_year"
  | "pe_ttm"
  | "pe_ttm_percent_y3"
  | "pb"
  | "pb_percent_y3"
  | "dividend_yield_ratio"
  | "roe";

type TableSortState = {
  key: SortKey | null;
  order: "asc" | "desc" | null;
};

const sortValueGetters: Record<
  SortKey,
  (record: IndexRecord) => number | string | null
> = {
  price_change_rate: (record) => record.price_change_rate ?? null,
  etf_latest_scales: (record) => record.etf_latest_scales ?? null,
  // 这里也用「元」维度进行抽取，但即使保持万元，排序结果也不会变，只是更语义化
  turnover: (record) => normalizeTurnoverToYuan(record.turnover),
  etf_net_pur_redeem: (record) => record.etf_net_pur_redeem ?? null,
  latest_week_flow: (record) =>
    record.etf_net_pur_redeem1w ??
    record.capital_flow_w8?.at(-1)?.week_purchase_redeem ??
    null,
  etf_net_pur_redeem1m: (record) => record.etf_net_pur_redeem1m ?? null,
  chg_rate_d5: (record) => record.chg_rate_d5 ?? null,
  chg_rate_m1: (record) => record.chg_rate_m1 ?? null,
  chg_rate_year: (record) => record.chg_rate_year ?? null,
  pe_ttm: (record) => record.pe_ttm ?? null,
  pe_ttm_percent_y3: (record) => record.pe_ttm_percent_y3 ?? null,
  pb: (record) => record.pb ?? null,
  pb_percent_y3: (record) => record.pb_percent_y3 ?? null,
  dividend_yield_ratio: (record) => record.dividend_yield_ratio ?? null,
  roe: () => null,
};

type TableType = "flow" | "valuation";

type ColumnConfig = {
  sortKey: SortKey;
  column: ColumnType<IndexRecord>;
};

const COMPACT_COLUMN_WIDTH = 110;

const nameColumn: ColumnType<IndexRecord> = {
  title: "名称",
  dataIndex: "index_name",
  key: "name",
  fixed: "left",
  width: 95,
  render: (_value, record) => (
    <Space
      direction="vertical"
      size={2}
      style={{ width: 70, alignItems: "flex-start" }}
    >
      <Typography.Text
        strong
        ellipsis
        style={{ maxWidth: 70, display: "inline-block" }}
      >
        {record.index_name}
      </Typography.Text>
      {record.category === "etf_index" && (
        <Tag
          color="blue"
          style={{
            marginInlineEnd: 0,
            borderRadius: 999,
            fontSize: 11,
            paddingInline: 6,
            height: 18,
            lineHeight: "16px",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              maxWidth: 64,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "inline-block",
            }}
          >
            {record.index_code}
          </span>
        </Tag>
      )}
    </Space>
  ),
};

const formatMonthDay = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
};

const dateColumn: ColumnType<IndexRecord> = {
  title: "时间",
  dataIndex: "trade_date",
  key: "trade_date",
  fixed: "left",
  width: 95,
  render: (value) => (
    <Typography.Text strong>
      {typeof value === "string" ? formatMonthDay(value) : "--"}
    </Typography.Text>
  ),
};

const COLUMN_METADATA: Record<
  string,
  {
    sortKey: SortKey;
    column: ColumnType<IndexRecord>;
  }
> = {
  price_change_rate: {
    sortKey: "price_change_rate",
    column: {
      dataIndex: "price_change_rate",
      key: "price_change_rate",
      render: (value) => renderPercentValue(value),
    },
  },
  etf_latest_scales: {
    sortKey: "etf_latest_scales",
    column: {
      dataIndex: "etf_latest_scales",
      key: "etf_latest_scales",
      render: (value) => (
        <Typography.Text>{formatLargeNumber(value)}</Typography.Text>
      ),
    },
  },
  turnover: {
    sortKey: "turnover",
    column: {
      dataIndex: "turnover",
      key: "turnover",
      render: (value) => (
        <Typography.Text>{formatTurnoverFromWanYuan(value)}</Typography.Text>
      ),
    },
  },
  etf_net_pur_redeem: {
    sortKey: "etf_net_pur_redeem",
    column: {
      dataIndex: "etf_net_pur_redeem",
      key: "etf_net_pur_redeem",
      render: (value) => (
        <Typography.Text>{formatLargeNumber(value)}</Typography.Text>
      ),
    },
  },
  latest_week_flow: {
    sortKey: "latest_week_flow",
    column: {
      key: "latest_week_flow",
      render: (_value, record) => renderWeekFlowText(record),
    },
  },
  etf_net_pur_redeem1m: {
    sortKey: "etf_net_pur_redeem1m",
    column: {
      dataIndex: "etf_net_pur_redeem1m",
      key: "etf_net_pur_redeem1m",
      render: (value) => (
        <Typography.Text>{formatLargeNumber(value)}</Typography.Text>
      ),
    },
  },
  chg_rate_d5: {
    sortKey: "chg_rate_d5",
    column: {
      dataIndex: "chg_rate_d5",
      key: "chg_rate_d5",
      render: (value) => renderPercentValue(value),
    },
  },
  chg_rate_m1: {
    sortKey: "chg_rate_m1",
    column: {
      dataIndex: "chg_rate_m1",
      key: "chg_rate_m1",
      render: (value) => renderPercentValue(value),
    },
  },
  chg_rate_year: {
    sortKey: "chg_rate_year",
    column: {
      dataIndex: "chg_rate_year",
      key: "chg_rate_year",
      render: (value) => renderPercentValue(value),
    },
  },
  pe_ttm: {
    sortKey: "pe_ttm",
    column: {
      dataIndex: "pe_ttm",
      key: "pe_ttm",
      render: (value) =>
        value === undefined || value === null ? (
          <Typography.Text type="secondary">--</Typography.Text>
        ) : (
          <Typography.Text>{value.toFixed(2)}</Typography.Text>
        ),
    },
  },
  pe_ttm_percent_y3: {
    sortKey: "pe_ttm_percent_y3",
    column: {
      dataIndex: "pe_ttm_percent_y3",
      key: "pe_ttm_percent_y3",
      render: (value) =>
        value === undefined || value === null ? (
          <Typography.Text type="secondary">--</Typography.Text>
        ) : (
          <Typography.Text>{`${(value * 100).toFixed(2)}%`}</Typography.Text>
        ),
    },
  },
  pb: {
    sortKey: "pb",
    column: {
      dataIndex: "pb",
      key: "pb",
      render: (value) =>
        value === undefined || value === null ? (
          <Typography.Text type="secondary">--</Typography.Text>
        ) : (
          <Typography.Text>{value.toFixed(2)}</Typography.Text>
        ),
    },
  },
  pb_percent_y3: {
    sortKey: "pb_percent_y3",
    column: {
      dataIndex: "pb_percent_y3",
      key: "pb_percent_y3",
      render: (value) =>
        value === undefined || value === null ? (
          <Typography.Text type="secondary">--</Typography.Text>
        ) : (
          <Typography.Text>{`${(value * 100).toFixed(2)}%`}</Typography.Text>
        ),
    },
  },
  dividend_yield_ratio: {
    sortKey: "dividend_yield_ratio",
    column: {
      dataIndex: "dividend_yield_ratio",
      key: "dividend_yield_ratio",
      render: (value) =>
        value === undefined || value === null ? (
          <Typography.Text type="secondary">--</Typography.Text>
        ) : (
          <Typography.Text>{`${(value * 100).toFixed(2)}%`}</Typography.Text>
        ),
    },
  },
  roe: {
    sortKey: "roe",
    column: {
      key: "roe",
      render: () => <Typography.Text type="secondary">--</Typography.Text>,
    },
  },
};

const buildColumnConfigs = (
  configs: ColumnRecord[],
  keySet: Set<string>,
): ColumnConfig[] =>
  (configs
    .filter((item) => keySet.has(item.key) && item.visible !== false)
    .sort((a, b) =>
      a.displayOrder === b.displayOrder
        ? a.id - b.id
        : a.displayOrder - b.displayOrder,
    )
    .map((item) => {
      const meta = COLUMN_METADATA[item.key];
      if (!meta) {
        return null;
      }
      return {
        sortKey: meta.sortKey,
        column: {
          ...meta.column,
          title: item.displayName,
          key: item.key,
        },
      };
    })
    .filter(Boolean)) as ColumnConfig[];

const compareValues = (
  a: string | number | null,
  b: string | number | null,
) => {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, "zh-CN");
  }
  return (a as number) - (b as number);
};

const sortRecords = (
  records: IndexRecord[],
  config: TableSortState,
): IndexRecord[] => {
  if (!config.key || !config.order) {
    return records;
  }
  const getter = sortValueGetters[config.key];
  const sorted = [...records].sort((a, b) => {
    const left = getter(a);
    const right = getter(b);
    const base = compareValues(left, right);
    return config.order === "asc" ? base : -base;
  });
  return sorted;
};

export default function Home() {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [centerOpen, setCenterOpen] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [redeemForm] = Form.useForm();
  const [redeemFormCenter] = Form.useForm();
  const [records, setRecords] = useState<IndexRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [lastFetchAt, setLastFetchAt] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchTargetName, setSearchTargetName] = useState<string | null>(null);
  const [category, setCategory] = useState<
    "industry" | "theme" | "etf_index"
  >("industry");
  const [columnConfigs, setColumnConfigs] = useState<ColumnRecord[]>(
    DEFAULT_COLUMN_CONFIGS,
  );

  const [flowSortConfig, setFlowSortConfig] = useState<TableSortState>({
    key: null,
    order: null,
  });
  const [valuationSortConfig, setValuationSortConfig] =
    useState<TableSortState>({
      key: null,
      order: null,
    });

  const handleLogout = useCallback((silent = false) => {
    localStorage.removeItem("userToken");
    setUserToken(null);
    setProfile(null);
    setRecords([]);
    setAvailableDates([]);
    setSelectedDate(null);
    setLastFetchAt(null);
    setSearchMode(false);
    setSearchKeyword("");
    setSearchTargetName(null);
    setCategory("industry");
    if (!silent) {
      message.success("已退出登录");
    }
  }, []);

  const userAuthFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers ?? undefined);
      if (userToken) {
        headers.set("Authorization", `Bearer ${userToken}`);
      }
      const response = await fetch(input, { ...init, headers });
      if (response.status === 401) {
        handleLogout(true);
      }
      return response;
    },
    [userToken, handleLogout]
  );

  const fetchProfile = useCallback(
    async (token?: string) => {
      const currentToken = token ?? userToken;
      if (!currentToken) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const response = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!response.ok) {
        throw new Error("未登录");
      }
      const payload = (await response.json()) as UserProfile;
      setProfile(payload);
      setUserToken(currentToken);
      localStorage.setItem("userToken", currentToken);
    } catch {
      handleLogout(true);
    } finally {
      setProfileLoading(false);
    }
  },
  [handleLogout, userToken]
);

  useEffect(() => {
    const stored = localStorage.getItem("userToken");
    if (stored) {
      fetchProfile(stored);
    } else {
      setProfileLoading(false);
    }
  }, [fetchProfile]);

  const handleAuthSuccess = (token: string, profileData: UserProfile) => {
    localStorage.setItem("userToken", token);
    setUserToken(token);
    setProfile(profileData);
    setAuthModalOpen(false);
    loginForm.resetFields();
    registerForm.resetFields();
  };

  const handleLoginSubmit = async (values: { username: string; password: string }) => {
    setAuthSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "登录失败");
      }
      handleAuthSuccess(payload.token, payload.profile);
      message.success("登录成功");
    } catch (error) {
      message.error((error as Error).message || "登录失败");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (values: {
    username: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error("两次输入的密码不一致");
      return;
    }
    setAuthSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "注册失败");
      }
      handleAuthSuccess(payload.token, payload.profile);
      message.success("注册成功");
    } catch (error) {
      message.error((error as Error).message || "注册失败");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRedeem = async (values: { code: string }, form?: { resetFields: () => void }) => {
    if (!values.code) {
      message.error("请输入激活码");
      return;
    }
    setRedeeming(true);
    try {
      const response = await userAuthFetch("/api/auth/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: values.code }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "兑换失败");
      }
      message.success("兑换成功，会员已更新");
      form?.resetFields();
      setProfile(payload.profile);
    } catch (error) {
      message.error((error as Error).message || "兑换失败");
    } finally {
      setRedeeming(false);
    }
  };

  const sortedFlowRecords = useMemo(
    () => sortRecords(records, flowSortConfig),
    [records, flowSortConfig],
  );
  const sortedValuationRecords = useMemo(
    () => sortRecords(records, valuationSortConfig),
    [records, valuationSortConfig],
  );

  const loadColumnConfigs = useCallback(async () => {
    if (!userToken) return;
    try {
      const response = await userAuthFetch("/api/columns");
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "加载列配置失败");
      }
      const payload = (await response.json()) as ColumnRecord[];
      const sorted = [...payload].sort(
        (a, b) => a.displayOrder - b.displayOrder,
      );
      setColumnConfigs(sorted);
    } catch (error) {
      console.error("加载列配置失败：", error);
      message.error((error as Error).message || "加载列配置失败");
    }
  }, [userAuthFetch, userToken]);

  const loadRecords = useCallback(async (options?: { date?: string; name?: string }) => {
    if (!userToken) return null;
    setLoading(true);
    try {
      const date = options?.date;
      const name = options?.name?.trim() ?? "";
      const params = new URLSearchParams();
      params.set("category", category);
      if (date) {
        params.set("date", date);
      }
      if (name) {
        params.set("name", name);
      }
      const response = await userAuthFetch(
        `/api/records${params.toString() ? `?${params.toString()}` : ""}`,
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        if (payload?.candidates?.length) {
          Modal.info({
            title: payload?.message || "搜索失败",
            content: (
              <div style={{ whiteSpace: "pre-wrap" }}>
                {payload.candidates
                  .map(
                    (item: { indexName: string; indexCode: string }) =>
                      `${item.indexName}（${item.indexCode}）`,
                  )
                  .join("\n")}
              </div>
            ),
          });
        }
        throw new Error(payload?.message || "拉取数据失败，请稍后重试");
      }
      const payload = await response.json();
      const isSearch = payload.mode === "search";
      setSearchMode(isSearch);
      const nextSearchTargetName = isSearch
        ? (payload.searchName ?? (name || null))
        : null;
      setSearchTargetName(nextSearchTargetName);
      setRecords(payload.data ?? []);
      setAvailableDates(payload.availableDates ?? []);
      setLastFetchAt(payload.lastFetchAt ?? null);
      if (!date && !isSearch && !name) {
        setSelectedDate(
          (prev) =>
            prev ?? payload.currentDate ?? payload.availableDates?.[0] ?? null,
        );
      }
      return payload.currentDate ?? payload.availableDates?.[0] ?? null;
    } catch (error) {
      console.error(error);
      message.error((error as Error).message || "获取数据失败");
      return null;
    } finally {
      setLoading(false);
    }
  }, [category, userAuthFetch, userToken]);

  useEffect(() => {
    if (profile?.hasMembership) {
      loadColumnConfigs();
      loadRecords();
    } else {
      setRecords([]);
    }
  }, [profile?.hasMembership, loadColumnConfigs, loadRecords, category]);

  const handleCategoryChange = (next: "industry" | "theme" | "etf_index") => {
    setCategory(next);
    setSelectedDate(null);
    setRecords([]);
    setAvailableDates([]);
    setLastFetchAt(null);
    setSearchMode(false);
    setSearchKeyword("");
    setSearchTargetName(null);
  };

  const flowColumnConfigs = useMemo(
    () => buildColumnConfigs(columnConfigs, FLOW_COLUMN_KEYS),
    [columnConfigs],
  );
  const valuationColumnConfigs = useMemo(
    () => buildColumnConfigs(columnConfigs, VALUATION_COLUMN_KEYS),
    [columnConfigs],
  );

  const handleDateChange = (value: string) => {
    setSearchMode(false);
    setSearchKeyword("");
    setSearchTargetName(null);
    setSelectedDate(value);
    loadRecords({ date: value });
  };

  const handleSearch = async (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      message.warning("请输入要搜索的名称");
      return;
    }
    setSearchKeyword(trimmed);
    await loadRecords({ name: trimmed });
  };

  const handleClearSearch = async () => {
    setSearchMode(false);
    setSearchKeyword("");
    setSearchTargetName(null);
    if (selectedDate) {
      await loadRecords({ date: selectedDate });
    } else {
      await loadRecords();
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("category", category);
      const response = await userAuthFetch(
        `/api/records/refresh?${params.toString()}`,
        {
        method: "POST",
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "主动刷新失败");
      }
      const payload = await response.json();
      if (payload.stored) {
        message.success(`刷新已触发，处理 ${payload.count ?? 0} 条`);
      } else {
        const remoteRecords = payload.data ?? [];
        setRecords(remoteRecords);
        const remoteDate =
          remoteRecords?.[0]?.trade_date?.split("T")[0] ??
          payload.timestamp?.split("T")[0] ??
          selectedDate;
        setSelectedDate(remoteDate ?? null);
        setLastFetchAt(payload.timestamp ?? null);
        message.success(`已获取 ${payload.count ?? remoteRecords.length} 条最新数据（未入库）`);
      }
    } catch (error) {
      message.error((error as Error).message || "刷新失败");
    } finally {
      // 非管理端刷新时不入库，也无需重新从数据库加载
      if (profile?.role === "admin") {
        const latestDate = await loadRecords();
        if (latestDate) {
          setSelectedDate(latestDate);
        }
      }
      setLoading(false);
    }
  };

  const renderSortableTitle = (
    label: string,
    sortKey: SortKey,
    table: TableType,
  ) => {
    const config = table === "flow" ? flowSortConfig : valuationSortConfig;
    const isActive = config.key === sortKey;
    const upActive = isActive && config.order === "asc";
    const downActive = isActive && config.order === "desc";

    return (
      <Space size={4}>
        <span>{label}</span>
        <div className="flex flex-col items-center text-[10px]">
          <CaretUpOutlined
            style={{ color: upActive ? "#1677ff" : "#bfbfbf" }}
          />
          <CaretDownOutlined
            style={{ color: downActive ? "#1677ff" : "#bfbfbf" }}
          />
        </div>
      </Space>
    );
  };

  const handleSortToggle = (table: TableType, key: SortKey) => {
    const setter =
      table === "flow" ? setFlowSortConfig : setValuationSortConfig;
    setter((prev) => {
      if (prev.key === key) {
        const nextOrder =
          prev.order === "asc" ? "desc" : prev.order === "desc" ? null : "asc";
        return nextOrder
          ? { key, order: nextOrder }
          : { key: null, order: null };
      }
      return { key, order: "asc" };
    });
  };

  const sortableHeaderStyle: CSSProperties = {
    cursor: "pointer",
    userSelect: "none",
  };
  const activeColumnHeaderStyle: CSSProperties = {
    backgroundColor: "#fffbea",
  };
  const activeColumnCellStyle: CSSProperties = {
    backgroundColor: "#fffdf3",
  };

  const buildColumns = (
    configs: ColumnConfig[],
    table: TableType,
  ): ColumnType<IndexRecord>[] => {
    const tableSortConfig =
      table === "flow" ? flowSortConfig : valuationSortConfig;
    return configs.map(({ sortKey, column }) => {
      const isActive =
        tableSortConfig.key === sortKey && tableSortConfig.order !== null;
      const baseColumn = {
        ...column,
        width: column.width ?? COMPACT_COLUMN_WIDTH,
        ellipsis: column.ellipsis ?? true,
        align: column.align ?? "right",
      };
      const headerStyle = {
        ...sortableHeaderStyle,
        ...(isActive ? activeColumnHeaderStyle : {}),
      };
      const cellStyle = isActive ? activeColumnCellStyle : undefined;
      return {
        ...baseColumn,
        title: renderSortableTitle(baseColumn.title as string, sortKey, table),
        onHeaderCell: () =>
          ({
            style: headerStyle,
            onClick: () => handleSortToggle(table, sortKey),
          }) satisfies HTMLAttributes<HTMLTableCellElement> &
          TdHTMLAttributes<HTMLTableCellElement>,
        onCell: () => ({
          style: cellStyle,
        }),
      };
    });
  };

  const primaryColumn = searchMode ? dateColumn : nameColumn;
  const flowColumns = [
    primaryColumn,
    ...buildColumns(flowColumnConfigs, "flow"),
  ];
  const valuationColumns = [
    primaryColumn,
    ...buildColumns(valuationColumnConfigs, "valuation"),
  ];

  const tabItems = [
    {
      key: "flow",
      label: "资金流向",
      children: (
        <Table
          bordered
          columns={flowColumns}
          dataSource={sortedFlowRecords}
          loading={loading}
          rowKey="id"
          pagination={searchMode ? { pageSize: 50, showSizeChanger: true } : false}
          size="small"
          tableLayout="fixed"
          scroll={{ x: "max-content" }}
        />
      ),
    },
    {
      key: "valuation",
      label: "估值",
      children: (
        <Table
          bordered
          columns={valuationColumns}
          dataSource={sortedValuationRecords}
          loading={loading}
          rowKey="id"
          pagination={searchMode ? { pageSize: 50, showSizeChanger: true } : false}
          size="small"
          tableLayout="fixed"
          scroll={{ x: "max-content" }}
        />
      ),
    },
  ];

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] py-10">
        <main className="mx-auto w-full max-w-6xl px-4">
          <Card style={{ borderRadius: 20 }}>
            <Typography.Text>正在校验登录状态...</Typography.Text>
          </Card>
          {/* 保持 form 实例已挂载，避免 antd useForm 警告 */}
          <div style={{ display: "none" }}>
            <Form form={loginForm} />
            <Form form={registerForm} />
            <Form form={redeemForm} />
            <Form form={redeemFormCenter} />
          </div>
        </main>
      </div>
    );
  }

  const membershipText =
    profile?.membershipExpiresAt && profile.membershipExpiresAt
      ? new Date(profile.membershipExpiresAt).toLocaleString()
      : profile?.role === "admin"
        ? "管理员"
        : "未激活";

  return (
    <div className="min-h-screen bg-[#f4f6fb] py-10">
      <main className="mx-auto w-full max-w-6xl px-4">
        <Card
          style={{ borderRadius: 20, background: "#fff" }}
          styles={{ body: { padding: 32 } }}
        >
          {!profile && (
            <Space direction="vertical" size="large" className="w-full">
              <Typography.Title level={2}>行业指数洞察</Typography.Title>
              <Typography.Text type="secondary">
                登录后可查看完整资金流向与估值数据。
              </Typography.Text>
              <Space>
                <Button
                  type="primary"
                  onClick={() => {
                    setAuthTab("login");
                    setAuthModalOpen(true);
                  }}
                >
                  登录
                </Button>
                <Button
                  onClick={() => {
                    setAuthTab("register");
                    setAuthModalOpen(true);
                  }}
                >
                  注册
                </Button>
              </Space>
            </Space>
          )}

          {profile && !profile.hasMembership && (
            <Space direction="vertical" size="large" className="w-full">
              <Space
                align="center"
                className="w-full justify-between flex-wrap gap-4"
              >
                <div>
                  <Typography.Title level={2}>会员专属内容</Typography.Title>
                  <Typography.Text type="secondary">
                    您已登录，但当前还不是会员。请先兑换激活码或添加微信购买。
                  </Typography.Text>
                </div>
                <Space>
                  <Button onClick={() => setCenterOpen(true)}>个人中心</Button>
                  <Button danger onClick={() => handleLogout()}>
                    退出登录
                  </Button>
                </Space>
              </Space>
              <Divider />
              <div className="grid gap-8 md:grid-cols-[1.2fr,1fr] items-center">
                <div>
                  <Typography.Title level={4}>立即兑换激活码</Typography.Title>
                  <Form
                    form={redeemForm}
                    layout="vertical"
                    onFinish={(values) => handleRedeem(values, redeemForm)}
                  >
                    <Form.Item
                      label="激活码"
                      name="code"
                      rules={[{ required: true, message: "请输入激活码" }]}
                    >
                      <Input placeholder="输入您获得的激活码" />
                    </Form.Item>
                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={redeeming}
                      >
                        立即激活
                      </Button>
                    </Form.Item>
                  </Form>
                  <Typography.Text type="secondary">
                    还没有激活码？请添加右侧微信获取购买信息。
                  </Typography.Text>
                </div>
                <div className="flex items-center justify-center">
                  <img
                    src="https://avator-1319906908.cos.ap-shanghai.myqcloud.com/gupiao/gupiaowx.png"
                    alt="微信二维码"
                    width={220}
                    height={220}
                    style={{ borderRadius: 12, border: "1px solid #f0f0f0" }}
                  />
                </div>
              </div>
            </Space>
          )}

          {profile?.hasMembership && (
            <Space direction="vertical" size="large" className="w-full">
              <Space
                align="center"
                className="w-full justify-between flex-wrap gap-4"
              >
                <div>
                  <Typography.Title level={2}>
                    {category === "industry"
                      ? "行业指数洞察"
                      : category === "theme"
                        ? "概念指数洞察"
                        : "具体ETF指数"}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    此数据摘取于沪深两市交易所官方数据，次日盘前8点30分更新，该数据不作为投资依据，仅供投资参考。
                  </Typography.Text>
                </div>
                <Space align="center" wrap>
                  <Button onClick={() => setCenterOpen(true)}>个人中心</Button>
                  <Button danger onClick={() => handleLogout()}>
                    退出登录
                  </Button>
                </Space>
              </Space>
              <Space
                align="center"
                className="w-full justify-between flex-wrap gap-4"
              >
                <Space wrap align="center">
                  <Select
                    value={category}
                    options={[
                      { label: "行业", value: "industry" },
                      { label: "概念", value: "theme" },
                      { label: "具体ETF指数", value: "etf_index" },
                    ]}
                    onChange={(value) => handleCategoryChange(value)}
                    style={{ width: 120 }}
                  />
                  <Input.Search
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    onSearch={handleSearch}
                    placeholder="输入名称，搜索历史数据"
                    allowClear
                    style={{ width: 220 }}
                  />
                  {searchMode ? (
                    <>
                      <Typography.Text type="secondary">
                        当前搜索：{searchTargetName ?? searchKeyword}
                      </Typography.Text>
                      <Button onClick={handleClearSearch}>退出搜索</Button>
                    </>
                  ) : (
                    <>
                      <Typography.Text type="secondary">
                        当前数据日期：{selectedDate ?? "--"}
                      </Typography.Text>
                      <Select
                        value={selectedDate ?? undefined}
                        options={availableDates.map((date) => ({
                          label: date,
                          value: date,
                        }))}
                        placeholder="筛选日期"
                        onChange={handleDateChange}
                        style={{ minWidth: 160 }}
                      />
                    </>
                  )}
                  <Typography.Text type="secondary">
                    最近同步：
                    {lastFetchAt
                      ? new Date(lastFetchAt).toLocaleString()
                      : "--"}
                  </Typography.Text>
                </Space>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    columnGap: 12,
                    rowGap: 6,
                    flexWrap: "wrap",
                    minWidth: 0,
                  }}
                >
                  <Button
                    type="primary"
                    loading={loading}
                    onClick={handleRefresh}
                  >
                    手动获取数据
                  </Button>
                  <Typography.Text
                    type="danger"
                    style={{
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    如无法获取，请联系数据维护人员：xique_6789
                  </Typography.Text>
                </div>
              </Space>
              <Divider />
              <Tabs items={tabItems} type="card" />
            </Space>
          )}
        </Card>
      </main>

      <Modal
        title={authTab === "login" ? "登录" : "注册"}
        open={authModalOpen}
        onCancel={() => setAuthModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Tabs
          activeKey={authTab}
          onChange={(key) => setAuthTab(key as "login" | "register")}
          items={[
            {
              key: "login",
              label: "登录",
              children: (
                <Form
                  layout="vertical"
                  form={loginForm}
                  onFinish={handleLoginSubmit}
                >
                  <Form.Item
                    label="用户名"
                    name="username"
                    rules={[{ required: true, message: "请输入用户名" }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label="密码"
                    name="password"
                    rules={[{ required: true, message: "请输入密码" }]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={authSubmitting}
                      block
                    >
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: "register",
              label: "注册",
              children: (
                <Form
                  layout="vertical"
                  form={registerForm}
                  onFinish={handleRegisterSubmit}
                >
                  <Form.Item
                    label="用户名"
                    name="username"
                    rules={[{ required: true, message: "请输入用户名" }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label="密码"
                    name="password"
                    rules={[{ required: true, message: "请输入密码" }]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item
                    label="确认密码"
                    name="confirmPassword"
                    rules={[{ required: true, message: "请再次输入密码" }]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={authSubmitting}
                      block
                    >
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Modal>

      <Drawer
        title="个人中心"
        placement="right"
        width={360}
        onClose={() => setCenterOpen(false)}
        open={centerOpen}
      >
        {profile ? (
          <Space direction="vertical" className="w-full">
            <Typography.Text strong>用户名：{profile.username}</Typography.Text>
            <Typography.Text type="secondary">
              注册时间：{new Date(profile.createdAt).toLocaleString()}
            </Typography.Text>
            <Typography.Text>
              会员状态：
              {profile.hasMembership ? (
                <Tag color="green">有效期至 {membershipText}</Tag>
              ) : (
                <Tag color="red">未开通</Tag>
              )}
            </Typography.Text>
            <Divider />
            <Typography.Title level={5}>兑换激活码</Typography.Title>
            <Form
              form={redeemFormCenter}
              layout="vertical"
              onFinish={(values) => handleRedeem(values, redeemFormCenter)}
            >
              <Form.Item
                label="激活码"
                name="code"
                rules={[{ required: true, message: "请输入激活码" }]}
              >
                <Input placeholder="输入激活码" />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={redeeming}
                  block
                >
                  立即兑换
                </Button>
              </Form.Item>
            </Form>
            <Divider />
            <Button danger onClick={() => handleLogout()}>
              退出登录
            </Button>
          </Space>
        ) : (
          <Typography.Text>请先登录</Typography.Text>
        )}
      </Drawer>
    </div>
  );
}
