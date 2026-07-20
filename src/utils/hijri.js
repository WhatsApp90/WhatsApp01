// تحويل التاريخ الميلادي إلى هجري بشكل تقريبي (بدون مكتبة خارجية)
const HIJRI_MONTHS = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الثاني",
  "جمادى الأولى",
  "جمادى الثانية",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
];

const HIJRI_DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export function getHijriDate(date = new Date()) {
  const jd = Math.floor(date.getTime() / 86400000 + 2440586 - 0.5);

  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return {
    day: day,
    month: month,
    monthName: HIJRI_MONTHS[month - 1] || "محرم",
    year: year,
    dayName: HIJRI_DAYS[date.getDay()],
    full: `${day} ${HIJRI_MONTHS[month - 1]} ${year} هـ`,
  };
}

export { HIJRI_MONTHS, HIJRI_DAYS };
    
