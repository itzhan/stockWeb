"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Button,
  Card,
  Divider,
  message,
  Space,
  Table,
  Tabs,
  Typography,
} from "antd";
import type { ColumnType, ColumnsType } from "antd/es/table";
import { CaretUpOutlined, CaretDownOutlined } from "@ant-design/icons";

type CapitalFlowEntry = {
  statistic_date: string;
  week_purchase_redeem: number;
};

type IndexRecord = {
  id: number;
  index_code: string;
  index_name: string;
  price_change_rate: number;
  etf_latest_scales: number;
  turnover: number;
  etf_net_pur_redeem: number;
  etf_net_pur_redeem1w: number;
  etf_net_pur_redeem1m: number;
  chg_rate_d5: number;
  chg_rate_m1: number;
  chg_rate_year: number;
  pe_ttm: number;
  pe_ttm_percent_y3: number;
  pb: number;
  pb_percent_y3: number;
  dividend_yield_ratio: number;
  capital_flow_w8: CapitalFlowEntry[];
  trade_date: string;
  source: string;
  index_type: string;
};

const MOCK_RECORDS: IndexRecord[] = [
  {
    id: 74,
    index_code: "801081",
    index_name: "半导体",
    price_change_rate: -0.035751026956252666,
    etf_latest_scales: 353841454307,
    turnover: 1.39995908641e7,
    etf_net_pur_redeem: 3.52094333e9,
    etf_net_pur_redeem1w: 5.78701443e9,
    etf_net_pur_redeem1m: 1.3472724e8,
    chg_rate_d5: -0.039687669848613716,
    chg_rate_m1: -0.03258423543959288,
    chg_rate_year: 0.407649355226682,
    pe_ttm: 75.671972,
    pe_ttm_percent_y3: 0.93242,
    pb: 5.763068,
    pb_percent_y3: 0.93516,
    dividend_yield_ratio: 0.002433,
    capital_flow_w8: [
      { statistic_date: "2025-09-28 00:00:00", week_purchase_redeem: 9.15822591e9 },
      { statistic_date: "2025-10-05 00:00:00", week_purchase_redeem: 3.92516042e9 },
      { statistic_date: "2025-10-12 00:00:00", week_purchase_redeem: 1.44511392e10 },
      { statistic_date: "2025-10-19 00:00:00", week_purchase_redeem: 6.96380759e9 },
      { statistic_date: "2025-10-26 00:00:00", week_purchase_redeem: -7.2009166e9 },
      { statistic_date: "2025-11-02 00:00:00", week_purchase_redeem: 7.824913e9 },
      { statistic_date: "2025-11-09 00:00:00", week_purchase_redeem: -3.97377568e9 },
      { statistic_date: "2025-11-14 00:00:00", week_purchase_redeem: 5.78701443e9 },
    ],
    trade_date: "2025-11-14 00:00:00",
    source: "SW",
    index_type: "申万行业",
  },
  {
    id: 45,
    index_code: "801080",
    index_name: "电子",
    price_change_rate: -0.030907217518683038,
    etf_latest_scales: 356885112641,
    turnover: 2.86783443344e7,
    etf_net_pur_redeem: 3.47571893e9,
    etf_net_pur_redeem1w: 5.71575093e9,
    etf_net_pur_redeem1m: -8.3484226e8,
    chg_rate_d5: -0.04767260821895247,
    chg_rate_m1: -0.010913278970980822,
    chg_rate_year: 0.409024679586828,
    pe_ttm: 48.433696,
    pe_ttm_percent_y3: 0.926941,
    pb: 4.503208,
    pb_percent_y3: 0.936986,
    dividend_yield_ratio: 0.00561,
    capital_flow_w8: [
      { statistic_date: "2025-09-28 00:00:00", week_purchase_redeem: 9.52440161e9 },
      { statistic_date: "2025-10-05 00:00:00", week_purchase_redeem: 3.84855122e9 },
      { statistic_date: "2025-10-12 00:00:00", week_purchase_redeem: 1.43793548e10 },
      { statistic_date: "2025-10-19 00:00:00", week_purchase_redeem: 6.61237859e9 },
      { statistic_date: "2025-10-26 00:00:00", week_purchase_redeem: -7.3049988e9 },
      { statistic_date: "2025-11-02 00:00:00", week_purchase_redeem: 7.7282927e9 },
      { statistic_date: "2025-11-09 00:00:00", week_purchase_redeem: -4.44299418e9 },
      { statistic_date: "2025-11-14 00:00:00", week_purchase_redeem: 5.71575093e9 },
    ],
    trade_date: "2025-11-14 00:00:00",
    source: "SW",
    index_type: "申万行业",
  },
];

