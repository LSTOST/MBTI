const zodiacBoundaries = [
  { sign: "白羊座", month: 3, day: 21 },
  { sign: "金牛座", month: 4, day: 20 },
  { sign: "双子座", month: 5, day: 21 },
  { sign: "巨蟹座", month: 6, day: 22 },
  { sign: "狮子座", month: 7, day: 23 },
  { sign: "处女座", month: 8, day: 23 },
  { sign: "天秤座", month: 9, day: 23 },
  { sign: "天蝎座", month: 10, day: 24 },
  { sign: "射手座", month: 11, day: 23 },
  { sign: "摩羯座", month: 12, day: 22 },
  { sign: "水瓶座", month: 1, day: 20 },
  { sign: "双鱼座", month: 2, day: 19 },
];

export function getSunSign(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error("出生日期无效");
  }

  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  for (let i = 0; i < zodiacBoundaries.length; i += 1) {
    const current = zodiacBoundaries[i];
    const next = zodiacBoundaries[(i + 1) % zodiacBoundaries.length];

    if (
      current.month === month &&
      day >= current.day
    ) {
      return current.sign;
    }

    if (
      next.month === month &&
      day < next.day
    ) {
      return current.sign;
    }
  }

  return "摩羯座";
}

