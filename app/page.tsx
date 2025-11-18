"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, HTMLAttributes, TdHTMLAttributes } from "react";
import {
  Button,
  Card,
  Divider,
  message,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
} from "antd";
import type { ColumnType } from "antd/es/table";
import { CaretUpOutlined, CaretDownOutlined } from "@ant-design/icons";
import type { CapitalFlowEntry } from "@/lib/types/capitalFlow";

type IndexRecord = {
  id: number;
  index_code: string;
  index_name: string;
  price_change_rate?: number | null;
  etf_latest_scales?: number | null;
  turnover?: number | null;
  etf_net_pur_redeem?: number | null;
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

const formatToChineseUnit = (value?: number | null) => {
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

const formatLargeNumber = (value?: number | null) => formatToChineseUnit(value);

const formatDailyTurnover = (value?: number | null) => formatToChineseUnit(value);

const formatSignedChineseUnit = (value?: number | null) => {
  const formatted = formatToChineseUnit(value);
  if (formatted === "--") {
    return "--";
  }
  return `${(value ?? 0) >= 0 ? "+" : ""}${formatted}`;
};

const latestWeekFlow = (record: IndexRecord) => {
  const flow = record.capital_flow_w8?.at(-1);
  if (!flow) return "--";
  const number = flow.week_purchase_redeem;
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
  turnover: (record) => record.turnover ?? null,
  etf_net_pur_redeem: (record) => record.etf_net_pur_redeem ?? null,
  latest_week_flow: (record) =>
    record.capital_flow_w8?.at(-1)?.week_purchase_redeem ?? null,
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
  width: 140,
  render: (_value, record) => (
    <Space
      direction="vertical"
      size={1}
      style={{ width: 120, alignItems: "flex-start" }}
    >
      <Typography.Text
        strong
        ellipsis
        style={{ maxWidth: 120, display: "inline-block" }}
      >
        {record.index_name}
      </Typography.Text>
      <Typography.Text
        type="secondary"
        ellipsis
        style={{ maxWidth: 120, display: "inline-block" }}
      >
        {record.index_code}
      </Typography.Text>
    </Space>
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
        <Typography.Text>{formatDailyTurnover(value)}</Typography.Text>
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
  const [records, setRecords] = useState<IndexRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [lastFetchAt, setLastFetchAt] = useState<string | null>(null);
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

  const sortedFlowRecords = useMemo(
    () => sortRecords(records, flowSortConfig),
    [records, flowSortConfig],
  );
  const sortedValuationRecords = useMemo(
    () => sortRecords(records, valuationSortConfig),
    [records, valuationSortConfig],
  );

  const loadColumnConfigs = useCallback(async () => {
    try {
      const response = await fetch("/api/columns");
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
  }, []);

  useEffect(() => {
    loadColumnConfigs();
  }, [loadColumnConfigs]);

  const loadRecords = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const suffix = date ? `?date=${date}` : "";
      const response = await fetch(`/api/records${suffix}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "拉取数据失败，请稍后重试");
      }
      const payload = await response.json();
      setRecords(payload.data ?? []);
      setAvailableDates(payload.availableDates ?? []);
      setLastFetchAt(payload.lastFetchAt ?? null);
      if (!date) {
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
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const flowColumnConfigs = useMemo(
    () => buildColumnConfigs(columnConfigs, FLOW_COLUMN_KEYS),
    [columnConfigs],
  );
  const valuationColumnConfigs = useMemo(
    () => buildColumnConfigs(columnConfigs, VALUATION_COLUMN_KEYS),
    [columnConfigs],
  );

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    loadRecords(value);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/records/refresh", {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "主动刷新失败");
      }
      const payload = await response.json();
      message.success(`刷新已触发，处理 ${payload.count ?? 0} 条`);
    } catch (error) {
      message.error((error as Error).message || "刷新失败");
    } finally {
      const latestDate = await loadRecords();
      if (latestDate) {
        setSelectedDate(latestDate);
      }
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

  const flowColumns = [nameColumn, ...buildColumns(flowColumnConfigs, "flow")];
  const valuationColumns = [
    nameColumn,
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
          pagination={false}
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
          pagination={false}
          size="small"
          tableLayout="fixed"
          scroll={{ x: "max-content" }}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6fb] py-10">
      <main className="mx-auto w-full max-w-6xl px-4">
        <Card
          style={{ borderRadius: 20, background: "#fff" }}
          bodyStyle={{ padding: "32px" }}
        >
          <Space direction="vertical" size="large" className="w-full">
            <Space
              align="center"
              className="w-full justify-between flex-wrap gap-4"
            >
              <div>
                <Typography.Title level={2}>行业指数洞察</Typography.Title>
                <Typography.Text type="secondary">
                  名称在最左，右侧各列为资金流向或估值指标，点击表头切换排序。
                </Typography.Text>
              </div>
              <Space wrap align="center">
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
                <Typography.Text type="secondary">
                  最近同步：
                  {lastFetchAt ? new Date(lastFetchAt).toLocaleString() : "--"}
                </Typography.Text>
                <Button
                  type="primary"
                  loading={loading}
                  onClick={handleRefresh}
                >
                  手动获取数据
                </Button>
              </Space>
            </Space>
            <Divider />
            <Tabs items={tabItems} type="card" />
          </Space>
        </Card>
      </main>
    </div>
  );
}