const toPercent = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }
  const percent = (value * 100).toFixed(2);
  return value > 0 ? `+${percent}%` : `${percent}%`;
};

const formatLargeNumber = (value?: number) => {
  if (value === undefined || value === null) {
    return "--";
  }
  const abs = Math.abs(value);
  if (abs >= 1e12) {
    return `${(value / 1e12).toFixed(2)} 万亿`;
  }
  if (abs >= 1e8) {
    return `${(value / 1e8).toFixed(2)} 亿`;
  }
  if (abs >= 1e4) {
    return `${(value / 1e4).toFixed(2)} 万`;
  }
  return value.toFixed(2);
};

const formatDailyTurnover = (value?: number) => {
  if (value === undefined || value === null) {
    return "--";
  }
  return `${(value / 1e8).toFixed(2)} 亿`;
};

const latestWeekFlow = (record: IndexRecord) => {
  const flow = record.capital_flow_w8.at(-1);
  if (!flow) return "--";
  const number = flow.week_purchase_redeem;
  return `${number >= 0 ? "+" : ""}${(number / 1e8).toFixed(2)} 亿`;
};

const renderPercentValue = (value?: number) => {
  const text = toPercent(value);
  if (text === "--") {
    return <Typography.Text type="secondary">{text}</Typography.Text>;
  }
  const color = value && value > 0 ? "#f5222d" : value && value < 0 ? "#52c41a" : undefined;
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
  price_change_rate: (record) => record.price_change_rate,
  etf_latest_scales: (record) => record.etf_latest_scales,
  turnover: (record) => record.turnover,
  etf_net_pur_redeem: (record) => record.etf_net_pur_redeem,
  latest_week_flow: (record) =>
    record.capital_flow_w8.at(-1)?.week_purchase_redeem ?? null,
  etf_net_pur_redeem1m: (record) => record.etf_net_pur_redeem1m,
  chg_rate_d5: (record) => record.chg_rate_d5,
  chg_rate_m1: (record) => record.chg_rate_m1,
  chg_rate_year: (record) => record.chg_rate_year,
  pe_ttm: (record) => record.pe_ttm,
  pe_ttm_percent_y3: (record) => record.pe_ttm_percent_y3,
  pb: (record) => record.pb,
  pb_percent_y3: (record) => record.pb_percent_y3,
  dividend_yield_ratio: (record) => record.dividend_yield_ratio,
  roe: () => null,
};

type TableType = "flow" | "valuation";

type ColumnConfig = {
  sortKey: SortKey;
  column: ColumnType<IndexRecord>;
};

const nameColumn: ColumnType<IndexRecord> = {
  title: "名称",
  dataIndex: "index_name",
  key: "name",
  width: 180,
  render: (_value, record) => (
    <Space direction="vertical" size={2}>
      <Typography.Text strong>{record.index_name}</Typography.Text>
      <Typography.Text type="secondary">{record.index_code}</Typography.Text>
    </Space>
  ),
};

