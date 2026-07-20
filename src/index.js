import "dotenv/config";
import { promises as fs } from "fs";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
} from "@whiskeysockets/baileys";
import pino from "pino";
import cron from "node-cron";

import {
  buildMorningMessage,
  buildEveningMessage,
  buildPrayerMessage,
  buildHelpMessage,
} from "./utils/messages.js";
import { getHijriDate } from "./utils/hijri.js";
import { getEventForHijriDate } from "./data/hijriEvents.js";
import { morningStories } from "./data/stories.js";
import { whispers } from "./data/whispers.js";
import { sadaqahDua } from "./data/sadaqah.js";

const GROUP_ID = process.env.GROUP_ID;
const MORNING_TIME = process.env.MORNING_TIME || "05:30";
const EVENING_TIME = process.env.EVENING_TIME || "16:00";
const PHONE_NUMBER = process.env.PHONE_NUMBER;

if (!GROUP_ID) {
  console.error("ERROR: الرجاء ضبط GROUP_ID");
  process.exit(1);
}
if (!PHONE_NUMBER) {
  console.error("ERROR: الرجاء ضبط PHONE_NUMBER");
  process.exit(1);
}

// رقم الهاتف بدون أي رموز - أرقام فقط
const CLEAN_PHONE = PHONE_NUMBER.replace(/[^0-9]/g, "");

let sock;
let schedulesStarted = false;
let pairingDone = false;
let reconnectDelay = 10000;

async function clearAuth() {
  try {
    await fs.rm("auth_info", { recursive: true, force: true });
    console.log("تم مسح بيانات الجلسة القديمة");
  } catch (_) {}
}

async function connectToWhatsApp(isReconnect = false) {
  if (!isReconnect) {
    await clearAuth();
    pairingDone = false;
  }

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("Chrome"),
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 2000,
  });

  sock.ev.on("creds.update", saveCreds);

  // طلب كود الربط فور إنشاء الاتصال - قبل ظهور QR
  if (!state.creds.registered && !pairingDone) {
    setTimeout(async () => {
      if (pairingDone) return;
      try {
        pairingDone = true;
        const code = await sock.requestPairingCode(CLEAN_PHONE);
        console.log("");
        console.log("╔══════════════════════════════════╗");
        console.log("║       كود الربط - Pairing Code    ║");
        console.log("║         >>> " + code + " <<<         ║");
        console.log("╚══════════════════════════════════╝");
        console.log("افتح واتساب > النقاط الثلاث > الاجهزة المرتبطة");
        console.log("> ربط جهاز > ربط برقم الهاتف > أدخل الكود");
        console.log("");
      } catch (err) {
        pairingDone = false;
        console.error("فشل طلب كود الربط:", err.message);
        console.log("سيتم إعادة المحاولة عند الاتصال التالي...");
      }
    }, 4000);
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : 0;

      console.log(`انقطع الاتصال - الكود: ${statusCode}`);

      if (statusCode === DisconnectReason.loggedOut) {
        console.log("تم تسجيل الخروج - إعادة البدء من جديد...");
        schedulesStarted = false;
        await clearAuth();
        pairingDone = false;
        reconnectDelay = 10000;
        setTimeout(() => connectToWhatsApp(false), reconnectDelay);
      } else {
        // زيادة تدريجية في وقت الانتظار لتجنب الحظر
        reconnectDelay = Math.min(reconnectDelay * 1.5, 120000);
        console.log(`إعادة الاتصال بعد ${Math.round(reconnectDelay / 1000)} ثانية...`);
        setTimeout(() => connectToWhatsApp(true), reconnectDelay);
      }
    } else if (connection === "open") {
      console.log("تم الاتصال بواتساب بنجاح");
      reconnectDelay = 10000;
      if (!schedulesStarted) {
        schedulesStarted = true;
        scheduleJobs();
      }
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

    const cmd = text.trim();
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
        await sock.sendMessage(from, { text: `${h.dayName} ${h.full}` });
      } else if (cmd === "حدث") {
        const h = getHijriDate();
        await sock.sendMessage(from, {
          text: `حدث في مثل هذا اليوم الهجري\n${getEventForHijriDate(h)}`,
        });
      } else if (cmd === "قصة") {
        const s = morningStories[Math.floor(Math.random() * morningStories.length)];
        await sock.sendMessage(from, {
          text: `${s.title}\n${s.text}\n\n${s.lesson}`,
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
  const [mH, mM] = MORNING_TIME.split(":");
  const [eH, eM] = EVENING_TIME.split(":");

  cron.schedule(
    `${mM} ${mH} * * *`,
    async () => {
      try {
        await sock.sendMessage(GROUP_ID, { text: await buildMorningMessage() });
        console.log("تم نشر أذكار الصباح");
      } catch (err) {
        console.error("خطأ في نشر أذكار الصباح:", err);
      }
    },
    { timezone: "Asia/Aden" }
  );

  cron.schedule(
    `${eM} ${eH} * * *`,
    async () => {
      try {
        await sock.sendMessage(GROUP_ID, { text: await buildEveningMessage() });
        console.log("تم نشر أذكار المساء");
      } catch (err) {
        console.error("خطأ في نشر أذكار المساء:", err);
      }
    },
    { timezone: "Asia/Aden" }
  );

  console.log(`النشر: الصباح ${MORNING_TIME} والمساء ${EVENING_TIME} توقيت اليمن`);
}

connectToWhatsApp(false).catch((err) => {
  console.error("فشل التشغيل:", err);
  process.exit(1);
});
        
