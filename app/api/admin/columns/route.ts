import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

const parseBody = async (request: Request) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

export async function GET(request: Request) {
  try {
    requireAdminAuth(request);
  } catch (error) {
    return NextResponse.json(
      { message: "未授权" },
      { status: 401 }
    );
  }
  const columns = await prisma.columnName.findMany({
    orderBy: [
      { displayOrder: "asc" },
      { key: "asc" },
    ],
  });
  return NextResponse.json(columns);
}

export async function POST(request: Request) {
  try {
    requireAdminAuth(request);
  } catch (error) {
    return NextResponse.json(
      { message: "未授权" },
      { status: 401 }
    );
  }
  const { key, displayName, description, displayOrder, visible } =
    await parseBody(request);
  if (!key || !displayName) {
    return NextResponse.json(
      { message: "字段标识与展示标题为必填项" },
      { status: 400 }
    );
  }

  try {
    const orderValue = Number(displayOrder);
    const normalizedOrder = Number.isFinite(orderValue) ? orderValue : 0;
    const column = await prisma.columnName.create({
      data: {
        key,
        displayName,
        description: description ?? null,
        displayOrder: normalizedOrder,
        visible: typeof visible === "boolean" ? visible : true,
      },
    });
    return NextResponse.json(column);
  } catch (error) {
    console.error("创建列描述失败：", error);
    return NextResponse.json(
      { message: "创建列描述失败，请检查 key 是否已存在" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    requireAdminAuth(request);
  } catch (error) {
    return NextResponse.json(
      { message: "未授权" },
      { status: 401 }
    );
  }
  const { id, displayName, description, displayOrder, visible } =
    await parseBody(request);
  if (!id || !displayName) {
    return NextResponse.json(
      { message: "ID 与展示标题为必填项" },
      { status: 400 }
    );
  }

  try {
    const updateData: Record<string, unknown> = {
      displayName,
      description: description ?? null,
    };
    if (Number.isFinite(Number(displayOrder))) {
      updateData.displayOrder = Number(displayOrder);
    }
    if (typeof visible === "boolean") {
      updateData.visible = visible;
    }
    const column = await prisma.columnName.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(column);
  } catch (error) {
    console.error("更新列描述失败：", error);
    return NextResponse.json(
      { message: "更新列描述失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdminAuth(request);
  } catch (error) {
    return NextResponse.json(
      { message: "未授权" },
      { status: 401 }
    );
  }
  const { id } = await parseBody(request);
  if (!id) {
    return NextResponse.json({ message: "ID 参数缺失" }, { status: 400 });
  }

  try {
    await prisma.columnName.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除列描述失败：", error);
    return NextResponse.json(
      { message: "删除列描述失败" },
      { status: 500 }
    );
  }
}