const flowColumnConfigs: ColumnConfig[] = [
  {
    sortKey: "price_change_rate",
    column: {
      title: "实时涨幅",
      dataIndex: "price_change_rate",
      key: "change",
      render: (value) => renderPercentValue(value),
    },
  },
  {
    sortKey: "etf_latest_scales",
    column: {
      title: "ETF规模",
      dataIndex: "etf_latest_scales",
      key: "scale",
      render: (value) => <Typography.Text>{formatLargeNumber(value)}</Typography.Text>,
    },
  },
  {
    sortKey: "turnover",
    column: {
      title: "当日成交额",
      dataIndex: "turnover",
      key: "turnover",
      render: (value) => <Typography.Text>{formatDailyTurnover(value)}</Typography.Text>,
    },
  },
  {
    sortKey: "etf_net_pur_redeem",
    column: {
      title: "单日净申赎",
      dataIndex: "etf_net_pur_redeem",
      key: "net",
      render: (value) => <Typography.Text>{formatLargeNumber(value)}</Typography.Text>,
    },
  },
  {
    sortKey: "latest_week_flow",
    column: {
      title: "近一周净申赎",
      key: "weekly",
      render: (_value, record) => renderWeekFlowText(record),
    },
  },
  {
    sortKey: "etf_net_pur_redeem1m",
    column: {
      title: "近1月净申赎",
      dataIndex: "etf_net_pur_redeem1m",
      key: "month",
      render: (value) => <Typography.Text>{formatLargeNumber(value)}</Typography.Text>,
    },
  },
  {
    sortKey: "chg_rate_d5",
    column: {
      title: "近5日涨幅",
      dataIndex: "chg_rate_d5",
      key: "d5",
      render: (value) => renderPercentValue(value),
    },
  },
  {
    sortKey: "chg_rate_m1",
    column: {
      title: "近1月涨幅",
      dataIndex: "chg_rate_m1",
      key: "m1",
      render: (value) => renderPercentValue(value),
    },
  },
  {
    sortKey: "chg_rate_year",
    column: {
      title: "今年涨幅",
      dataIndex: "chg_rate_year",
      key: "ytd",
      render: (value) => renderPercentValue(value),
    },
  },
];

