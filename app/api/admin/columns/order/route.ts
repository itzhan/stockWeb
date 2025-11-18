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

export async function PUT(request: Request) {
  try {
    requireAdminAuth(request);
  } catch (error) {
    return NextResponse.json({ message: "未授权" }, { status: 401 });
  }

  const { columnIds } = await parseBody(request);
  if (!Array.isArray(columnIds) || columnIds.length === 0) {
    return NextResponse.json(
      { message: "columnIds 数组不能为空" },
      { status: 400 }
    );
  }

  const sanitizedIds = columnIds
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (sanitizedIds.length !== columnIds.length) {
    return NextResponse.json(
      { message: "columnIds 中必须全部为有效数字" },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(
      sanitizedIds.map((id, index) =>
        prisma.columnName.update({
          where: { id },
          data: { displayOrder: index + 1 },
        })
      )
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("保存列顺序失败：", error);
    return NextResponse.json(
      { message: "保存列顺序失败" },
      { status: 500 }
    );
  }
}
