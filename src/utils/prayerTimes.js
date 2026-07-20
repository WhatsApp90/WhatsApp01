// جلب مواقيت الصلاة من Aladhan API لولاية حضرموت (المكلا)
import dotenv from "dotenv";
dotenv.config();

const CITY = process.env.PRAYER_CITY || "Mukalla";
const COUNTRY = process.env.PRAYER_COUNTRY || "Yemen";
const METHOD = process.env.PRAYER_METHOD || "3"; // 3 = أم القرى

export async function getPrayerTimes(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  const url = `https://api.aladhan.com/v1/timingsByCity/${dd}-${mm}-${yyyy}?city=${encodeURIComponent(
    CITY
  )}&country=${encodeURIComponent(COUNTRY)}&method=${METHOD}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const t = data.data.timings;
    const h = data.data.hijri;
    return {
      Fajr: t.Fajr,
      Sunrise: t.Sunrise,
      Dhuhr: t.Dhuhr,
      Asr: t.Asr,
      Maghrib: t.Maghrib,
      Isha: t.Isha,
      hijri: `${h.day} ${h.month.ar} ${h.year} هـ`,
      date: data.data.date.readable,
    };
  } catch (err) {
    console.error("خطأ في جلب المواقيت:", err.message);
    return null;
  }
}

export function formatPrayerTimes(t) {
  if (!t) return "تعذر جلب مواقيت الصلاة حاليًا، حاول لاحقًا.";
  return (
    `🕌 *مواقيت الصلاة - ولاية حضرموت (المكلا)*\n` +
    `📅 ${t.hijri}\n` +
    `─────────────────\n` +
    `🌅 الفجر: ${t.Fajr}\n` +
    `☀️ الشروق: ${t.Sunrise}\n` +
    `🌞 الظهر: ${t.Dhuhr}\n` +
    `🌤️ العصر: ${t.Asr}\n` +
    `🌇 المغرب: ${t.Maghrib}\n` +
    `🌙 العشاء: ${t.Isha}\n` +
    `─────────────────\n` +
    `*قال تعالى: ﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا﴾*`
  );
}
