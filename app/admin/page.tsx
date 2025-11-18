"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Menu,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  Switch,
  Tabs,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";

type UserRecord = {
  id: number;
  username: string;
  role: string;
  email?: string | null;
  createdAt: string;
};

type ColumnRecord = {
  id: number;
  key: string;
  displayName: string;
  description?: string | null;
  updatedAt: string;
  displayOrder: number;
  visible: boolean;
};

type OverviewPayload = {
  users: UserRecord[];
  columns: ColumnRecord[];
  stats: {
    totalRecords: number;
    lastTradeDate: string | null;
  };
};

type UserFormValues = {
  username: string;
  email?: string;
  role: string;
};

type ColumnFormValues = {
  key: string;
  displayName: string;
  description?: string;
  displayOrder?: number;
  visible?: boolean;
};

type ColumnCategory = "flow" | "valuation" | "other";

type StockRecord = {
  id: number;
  index_code: string;
  index_name: string;
  trade_date: string;
  price_change_rate?: number | null;
  turnover?: number | null;
  pe_ttm?: number | null;
  pb?: number | null;
};

const formatPercentValue = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }
  const formatted = (value * 100).toFixed(2);
  return value > 0 ? `+${formatted}%` : `${formatted}%`;
};

const formatNumberValue = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }
  return new Intl.NumberFormat("zh-CN").format(value);
};

type AdminSection = "overview" | "users" | "columns" | "stocks";

const ADMIN_SECTIONS: { key: AdminSection; label: string; description: string }[] =
  [
    {
      key: "overview",
      label: "概览信息",
      description: "展示总记录与最新抓取日期",
    },
    {
      key: "users",
      label: "用户管理",
      description: "新增、编辑或删除账号",
    },
    {
      key: "columns",
      label: "字段配置",
      description: "调整展示列与排序",
    },
    {
      key: "stocks",
      label: "股票数据",
      description: "按日期查看指标数据",
    },
  ];

const sectionMenuItems: MenuProps["items"] = ADMIN_SECTIONS.map((section) => ({
  key: section.key,
  label: (
    <span className="text-sm font-medium leading-tight">{section.label}</span>
  ),
  style: {
    paddingTop: 10,
    paddingBottom: 10,
  },
}));

const reorderColumnsWithinCategory = (
  columns: ColumnRecord[],
  keySet: Set<string>,
  sourceId: number,
  targetId: number
): ColumnRecord[] | null => {
  const subset = columns.filter((column) => keySet.has(column.key));
  const sourceIndex = subset.findIndex((column) => column.id === sourceId);
  const targetIndex = subset.findIndex((column) => column.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) {
    return null;
  }
  const reorderedSubset = [...subset];
  const [moved] = reorderedSubset.splice(sourceIndex, 1);
  reorderedSubset.splice(targetIndex, 0, moved);

  let cursor = 0;
  const reordered = columns.map((column) => {
    if (!keySet.has(column.key)) {
      return column;
    }
    const nextColumn = reorderedSubset[cursor];
    cursor += 1;
    return nextColumn;
  });

  return reordered.map((column, index) => ({
    ...column,
    displayOrder: index + 1,
  }));
};

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
  "pe_ttm",
  "pe_ttm_percent_y3",
  "pb",
  "pb_percent_y3",
  "dividend_yield_ratio",
  "roe",
]);

const ROLE_OPTIONS = [
  { label: "管理员", value: "admin" },
  { label: "编辑", value: "editor" },
  { label: "浏览者", value: "viewer" },
];

