// بناء رسائل البوت
import { getHijriDate } from "./hijri.js";
import { formatPrayerTimes, getPrayerTimes } from "./prayerTimes.js";
import { morningAdhkar } from "../data/morningAdhkar.js";
import { eveningAdhkar } from "../data/eveningAdhkar.js";
import { morningStories, eveningStories } from "../data/stories.js";
import { getEventForHijriDate } from "../data/hijriEvents.js";
import { whispers } from "../data/whispers.js";
import { getRandomScholar } from "../data/scholars.js";
import { sadaqahDua } from "../data/sadaqah.js";

const BOT_OWNER = process.env.BOT_OWNER || "خَطَّاب الحضرمي";

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatAdhkar(adhkarList) {
  let out = "";
  adhkarList.forEach((d, i) => {
    out += `*${i + 1}. ${d.title}*\n${d.text}\n_التكرار: ${d.repeat} مرة_\n\n`;
  });
  return out.trim();
}

export async function buildMorningMessage() {
  const hijri = getHijriDate();
  const story = pickRandom(morningStories);
  const whisper = pickRandom(whispers);
  const scholar = getRandomScholar();
  const event = getEventForHijriDate(hijri);

  let msg = `🌅 *أذكار الصباح* 🌅\n`;
  msg += `📅 ${hijri.dayName} ${hijri.full}\n`;
  msg += `👨‍👩‍👧‍👦 *مجموعة عائلتي العزيزة*\n`;
  msg += `═══════════════════════\n\n`;
  msg += `*🌸 أذكار الصباح*\n\n${formatAdhkar(morningAdhkar)}\n\n`;
  msg += `═══════════════════════\n\n`;
  msg += `📜 *حدث في مثل هذا اليوم الهجري*\n${event}\n\n`;
  msg += `═══════════════════════\n\n`;
  msg += `📖 *قصة صباحية - ${story.region}*\n*${story.title}*\n${story.text}\n\n💡 *العبرة:* ${story.lesson}\n\n`;
  msg += `═══════════════════════\n\n`;
  msg += `${whisper}\n\n`;
  msg += `═══════════════════════\n\n`;
  msg += `🕯️ *تذكرة - علماء في سجون آل سعود*\n`;
  msg += `اللهم فُكَّ أسر ${scholar.name}.\n${scholar.info}\n`;
  msg += `اللهم انصر إخواننا المعتقلين في كل مكان، وافرج كربهم.\n\n`;
  msg += `═══════════════════════\n\n`;
  msg += sadaqahDua;
  msg += `\n\n═══════════════════════\n`;
  msg += `\n🤲🏼 *صاحب البوت: ${BOT_OWNER}* ⚔️🖤`;
  return msg;
}

export async function buildEveningMessage() {
  const hijri = getHijriDate();
  const story = pickRandom(eveningStories);
  const whisper = pickRandom(whispers);
  const scholar = getRandomScholar();
  const event = getEventForHijriDate(hijri);
  const prayer = await getPrayerTimes();

  let msg = `🌙 *أذكار المساء* 🌙\n`;
  msg += `📅 ${hijri.dayName} ${hijri.full}\n`;
  msg += `👨‍👩‍👧‍👦 *مجموعة عائلتي العزيزة*\n`;
  msg += `═══════════════════════\n\n`;
  msg += `*🌸 أذكار المساء*\n\n${formatAdhkar(eveningAdhkar)}\n\n`;
  msg += `═══════════════════════\n\n`;
  if (prayer) {
    msg += `${formatPrayerTimes(prayer)}\n\n`;
    msg += `═══════════════════════\n\n`;
  }
  msg += `📜 *حدث في مثل هذا اليوم الهجري*\n${event}\n\n`;
  msg += `═══════════════════════\n\n`;
  msg += `📖 *قصة مسائية - ${story.region}*\n*${story.title}*\n${story.text}\n\n💡 *العبرة:* ${story.lesson}\n\n`;
  msg += `═══════════════════════\n\n`;
  msg += `${whisper}\n\n`;
  msg += `═══════════════════════\n\n`;
  msg += `🕯️ *تذكرة - علماء في سجون آل سعود*\n`;
  msg += `اللهم فُكَّ أسر ${scholar.name}.\n${scholar.info}\n`;
  msg += `اللهم انصر إخواننا المعتقلين في كل مكان، وافرج كربهم.\n\n`;
  msg += `═══════════════════════\n\n`;
  msg += sadaqahDua;
  msg += `\n\n═══════════════════════\n`;
  msg += `\n🤲🏼 *صاحب البوت: ${BOT_OWNER}* ⚔️🖤`;
  return msg;
}

export async function buildPrayerMessage() {
  const prayer = await getPrayerTimes();
  if (!prayer) return null;
  return formatPrayerTimes(prayer);
}

export function buildHelpMessage() {
  return (
    `🤖 *أوامر البوت الإسلامي*\n\n` +
    `• *أذكار* - عرض أذكار الصباح\n` +
    `• *مواقيت* - عرض مواقيت الصلاة في حضرموت\n` +
    `• *تاريخ* - عرض التاريخ الهجري اليوم\n` +
    `• *حدث* - حدث في مثل هذا اليوم الهجري\n` +
    `• *قصة* - قصة من بلاد المسلمين\n` +
    `• *همسة* - همسة إيمانية\n` +
    `• *دعاء* - دعاء صدقة جارية لصاحب البوت\n` +
    `• *أوامر* - عرض هذه القائمة\n\n` +
    `🤲🏼 صاحب البوت: ${BOT_OWNER} ⚔️🖤`
  );
}
