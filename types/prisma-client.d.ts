/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@prisma/client" {
export class PrismaClient {
  constructor(options?: { log?: string[] });
  [model: string]: any;
}

  export namespace Prisma {
    export type JsonValue = string | number | boolean | JsonObject | JsonArray | null;
    export interface JsonObject extends Record<string, JsonValue> {}
    export interface JsonArray extends Array<JsonValue> {}
  }

  export type IndexData = {
    id: number;
    indexCode: string;
    indexName: string;
    source: string | null;
    tradeDate: Date;
    priceChangeRate: number | null;
    etfLatestScales: number | null;
    turnover: number | null;
    etfNetPurRedeem: number | null;
    etfNetPurRedeem1m: number | null;
    chgRateD5: number | null;
    chgRateM1: number | null;
    chgRateYear: number | null;
    peTtm: number | null;
    peTtmPercentY3: number | null;
    pb: number | null;
    pbPercentY3: number | null;
    dividendYieldRatio: number | null;
    capitalFlowW8: Prisma.JsonValue | null;
    rawData: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  };
}