const valuationColumnConfigs: ColumnConfig[] = [
  {
    sortKey: "price_change_rate",
    column: {
      title: "实时涨幅",
      dataIndex: "price_change_rate",
      key: "change",
      render: (value) => renderPercentValue(value),
    },
  },
  {
    sortKey: "pe_ttm",
    column: {
      title: "PE",
      dataIndex: "pe_ttm",
      key: "pe",
      render: (value) =>
        value === undefined || value === null ? (
          <Typography.Text type="secondary">--</Typography.Text>
        ) : (
          <Typography.Text>{value.toFixed(2)}</Typography.Text>
        ),
    },
  },
  {
    sortKey: "pe_ttm_percent_y3",
    column: {
      title: "PE分位",
      dataIndex: "pe_ttm_percent_y3",
      key: "pe_percent",
      render: (value) =>
        value === undefined || value === null ? (
          <Typography.Text type="secondary">--</Typography.Text>
        ) : (
          <Typography.Text>{`${(value * 100).toFixed(2)}%`}</Typography.Text>
        ),
    },
  },
  {
    sortKey: "pb",
    column: {
      title: "PB",
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
  {
    sortKey: "pb_percent_y3",
    column: {
      title: "PB分位",
      dataIndex: "pb_percent_y3",
      key: "pb_percent",
      render: (value) =>
        value === undefined || value === null ? (
          <Typography.Text type="secondary">--</Typography.Text>
        ) : (
          <Typography.Text>{`${(value * 100).toFixed(2)}%`}</Typography.Text>
        ),
    },
  },
  {
    sortKey: "roe",
    column: {
      title: "ROE",
      key: "roe",
      render: () => <Typography.Text type="secondary">--</Typography.Text>,
    },
  },
  {
    sortKey: "dividend_yield_ratio",
    column: {
      title: "股息率",
      dataIndex: "dividend_yield_ratio",
      key: "dividend",
      render: (value) =>
        value === undefined || value === null ? (
          <Typography.Text type="secondary">--</Typography.Text>
        ) : (
          <Typography.Text>{`${(value * 100).toFixed(2)}%`}</Typography.Text>
        ),
    },
  },
  {
    sortKey: "etf_latest_scales",
    column: {
      title: "ETF规模",
      dataIndex: "etf_latest_scales",
      key: "scale",
      render: (value) => <Typography.Text>{formatLargeNumber(value)}</Typography.Text>,
    },
  },
  {
    sortKey: "chg_rate_d5",
    column: {
      title: "近5日涨幅",
      dataIndex: "chg_rate_d5",
      key: "d5",
      render: (value) => renderPercentValue(value),
    },
  },
  {
    sortKey: "chg_rate_m1",
    column: {
      title: "近1月涨幅",
      dataIndex: "chg_rate_m1",
      key: "m1",
      render: (value) => renderPercentValue(value),
    },
  },
  {
    sortKey: "chg_rate_year",
    column: {
      title: "今年涨幅",
      dataIndex: "chg_rate_year",
      key: "ytd",
      render: (value) => renderPercentValue(value),
    },
  },
];

const compareValues = (a: string | number | null, b: string | number | null) => {
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
  config: TableSortState
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
  const [records, setRecords] = useState<IndexRecord[]>(MOCK_RECORDS);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [flowSortConfig, setFlowSortConfig] = useState<TableSortState>({
    key: null,
    order: null,
  });
  const [valuationSortConfig, setValuationSortConfig] = useState<TableSortState>({
    key: null,
    order: null,
  });

  const sortedFlowRecords = useMemo(
    () => sortRecords(records, flowSortConfig),
    [records, flowSortConfig]
  );
  const sortedValuationRecords = useMemo(
    () => sortRecords(records, valuationSortConfig),
    [records, valuationSortConfig]
  );

  const handleSortToggle = (table: TableType, key: SortKey) => {
    const setter =
      table === "flow" ? setFlowSortConfig : setValuationSortConfig;
    setter((prev) => {
      if (prev.key === key) {
        const nextOrder =
          prev.order === "asc" ? "desc" : prev.order === "desc" ? null : "asc";
        return nextOrder ? { key, order: nextOrder } : { key: null, order: null };
      }
      return { key, order: "asc" };
    });
  };

  const renderSortableTitle = (
    label: string,
    sortKey: SortKey,
    table: TableType
  ) => {
    const config = table === "flow" ? flowSortConfig : valuationSortConfig;
    const isActive = config.key === sortKey;
    const upActive = isActive && config.order === "asc";
    const downActive = isActive && config.order === "desc";

    return (
      <Space size={4}>
        <span>{label}</span>
        <div className="flex flex-col items-center text-[10px]">
          <CaretUpOutlined style={{ color: upActive ? "#1677ff" : "#bfbfbf" }} />
          <CaretDownOutlined style={{ color: downActive ? "#1677ff" : "#bfbfbf" }} />
        </div>
      </Space>
    );
  };

  const buildColumns = (configs: ColumnConfig[], table: TableType) =>
    configs.map(({ sortKey, column }) => ({
      ...column,
      title: renderSortableTitle(column.title as string, sortKey, table),
      onHeaderCell: () => ({
        style: { cursor: "pointer", userSelect: "none" },
        onClick: () => handleSortToggle(table, sortKey),
      }),
    }));

  const flowColumns = [nameColumn, ...buildColumns(flowColumnConfigs, "flow")];
  const valuationColumns = [nameColumn, ...buildColumns(valuationColumnConfigs, "valuation")];

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/records");
      if (!response.ok) {
        throw new Error("拉取数据失败");
      }
      const payload = await response.json();
      const newRecords: IndexRecord[] = payload?.data?.records ?? [];
      if (!newRecords.length) {
        throw new Error("接口返回为空");
      }
      setRecords(newRecords);
      setLastUpdated(new Date());
    } catch (error) {
      console.error(error);
      message.error((error as Error).message || "获取数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

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
          scroll={{ x: 1200 }}
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
          scroll={{ x: 1200 }}
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
              justify="space-between"
              className="w-full flex-wrap gap-4"
            >
              <div>
                <Typography.Title level={2}>行业指数洞察</Typography.Title>
                <Typography.Text type="secondary">
                  名称在最左，右侧各列展示资金流向/估值指标，该列点击可排序。
                </Typography.Text>
              </div>
              <Space wrap>
                <Typography.Text type="secondary">
                  最后更新时间：{lastUpdated.toLocaleString()}
                </Typography.Text>
                <Button type="primary" loading={loading} onClick={fetchRecords}>
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
