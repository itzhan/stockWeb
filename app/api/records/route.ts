import { NextResponse } from "next/server";

const FETCH_URL =
  "https://mg.go-goal.cn/api/v1/ft_fin_app_etf_plate/indthmbro_stat?type=3%2C4&page=1&rows=1000&order=etf_net_pur_redeem&order_type=-1";

const REQUEST_HEADERS = {
  accept: "*/*",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  "content-type": "application/x-www-form-urlencoded",
  cookie:
    "sajssdk_2015_cross_new_user=1; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%2219a85016aaa168b-09b6e32258128a8-1d525631-1484784-19a85016aab2012%22%2C%22first_id%22%3A%22%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTlhODUwMTZhYWExNjhiLTA5YjZlMzIyNTgxMjhhOC0xZDUyNTYzMS0xNDg0Nzg0LTE5YTg1MDE2YWFiMjAxMiJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%22%2C%22value%22%3A%22%22%7D%7D; acw_tc=1a1c785e17631913128403852e938037efce8d3a27288ca3551ccf09569e77",
  dnt: "1",
  priority: "u=1, i",
  referer:
    "https://mg.go-goal.cn/etf/pages/index-analysis?gogoalbar=0&keyword=",
  "sec-ch-ua": '"Not_A Brand";v="99", "Chromium";v="142"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
};

export async function GET() {
  try {
    const response = await fetch(FETCH_URL, {
      method: "GET",
      headers: REQUEST_HEADERS,
      cache: "no-store",
    });
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "上游接口出错", detail: errorText },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "请求失败", message: (error as Error).message },
      { status: 500 }
    );
  }
}
