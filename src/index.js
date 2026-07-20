// البوت الإسلامي - بوت واتساب لمجموعة عائلتي العزيزة
import "dotenv/config";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import cron from "node-cron";

import {
  buildMorningMessage,
  buildEveningMessage,
  buildPrayerMessage,
  buildHelpMessage,
} from "./utils/messages.js";
import { getHijriDate } from "./utils/hijri.js";
import { getEventForHijriDate } from "./data/hijriEvents.js";
import { morningStories, eveningStories } from "./data/stories.js";
import { whispers } from "./data/whispers.js";
import { sadaqahDua } from "./data/sadaqah.js";

const GROUP_ID = process.env.GROUP_ID;
const MORNING_TIME = process.env.MORNING_TIME || "05:30";
const EVENING_TIME = process.env.EVENING_TIME || "16:00";

if (!GROUP_ID) {
  console.error("⚠️  الرجاء ضبط GROUP_ID في ملف .env");
  process.exit(1);
}

let sock;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: ["islamic-bot", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("\nامسح رمز QR بالضغط التالي:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true;
      if (shouldReconnect) {
        console.log("إعادة الاتصال...");
        connectToWhatsApp();
      } else {
        console.log("تم تسجيل الخروج. احذف مجلد auth_info لإعادة التسجيل.");
      }
    } else if (connection === "open") {
      console.log("✅ تم الاتصال بواتساب بنجاح");
      scheduleJobs();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      "";
    const from = m.key.remoteJid;

    if (from !== GROUP_ID) return;

    const cmd = text.trim().toLowerCase();
    try {
      if (cmd === "أذكار" || cmd === "اذكار") {
        await sock.sendMessage(from, { text: await buildMorningMessage() });
      } else if (cmd === "مساء" || cmd === "أذكار المساء") {
        await sock.sendMessage(from, { text: await buildEveningMessage() });
      } else if (cmd === "مواقيت" || cmd === "اوقات" || cmd === "أوقات") {
        const p = await buildPrayerMessage();
        if (p) await sock.sendMessage(from, { text: p });
      } else if (cmd === "تاريخ" || cmd === "هجري") {
        const h = getHijriDate();
        await sock.sendMessage(from, {
          text: `📅 ${h.dayName} ${h.full}`,
        });
      } else if (cmd === "حدث") {
        const h = getHijriDate();
        await sock.sendMessage(from, {
          text: `📜 *حدث في مثل هذا اليوم الهجري*\n${getEventForHijriDate(h)}`,
        });
      } else if (cmd === "قصة" || cmd === "قصة") {
        const s = morningStories[Math.floor(Math.random() * morningStories.length)];
        await sock.sendMessage(from, {
          text: `📖 *${s.title}*\n${s.text}\n\n💡 ${s.lesson}`,
        });
      } else if (cmd === "همسة" || cmd === "همسه") {
        await sock.sendMessage(from, {
          text: whispers[Math.floor(Math.random() * whispers.length)],
        });
      } else if (cmd === "دعاء") {
        await sock.sendMessage(from, { text: sadaqahDua });
      } else if (cmd === "أوامر" || cmd === "اوامر" || cmd === "مساعدة") {
        await sock.sendMessage(from, { text: buildHelpMessage() });
      }
    } catch (err) {
      console.error("خطأ في معالجة الرسالة:", err);
    }
  });
}

function scheduleJobs() {
  cron.schedule(`${MORNING_TIME.split(":")[1]} ${MORNING_TIME.split(":")[0]} * * *`, async () => {
    try {
      const msg = await buildMorningMessage();
      await sock.sendMessage(GROUP_ID, { text: msg });
      console.log("✅ تم نشر أذكار الصباح");
    } catch (err) {
      console.error("خطأ في نشر أذكار الصباح:", err);
    }
  }, { timezone: "Asia/Aden" });

  cron.schedule(`${EVENING_TIME.split(":")[1]} ${EVENING_TIME.split(":")[0]} * * *`, async () => {
    try {
      const msg = await buildEveningMessage();
      await sock.sendMessage(GROUP_ID, { text: msg });
      console.log("✅ تم نشر أذكار المساء");
    } catch (err) {
      console.error("خطأ في نشر أذكار المساء:", err);
    }
  }, { timezone: "Asia/Aden" });

  console.log(`⏰ تم ضبط النشر: الصباح ${MORNING_TIME} والمساء ${EVENING_TIME} (بتوقيت حضرموت)`);
}

connectToWhatsApp().catch((err) => {
  console.error("فشل الاتصال:", err);
  process.exit(1);
});
  
