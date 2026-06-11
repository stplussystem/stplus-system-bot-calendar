import { NextResponse } from "next/server";
import { validateSignature } from "@line/bot-sdk";
import { createClient } from "@supabase/supabase-js";
import * as flex from "@/lib/lineFlex";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const channelSecret = (process.env.LINE_CHANNEL_SECRET || "").trim();
const channelAccessToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;
const checkinLiffUrl = `${liffUrl}/checkin`;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const teamLabels: { [key: string]: string } = {
  team_all: "ทั้งหมดทุกคน",
  team_n: "พี่นุ",
  team_a: "พี่หนุ่ม",
  team_b: "พี่หนึ่ง",
  team_c: "พี่บาส",
  team_d: "แคมป์",
  team_e: "หนึ่ง",
  team_f: "ทิ",
  team_g: "พี่แม็ค",
  team_other: "อื่นๆ",
};

const getThaiDateStr = (offsetDays = 0) => {
  const d = new Date();
  const thaiTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  thaiTime.setUTCDate(thaiTime.getUTCDate() + offsetDays);

  const y = thaiTime.getUTCFullYear();
  const m = String(thaiTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(thaiTime.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
};

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-line-signature");
    if (!signature) return new NextResponse("No signature", { status: 400 });

    const rawBody = await request.text();
    if (!validateSignature(rawBody, channelSecret, signature)) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const events = body.events;

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const replyToken = event.replyToken;
        const userMessage = event.message.text.trim();
        const userId = event.source.userId;

        // ==========================================
        // 🌟 1. ระบบแวะจุด Checkpoint ระหว่างวัน
        // ==========================================
        if (userMessage.startsWith("📍 แวะ Checkpoint:")) {
          await startLoading(userId);

          const now = new Date();
          const thaiNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
          const y = thaiNow.getUTCFullYear();
          const m = String(thaiNow.getUTCMonth() + 1).padStart(2, "0");
          const d = String(thaiNow.getUTCDate()).padStart(2, "0");
          const startOfDay = `${y}-${m}-${d}T00:00:00+07:00`;
          const endOfDay = `${y}-${m}-${d}T23:59:59+07:00`;

          const { data: todayLog } = await supabase
            .from("attendance_logs")
            .select(`*, attendance_topics(title, team_type)`)
            .eq("user_id", userId)
            .gte("check_in_time", startOfDay)
            .lte("check_in_time", endOfDay)
            .order("check_in_time", { ascending: false })
            .limit(1)
            .single();

          if (todayLog) {
            const { data: checkpointsData } = await supabase
              .from("attendance_checkpoints")
              .select("*")
              .eq("log_id", todayLog.id)
              .order("checkpoint_time", { ascending: true }); // ดึงจาก checkpoint_time

            const formatTime = (isoString: string) => {
              if (!isoString) return "-";
              return (
                new Date(isoString).toLocaleTimeString("th-TH", {
                  timeZone: "Asia/Bangkok",
                  hour: "2-digit",
                  minute: "2-digit",
                }) + " น."
              );
            };

            const rawDate = new Date(todayLog.check_in_time);
            const thaiDateObj = new Date(
              rawDate.getTime() + 7 * 60 * 60 * 1000,
            );
            const dayNames = [
              "อาทิตย์",
              "จันทร์",
              "อังคาร",
              "พุธ",
              "พฤหัสบดี",
              "ศุกร์",
              "เสาร์",
            ];
            const workDate = `${dayNames[thaiDateObj.getUTCDay()]}ที่ ${String(thaiDateObj.getUTCDate()).padStart(2, "0")}/${String(thaiDateObj.getUTCMonth() + 1).padStart(2, "0")}/${thaiDateObj.getUTCFullYear() + 543}`;

            const checkInTimeStr = formatTime(todayLog.check_in_time);
            const checkOutTimeStr = todayLog.check_out_time
              ? formatTime(todayLog.check_out_time)
              : null;

            const cpList =
              checkpointsData?.map((cp: any) => ({
                time: formatTime(cp.checkpoint_time),
                location: cp.note ? cp.note.replace("แวะจุด: ", "") : "จุดแวะ",
              })) || [];

            const teamStr =
              teamLabels[todayLog.attendance_topics?.team_type] ||
              todayLog.attendance_topics?.team_type ||
              "ทั่วไป";

            const flexMessage = flex.generateCheckinTimelineFlex(
              workDate,
              teamStr,
              todayLog.attendance_topics?.title || "ไม่ทราบสถานที่",
              checkInTimeStr,
              checkOutTimeStr,
              cpList,
              liffUrl,
            );
            await replyToLine(replyToken, [flexMessage]);
          } else {
            await replyToLine(replyToken, [
              { type: "text", text: "ไม่พบประวัติการเข้างานในวันนี้ครับ" },
            ]);
          }
          continue;
        }

        // ==========================================
        // 🌟 2. ระบบลงเวลาเข้า/ออกงาน (แสดง Timeline เสมอ)
        // ==========================================
        if (
          userMessage === "🕘 ลงชื่อเข้างาน" ||
          userMessage === "🕕 ลงชื่อออกงาน"
        ) {
          await startLoading(userId);
          const isCheckin = userMessage === "🕘 ลงชื่อเข้างาน";

          const { data: logs } = await supabase
            .from("attendance_logs")
            .select(`*, attendance_topics ( title, shift_type, team_type )`)
            .eq("user_id", userId)
            .order("check_in_time", { ascending: false })
            .limit(1);

          const log = logs && logs.length > 0 ? logs[0] : null;

          if (log && log.attendance_topics) {
            // ดึง Checkpoint มาโชว์ด้วยเสมอ
            const { data: checkpointsData } = await supabase
              .from("attendance_checkpoints")
              .select("*")
              .eq("log_id", log.id)
              .order("checkpoint_time", { ascending: true });

            const formatTime = (isoString: string) => {
              if (!isoString) return "-";
              return (
                new Date(isoString).toLocaleTimeString("th-TH", {
                  timeZone: "Asia/Bangkok",
                  hour: "2-digit",
                  minute: "2-digit",
                }) + " น."
              );
            };

            const rawDate = new Date(log.check_in_time);
            const thaiDateObj = new Date(
              rawDate.getTime() + 7 * 60 * 60 * 1000,
            );
            const dayNames = [
              "อาทิตย์",
              "จันทร์",
              "อังคาร",
              "พุธ",
              "พฤหัสบดี",
              "ศุกร์",
              "เสาร์",
            ];
            const workDate = `${dayNames[thaiDateObj.getUTCDay()]}ที่ ${String(thaiDateObj.getUTCDate()).padStart(2, "0")}/${String(thaiDateObj.getUTCMonth() + 1).padStart(2, "0")}/${thaiDateObj.getUTCFullYear() + 543}`;

            const checkInTimeStr = formatTime(log.check_in_time);
            const checkOutTimeStr = log.check_out_time
              ? formatTime(log.check_out_time)
              : null;

            const cpList =
              checkpointsData?.map((cp: any) => ({
                time: formatTime(cp.checkpoint_time),
                location: cp.note ? cp.note.replace("แวะจุด: ", "") : "จุดแวะ",
              })) || [];

            const teamStr =
              teamLabels[log.attendance_topics.team_type] ||
              log.attendance_topics.team_type ||
              "ทั่วไป";

            const flexMessage = flex.generateCheckinTimelineFlex(
              workDate,
              teamStr,
              log.attendance_topics.title || "ไม่ทราบสถานที่",
              checkInTimeStr,
              checkOutTimeStr,
              cpList,
              liffUrl,
            );

            // เปลี่ยนแค่ข้อความแจ้งเตือนด้านนอก แล้วส่งเลย (ไม่ซ้อนกล่องแล้ว!)
            flexMessage.altText = isCheckin
              ? "บันทึกเวลาเข้างานเรียบร้อย"
              : "บันทึกเวลาออกงานเรียบร้อย";
            await replyToLine(replyToken, [flexMessage]);
          }
          continue;
        }

        // ==========================================
        // 2. ระบบจัดการคิวงาน (Calendar)
        // ==========================================
        const todayStr = getThaiDateStr(0);

        if (
          ["ดูตารางคิวงานด่วน", "ดูตารางนัดด่วน", "เมนูด่วน"].includes(
            userMessage,
          )
        ) {
          await replyToLine(replyToken, [
            {
              type: "text",
              text: "เลือกดูตารางงานด่วนจากเมนูด้านล่าง 👇",
              quickReply: {
                items: [
                  {
                    type: "action",
                    action: {
                      type: "message",
                      label: "📅 คิวงานวันนี้",
                      text: "คิวงานวันนี้",
                    },
                  },
                  {
                    type: "action",
                    action: {
                      type: "message",
                      label: "🗓️ คิวงานพรุ่งนี้",
                      text: "คิวงานพรุ่งนี้",
                    },
                  },
                  {
                    type: "action",
                    action: {
                      type: "message",
                      label: "📋 คิวงานสัปดาห์นี้",
                      text: "คิวงานสัปดาห์นี้",
                    },
                  },
                  {
                    type: "action",
                    action: {
                      type: "message",
                      label: "📊 คิวงานเดือนนี้",
                      text: "คิวงานเดือนนี้",
                    },
                  },
                  {
                    type: "action",
                    action: {
                      type: "datetimepicker",
                      label: "🔍 ระบุวันที่...",
                      data: "action=search_date",
                      mode: "date",
                    },
                  },
                ],
              },
            },
          ]);
          continue;
        }

        let startDate = "";
        let endDate = "";
        let queryTitle = "";
        let matchDateQuery = false;
        let filterParam = "all";

        const dateRegex =
          /^(?:ระบุวัน|วันที่|คิววันที่|คิวงานวันที่)?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const dateMatch = userMessage.match(dateRegex);

        if (dateMatch) {
          const d = dateMatch[1].padStart(2, "0");
          const m = dateMatch[2].padStart(2, "0");
          let y = parseInt(dateMatch[3]);
          if (y > 2500) y -= 543;
          startDate = `${y}-${m}-${d}`;
          endDate = startDate;
          queryTitle = `คิวงานวันที่ ${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
          matchDateQuery = true;
          filterParam = "custom";
        } else if (
          ["ระบุวัน", "วันที่", "คิววันที่", "คิวงานวันที่"].includes(
            userMessage,
          )
        ) {
          await replyToLine(replyToken, [
            {
              type: "text",
              text: "กรุณาพิมพ์วันที่ต้องการค้นหาในรูปแบบ วัน/เดือน/ปี (พ.ศ.) ครับ\n\n👉 ตัวอย่างเช่น: 24/05/2569 หรือ วันที่ 24/05/2569",
            },
          ]);
          continue;
        } else if (["คิววันนี้", "คิวงานวันนี้"].includes(userMessage)) {
          startDate = todayStr;
          endDate = todayStr;
          queryTitle = "คิวงานวันนี้";
          matchDateQuery = true;
          filterParam = "today";
        } else if (["คิวพรุ่งนี้", "คิวงานพรุ่งนี้"].includes(userMessage)) {
          startDate = getThaiDateStr(1);
          endDate = startDate;
          queryTitle = "คิวงานพรุ่งนี้";
          matchDateQuery = true;
          filterParam = "tomorrow";
        } else if (
          ["คิวสัปดาห์นี้", "คิวงานสัปดาห์นี้"].includes(userMessage)
        ) {
          startDate = todayStr;
          endDate = getThaiDateStr(6);
          queryTitle = "คิวงานสัปดาห์นี้";
          matchDateQuery = true;
          filterParam = "week";
        } else if (["คิวเดือนนี้", "คิวงานเดือนนี้"].includes(userMessage)) {
          startDate = todayStr;
          const d = new Date();
          const thaiTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
          const y = thaiTime.getUTCFullYear();
          const m = thaiTime.getUTCMonth() + 1;
          const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
          endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
          queryTitle = "คิวงานเดือนนี้";
          matchDateQuery = true;
          filterParam = "month";
        }

        if (matchDateQuery) {
          await startLoading(userId);
          const { count } = await supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "active")
            .gte("appointment_date", startDate)
            .lte("appointment_date", endDate);
          const { data, error } = await supabase
            .from("appointments")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "active")
            .gte("appointment_date", startDate)
            .lte("appointment_date", endDate)
            .order("appointment_date", { ascending: true })
            .order("start_time", { ascending: true })
            .limit(10);

          if (error) {
            await replyToLine(replyToken, [
              {
                type: "text",
                text: `❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้ครับ\n\nรายละเอียด Error: ${error.message}`,
              },
            ]);
            continue;
          }
          if (!data || data.length === 0) {
            await replyToLine(replyToken, [
              flex.getEmptyAppointment(queryTitle, liffUrl),
            ]);
          } else {
            const remainingCount = (count || 0) > 10 ? (count || 0) - 10 : 0;
            await replyToLine(replyToken, [
              flex.getDateCarousel(
                data,
                queryTitle,
                remainingCount,
                liffUrl,
                filterParam,
              ),
            ]);
          }
          continue;
        }

        if (userMessage === "📅 บันทึกคิวงาน") {
          console.log("👉 [Webhook] บอทได้รับคำสั่ง '📅 บันทึกคิวงาน' แล้ว!");

          // 1. เรียกใช้ฟังก์ชัน Loading ของพี่แม็ค
          await startLoading(userId);

          // 2. ดึงข้อมูลรายการที่เพิ่งบันทึกไปล่าสุดของคนๆ นี้
          const { data: latestApp, error } = await supabase
            .from("appointments")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }) // 🌟 เปลี่ยนมาเรียงตาม created_at เพื่อป้องกัน Error
            .limit(1)
            .single();

          if (error) {
            console.error("❌ [Webhook] Error ดึงข้อมูลล่าสุด:", error.message);
          }

          if (latestApp) {
            console.log(
              "✅ [Webhook] ดึงข้อมูลสำเร็จ! เตรียมส่ง Flex Message กลับไป",
            );
            // แปลงวันที่ให้อ่านง่าย (dd/mm/yyyy พ.ศ.)
            const d = new Date(latestApp.appointment_date);
            const formattedDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear() + 543}`;
            const timeStr = `${latestApp.start_time.substring(0, 5)} - ${latestApp.end_time.substring(0, 5)} น.`;

            // 3. ใช้ฟังก์ชันตอบกลับของพี่แม็ค ส่ง Flex Message กลับไป
            await replyToLine(replyToken, [
              flex.getSuccessMessage(
                latestApp.title,
                latestApp.location || "-",
                latestApp.contact_person || "-",
                latestApp.attendees && latestApp.attendees.length > 0
                  ? "มีผู้เข้าร่วม"
                  : "-",
                formattedDate,
                timeStr,
                liffUrl,
              ),
            ]);
          }
        } else if (
          ["รายการคิวงาน", "ดูตารางนัด", "ดูตารางคิวงาน"].includes(userMessage)
        ) {
          await startLoading(userId);
          const { count } = await supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "active")
            .gte("appointment_date", todayStr);
          const { data, error } = await supabase
            .from("appointments")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "active")
            .gte("appointment_date", todayStr)
            .order("appointment_date", { ascending: true })
            .order("start_time", { ascending: true })
            .limit(10);

          if (error) {
            await replyToLine(replyToken, [
              { type: "text", text: `❌ Error: ${error.message}` },
            ]);
            continue;
          }
          if (!data || data.length === 0) {
            await replyToLine(replyToken, [
              flex.getEmptyAppointment("รายการคิวงาน", liffUrl),
            ]);
          } else {
            const remainingCount = (count || 0) > 10 ? (count || 0) - 10 : 0;
            await replyToLine(replyToken, [
              flex.getListCarousel(data, remainingCount, liffUrl),
            ]);
          }
        } else if (
          [
            "บันทึกคิวงาน",
            "จองคิว",
            "จองนัด",
            "ลงนัด",
            "เพิ่มคิวงาน",
            "เพิ่มงาน",
            "เพิ่มนัด",
          ].includes(userMessage)
        ) {
          await replyToLine(replyToken, [flex.getOpenForm(liffUrl)]);
        }
      }

      // ==========================================
      // 3. Postback Events (การเลือกวันที่จาก Date Picker)
      // ==========================================
      if (
        event.type === "postback" &&
        event.postback.data === "action=search_date"
      ) {
        const replyToken = event.replyToken;
        const userId = event.source.userId;
        const selectedDate = event.postback.params.date;

        await startLoading(userId);
        const [y, m, d] = selectedDate.split("-");
        const thaiYear = parseInt(y) + 543;
        const queryTitle = `คิวงานวันที่ ${d}/${m}/${thaiYear}`;

        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "active")
          .eq("appointment_date", selectedDate);
        const { data } = await supabase
          .from("appointments")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .eq("appointment_date", selectedDate)
          .order("start_time", { ascending: true })
          .limit(10);

        if (!data || data.length === 0) {
          await replyToLine(replyToken, [
            flex.getEmptyAppointment(queryTitle, liffUrl),
          ]);
        } else {
          const remainingCount = (count || 0) > 10 ? (count || 0) - 10 : 0;
          await replyToLine(replyToken, [
            flex.getDateCarousel(
              data,
              queryTitle,
              remainingCount,
              liffUrl,
              "custom",
            ),
          ]);
        }
        continue;
      }
    }
    return NextResponse.json({ message: "Success" });
  } catch (error) {
    console.error("Webhook Error:", error);
    return new NextResponse("Error", { status: 500 });
  }
}

async function startLoading(chatId: string) {
  const url = "https://api.line.me/v2/bot/chat/loading/start";
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ chatId: chatId, loadingSeconds: 5 }),
  });
}

async function replyToLine(replyToken: string, messages: any[]) {
  const url = "https://api.line.me/v2/bot/message/reply";
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}
