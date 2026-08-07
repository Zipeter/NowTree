// 登录励志语（本地内置「大全」模式，不联网）。
// 按「年内第几天」取模 → 每天稳定一条：同一天多次打开看到同一条，跨天自动更换。
const QUOTES: string[] = [
  "种一棵树最好的时间是十年前，其次是现在。",
  "千里之行，始于足下。",
  "今天的努力，是幸运的伏笔。",
  "不为模糊的未来担忧，只为清清楚楚的现在努力。",
  "自律给我自由。",
  "你只管努力，剩下的交给时间。",
  "把简单的事做好，就是不简单。",
  "日拱一卒，功不唐捐。",
  "行动，是治愈恐惧的良药。",
  "你所经历的，终将成为你的财富。",
  "慢慢来，比较快。",
  "星光不问赶路人。",
  "每一个不曾起舞的日子，都是对生命的辜负。",
  "向前走，总会看到光。",
  "耐心些，好运正在路上。",
];

export function dailyQuote(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / 86_400_000
  );
  return QUOTES[dayOfYear % QUOTES.length];
}