export default function AdminPage() {
  const [isLogged, setIsLogged] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [columns, setColumns] = useState<ColumnRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [columnModalVisible, setColumnModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editingColumn, setEditingColumn] = useState<ColumnRecord | null>(null);
  const [modalSavingUser, setModalSavingUser] = useState(false);
  const [modalSavingColumn, setModalSavingColumn] = useState(false);
  const dragColumnId = useRef<number | null>(null);

  const [userForm] = Form.useForm<UserFormValues>();
  const [columnForm] = Form.useForm<ColumnFormValues>();
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockAvailableDates, setStockAvailableDates] = useState<string[]>([]);
  const [stockSelectedDate, setStockSelectedDate] = useState<string | null>(null);
  const [stockLastFetchAt, setStockLastFetchAt] = useState<string | null>(null);
  const [stockRefreshing, setStockRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");

  const handleSessionExpired = useCallback(() => {
    message.warning("登录信息已失效，请重新登录");
    localStorage.removeItem("adminToken");
    setJwtToken(null);
    setIsLogged(false);
  }, []);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers ?? undefined);
      if (jwtToken) {
        headers.set("Authorization", `Bearer ${jwtToken}`);
      }
      const response = await fetch(input, { ...init, headers });
      if (response.status === 401) {
        handleSessionExpired();
      }
      return response;
    },
    [jwtToken, handleSessionExpired]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem("adminToken");
    if (!storedToken) {
      return;
    }
    const verifyToken = async () => {
      try {
        const response = await fetch("/api/admin/session", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!response.ok) {
          throw new Error("授权已失效");
        }
        setJwtToken(storedToken);
        setIsLogged(true);
      } catch (error) {
        handleSessionExpired();
      }
    };
    verifyToken();
  }, [handleSessionExpired]);

  const fetchOverview = useCallback(async () => {
    try {
      const response = await authFetch("/api/admin/overview");
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error("加载概览失败");
      }
      const payload: OverviewPayload = await response.json();
      setOverview(payload);
    } catch (error) {
      message.error((error as Error).message);
    }
  }, [authFetch]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await authFetch("/api/admin/users");
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error("加载用户失败");
      }
      const payload: UserRecord[] = await response.json();
      setUsers(payload);
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setUsersLoading(false);
    }
  }, [authFetch]);

  const fetchColumns = useCallback(async () => {
    setColumnsLoading(true);
    try {
      const response = await authFetch("/api/admin/columns");
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error("加载列定义失败");
      }
      const payload: ColumnRecord[] = await response.json();
      const sorted = [...payload].sort(
        (a, b) => a.displayOrder - b.displayOrder
      );
      setColumns(sorted);
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setColumnsLoading(false);
    }
  }, [authFetch]);

  const loadStockRecords = useCallback(async (date?: string | null) => {
    setStockLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) {
        params.set("date", date);
      }
      const response = await fetch(
        `/api/records${params.toString() ? `?${params.toString()}` : ""}`
      );
      if (!response.ok) {
        throw new Error("加载股票数据失败");
      }
      const payload = await response.json();
      setStockRecords(payload.data ?? []);
      setStockAvailableDates(payload.availableDates ?? []);
      setStockLastFetchAt(payload.lastFetchAt ?? null);
      if (date) {
        setStockSelectedDate(date);
      } else {
        setStockSelectedDate((prev) =>
          prev ?? payload.currentDate ?? payload.availableDates?.[0] ?? null
        );
      }
    } catch (error) {
      message.error((error as Error).message || "加载股票数据失败");
    } finally {
      setStockLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLogged) return;
    fetchOverview();
    fetchUsers();
    fetchColumns();
    loadStockRecords();
  }, [isLogged, fetchOverview, fetchUsers, fetchColumns, loadStockRecords]);

  const handleLogin = async (values: { username: string; password: string }) => {
    setAuthSubmitting(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (response.ok && payload.success && payload.token) {
        localStorage.setItem("adminToken", payload.token);
        setJwtToken(payload.token);
        setIsLogged(true);
        message.success("登录成功");
        return;
      }
      throw new Error(payload.message || "登录失败");
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const openUserModal = (user?: UserRecord) => {
    if (user) {
      setEditingUser(user);
      userForm.setFieldsValue({
        username: user.username,
        email: user.email ?? undefined,
        role: user.role,
      });
    } else {
      setEditingUser(null);
      userForm.resetFields();
      userForm.setFieldsValue({ role: "viewer" });
    }
    setUserModalVisible(true);
  };

  const closeUserModal = () => {
    setUserModalVisible(false);
    setEditingUser(null);
    userForm.resetFields();
  };

  const handleUserSubmit = async (values: UserFormValues) => {
    setModalSavingUser(true);
    try {
      const payload = {
        username: values.username.trim(),
        email: values.email?.trim() ?? null,
        role: values.role,
        ...(editingUser ? { id: editingUser.id } : {}),
      } as Record<string, unknown>;
      const response = await authFetch("/api/admin/users", {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error(result.message || "操作失败");
      }
      message.success(editingUser ? "用户更新成功" : "用户新建成功");
      closeUserModal();
      fetchUsers();
      fetchOverview();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setModalSavingUser(false);
    }
  };

  const handleUserDelete = async (userId: number) => {
    try {
      setUsersLoading(true);
      const response = await authFetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error(result.message || "删除失败");
      }
      message.success("用户已删除");
      fetchUsers();
      fetchOverview();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setUsersLoading(false);
    }
  };

  const openColumnModal = (column?: ColumnRecord) => {
    if (column) {
      setEditingColumn(column);
      columnForm.setFieldsValue({
        key: column.key,
        displayName: column.displayName,
        description: column.description ?? undefined,
        displayOrder: column.displayOrder,
        visible: column.visible,
      });
    } else {
      setEditingColumn(null);
      columnForm.resetFields();
      columnForm.setFieldsValue({
        displayOrder: columns.length + 1,
        visible: true,
      });
    }
    setColumnModalVisible(true);
  };

  const closeColumnModal = () => {
    setColumnModalVisible(false);
    setEditingColumn(null);
    columnForm.resetFields();
  };

  const handleColumnSubmit = async (values: ColumnFormValues) => {
    setModalSavingColumn(true);
    try {
      const sanitizedDescription = values.description?.trim() ?? null;
      const payload: Record<string, unknown> = {
        displayName: values.displayName.trim(),
        description: sanitizedDescription,
        displayOrder: values.displayOrder ?? 0,
        visible: values.visible ?? true,
      };
      if (editingColumn) {
        payload.id = editingColumn.id;
      } else {
        payload.key = values.key.trim();
      }
      const response = await authFetch("/api/admin/columns", {
        method: editingColumn ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error(result.message || "保存失败");
      }
      message.success(editingColumn ? "字段已更新" : "字段已添加");
      closeColumnModal();
      fetchColumns();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setModalSavingColumn(false);
    }
  };

  const handleColumnDelete = async (columnId: number) => {
    try {
      setColumnsLoading(true);
      const response = await authFetch("/api/admin/columns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: columnId }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error(result.message || "删除失败");
      }
      message.success("字段已删除");
      fetchColumns();
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setColumnsLoading(false);
    }
  };

  const handleColumnVisibilityChange = useCallback(
    async (column: ColumnRecord, visible: boolean) => {
      try {
        const response = await authFetch("/api/admin/columns", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: column.id,
            displayName: column.displayName,
            description: column.description ?? null,
            displayOrder: column.displayOrder,
            visible,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          if (response.status === 401) {
            return;
          }
          throw new Error(result.message || "更新展示状态失败");
        }
        setColumns((prev) =>
          prev.map((item) => (item.id === column.id ? result : item))
        );
        message.success("展示状态已更新");
      } catch (error) {
        message.error((error as Error).message);
        fetchColumns();
      }
    },
    [authFetch, fetchColumns]
  );

  const handleStockDateChange = (value: string) => {
    setStockSelectedDate(value);
    loadStockRecords(value);
  };

  const handleStockRefresh = useCallback(async () => {
    setStockRefreshing(true);
    try {
      const response = await fetch("/api/records/refresh", {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "刷新失败");
      }
      const payload = await response.json();
      message.success(`主动刷新已触发，${payload.count ?? 0} 条数据待更新`);
    } catch (error) {
      message.error((error as Error).message || "刷新失败");
    } finally {
      setStockRefreshing(false);
      await loadStockRecords(stockSelectedDate ?? undefined);
    }
  }, [loadStockRecords, stockSelectedDate]);

  const persistColumnOrder = useCallback(
    async (orderedColumns: ColumnRecord[]) => {
      if (!orderedColumns.length) {
        return;
      }
      try {
        const response = await authFetch("/api/admin/columns/order", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            columnIds: orderedColumns.map((column) => column.id),
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || "排序保存失败");
        }
      } catch (error) {
        console.error("排序同步失败：", error);
        message.error("排序保存失败，已恢复最新列配置");
        fetchColumns();
      }
    },
    [authFetch, fetchColumns]
  );

  const otherColumnKeys = useMemo(
    () =>
      new Set(
        columns
          .filter(
            (column) =>
              !FLOW_COLUMN_KEYS.has(column.key) &&
              !VALUATION_COLUMN_KEYS.has(column.key)
          )
          .map((column) => column.key)
      ),
    [columns]
  );

  const resetDragSelection = () => {
    dragColumnId.current = null;
  };

  const handleColumnDrop = useCallback(
    async (targetId: number, category: ColumnCategory) => {
      const sourceId = dragColumnId.current;
      resetDragSelection();
      if (!sourceId || sourceId === targetId) {
        return;
      }
      const keySet =
        category === "flow"
          ? FLOW_COLUMN_KEYS
          : category === "valuation"
          ? VALUATION_COLUMN_KEYS
          : otherColumnKeys;
      const reordered = reorderColumnsWithinCategory(
        columns,
        keySet,
        sourceId,
        targetId
      );
      if (!reordered) {
        return;
      }
      setColumns(reordered);
      await persistColumnOrder(reordered);
    },
    [columns, otherColumnKeys, persistColumnOrder]
  );

  const handleRowDragStart = (
    recordId: number,
    event: DragEvent<HTMLTableRowElement>
  ) => {
    dragColumnId.current = recordId;
    event.dataTransfer?.setData("text/plain", recordId.toString());
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  };

  const handleRowDragEnd = () => {
    resetDragSelection();
  };

  const userTableColumns: ColumnsType<UserRecord> = [
    { title: "用户名", dataIndex: "username", key: "username" },
    { title: "角色", dataIndex: "role", key: "role" },
    { title: "邮箱", dataIndex: "email", key: "email" },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      title: "操作",
      key: "actions",
      render: (_value, record) => (
        <Space>
          <Button type="link" onClick={() => openUserModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该用户？"
            onConfirm={() => handleUserDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const columnTableColumns: ColumnsType<ColumnRecord> = [
    {
      title: "序号",
      dataIndex: "displayOrder",
      key: "displayOrder",
      width: 90,
      sorter: (a, b) => a.displayOrder - b.displayOrder,
      render: (value) => (value ?? "--"),
    },
    {
      title: "展示标题",
      dataIndex: "displayName",
      key: "displayName",
      render: (value) => <Typography.Text>{value}</Typography.Text>,
    },
    {
      title: "是否展示",
      key: "visible",
      render: (_value, record) => (
        <Switch
          checked={record.visible}
          onChange={(checked) =>
            handleColumnVisibilityChange(record, checked)
          }
          size="small"
          checkedChildren="展示"
          unCheckedChildren="隐藏"
        />
      ),
    },
    {
      title: "操作",
      key: "actions",
      render: (_value, record) => (
        <Space>
          <Button type="link" onClick={() => openColumnModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该字段？"
            onConfirm={() => handleColumnDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const stockTableColumns: ColumnsType<StockRecord> = [
    {
      title: "名称",
      dataIndex: "index_name",
      key: "index_name",
      width: 220,
      ellipsis: true,
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "日期",
      dataIndex: "trade_date",
      key: "trade_date",
      width: 140,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      title: "涨幅",
      dataIndex: "price_change_rate",
      key: "price_change_rate",
      align: "right",
      render: (value) => formatPercentValue(value),
    },
    {
      title: "成交额",
      dataIndex: "turnover",
      key: "turnover",
      align: "right",
      render: (value) => formatNumberValue(value),
    },
    {
      title: "PE",
      dataIndex: "pe_ttm",
      key: "pe_ttm",
      align: "right",
      render: (value) =>
        value === undefined || value === null || Number.isNaN(value)
          ? "--"
          : value.toFixed(2),
    },
    {
      title: "PB",
      dataIndex: "pb",
      key: "pb",
      align: "right",
      render: (value) =>
        value === undefined || value === null || Number.isNaN(value)
          ? "--"
          : value.toFixed(2),
    },
  ];

  const flowColumnData = useMemo(
    () => columns.filter((item) => FLOW_COLUMN_KEYS.has(item.key)),
    [columns]
  );
  const valuationColumnData = useMemo(
    () => columns.filter((item) => VALUATION_COLUMN_KEYS.has(item.key)),
    [columns]
  );
  const otherColumnData = useMemo(
    () =>
      columns.filter(
        (item) =>
          !FLOW_COLUMN_KEYS.has(item.key) && !VALUATION_COLUMN_KEYS.has(item.key)
      ),
    [columns]
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <Space direction="vertical" size="middle" className="w-full">
            <Typography.Title level={4}>管理端概览</Typography.Title>
            <Typography.Text type="secondary">
              当前展示总记录与最新抓取信息。
            </Typography.Text>
            <Space size="large" wrap align="center">
              <Card type="inner">
                <Typography.Text type="secondary">总记录数</Typography.Text>
                <Typography.Title level={3}>
                  {overview?.stats.totalRecords ?? "--"}
                </Typography.Title>
              </Card>
              <Card type="inner">
                <Typography.Text type="secondary">
                  最新抓取日期
                </Typography.Text>
                <Typography.Title level={3}>
                  {overview?.stats.lastTradeDate
                    ? new Date(overview.stats.lastTradeDate).toLocaleDateString()
                    : "--"}
                </Typography.Title>
              </Card>
              <Card type="inner">
                <Typography.Text type="secondary">
                  股票数据同步
                </Typography.Text>
                <Typography.Title level={3}>
                  {stockLastFetchAt
                    ? new Date(stockLastFetchAt).toLocaleString()
                    : "--"}
                </Typography.Title>
              </Card>
            </Space>
          </Space>
        );
      case "users":
        return (
          <Card type="inner" style={{ borderRadius: 16 }}>
            <Space align="center" className="flex w-full justify-between">
              <Typography.Title level={4}>用户管理</Typography.Title>
              <Button type="primary" onClick={() => openUserModal()}>
                新增用户
              </Button>
            </Space>
            <Table
              columns={userTableColumns}
              dataSource={users}
              rowKey="id"
              pagination={false}
              size="small"
              loading={usersLoading}
            />
          </Card>
        );
      case "columns":
        return (
          <Card type="inner" style={{ borderRadius: 16 }}>
            <Space align="center" className="flex w-full justify-between">
              <div>
                <Typography.Title level={4}>字段配置</Typography.Title>
                <Typography.Text type="secondary">
                  可根据资金流向与估值分类自定义展示名称。
                </Typography.Text>
              </div>
              <Button type="primary" onClick={() => openColumnModal()}>
                新增字段
              </Button>
            </Space>
            <Tabs
              defaultActiveKey="flow"
              items={[
                {
                  key: "flow",
                  label: "资金流向列",
                  children: (
                    <Table
                      columns={columnTableColumns}
                      dataSource={flowColumnData}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      loading={columnsLoading}
                      onRow={(record) => ({
                        draggable: true,
                        onDragStart: (event) =>
                          handleRowDragStart(record.id, event),
                        onDragOver: (event) => {
                          event.preventDefault();
                        },
                        onDrop: () => handleColumnDrop(record.id, "flow"),
                        onDragEnd: handleRowDragEnd,
                      })}
                    />
                  ),
                },
                {
                  key: "valuation",
                  label: "估值列",
                  children: (
                    <Table
                      columns={columnTableColumns}
                      dataSource={valuationColumnData}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      loading={columnsLoading}
                      onRow={(record) => ({
                        draggable: true,
                        onDragStart: (event) =>
                          handleRowDragStart(record.id, event),
                        onDragOver: (event) => {
                          event.preventDefault();
                        },
                        onDrop: () => handleColumnDrop(record.id, "valuation"),
                        onDragEnd: handleRowDragEnd,
                      })}
                    />
                  ),
                },
                {
                  key: "other",
                  label: "其它列",
                  children: (
                    <Table
                      columns={columnTableColumns}
                      dataSource={otherColumnData}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      loading={columnsLoading}
                      onRow={(record) => ({
                        draggable: true,
                        onDragStart: (event) =>
                          handleRowDragStart(record.id, event),
                        onDragOver: (event) => {
                          event.preventDefault();
                        },
                        onDrop: () => handleColumnDrop(record.id, "other"),
                        onDragEnd: handleRowDragEnd,
                      })}
                    />
                  ),
                },
              ]}
            />
          </Card>
        );
      case "stocks":
        return (
          <Card type="inner" style={{ borderRadius: 16 }}>
            <Space
              align="center"
              className="flex w-full justify-between"
              wrap
            >
              <div>
                <Typography.Title level={4}>股票数据</Typography.Title>
                <Typography.Text type="secondary">
                  可按日期筛选已抓取的数据。
                </Typography.Text>
              </div>
              <Space wrap align="center">
                <Typography.Text type="secondary">
                  当前数据日期：{stockSelectedDate ?? "--"}
                </Typography.Text>
                <Select
                  value={stockSelectedDate ?? undefined}
                  options={stockAvailableDates.map((date) => ({
                    label: date,
                    value: date,
                  }))}
                  placeholder="筛选日期"
                  onChange={handleStockDateChange}
                  style={{ minWidth: 160 }}
                />
                <Typography.Text type="secondary">
                  最近同步：
                  {stockLastFetchAt
                    ? new Date(stockLastFetchAt).toLocaleString()
                    : "--"}
                </Typography.Text>
                <Button
                  type="primary"
                  onClick={handleStockRefresh}
                  loading={stockRefreshing}
                >
                  手动刷新
                </Button>
              </Space>
            </Space>
            <div className="mt-4 overflow-x-auto">
              <Table
                columns={stockTableColumns}
                dataSource={stockRecords}
                rowKey="id"
                pagination={false}
                size="small"
                loading={stockLoading}
                scroll={{ x: "max-content" }}
                className="min-w-full"
              />
            </div>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] py-10">
      <main className="mx-auto w-full max-w-5xl px-4">
        <Card style={{ borderRadius: 20, background: "#fff" }}>
          {isLogged ? (
            <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
              <Card
                style={{ borderRadius: 20 }}
                bodyStyle={{ padding: 0 }}
              >
                <div className="p-4 border-b">
                  <Typography.Title level={4}>栏目导航</Typography.Title>
                  <Typography.Text type="secondary" className="text-sm">
                    在左侧选择用户、字段、股票等管理表。
                  </Typography.Text>
                </div>
                <Menu
                  mode="inline"
                  selectedKeys={[activeSection]}
                  items={sectionMenuItems}
                  onClick={({ key }) =>
                    setActiveSection(key as AdminSection)
                  }
                  style={{ border: "none" }}
                />
              </Card>
              <div className="space-y-6">{renderSectionContent()}</div>
            </div>
          ) : (
            <Space direction="vertical" className="w-full" size="middle">
              <Typography.Title level={2}>管理员登录</Typography.Title>
              <Form
                layout="vertical"
                onFinish={handleLogin}
                className="w-full max-w-md"
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
                  >
                    登录
                  </Button>
                </Form.Item>
              </Form>
            </Space>
          )}
        </Card>
      </main>

      <Modal
        title={editingUser ? "编辑用户" : "新增用户"}
        open={userModalVisible}
        onOk={() => userForm.submit()}
        onCancel={closeUserModal}
        confirmLoading={modalSavingUser}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={userForm}
          layout="vertical"
          onFinish={handleUserSubmit}
          initialValues={{ role: "viewer" }}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="邮箱" name="email">
            <Input />
          </Form.Item>
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: "请选择角色" }]}
          >
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingColumn ? "编辑字段" : "新增字段"}
        open={columnModalVisible}
        onOk={() => columnForm.submit()}
        onCancel={closeColumnModal}
        confirmLoading={modalSavingColumn}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={columnForm}
          layout="vertical"
          onFinish={handleColumnSubmit}
        >
          <Form.Item
            label="字段标识"
            name="key"
            rules={[{ required: true, message: "请输入字段标识" }]}
          >
            <Input disabled={Boolean(editingColumn)} />
          </Form.Item>
          <Form.Item
            label="序号"
            name="displayOrder"
            rules={[{ required: true, message: "请输入显示序号" }]}
          >
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item
            label="展示标题"
            name="displayName"
            rules={[{ required: true, message: "请输入展示标题" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="是否展示" name="visible" valuePropName="checked">
            <Switch checkedChildren="展示" unCheckedChildren="隐藏" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
