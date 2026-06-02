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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

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

        let startDate = "";
        let endDate = "";
        let queryTitle = "";
        let matchDateQuery = false;
        let filterParam = "all";

        const todayStr = getThaiDateStr(0);

        // ==========================================
        // 🌟 แก้ไขใหม่: รองรับคำสั่งตรงจาก Rich Menu "ตารางงานดูแบบด่วน"
        // ==========================================
        if (
          userMessage === "ดูตารางคิวงานด่วน" ||
          userMessage === "ดูตารางนัดด่วน" ||
          userMessage === "เมนูด่วน"
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
          continue; // จบการทำงานลูปข้อความนี้ทันที
        }

        // 🔥 1. เช็คคำสั่ง ค้นหาวันที่แบบเจาะจง (พิมพ์วันที่ตรงๆ เช่น 29/05/2569)
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
        }
        // 🔥 2. เช็คกรณีพิมพ์คำว่า "ระบุวัน" ลอยๆ ไม่มีวันที่ต่อท้าย (ให้บอทแนะนำ)
        else if (
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
          continue; // หยุดการทำงานไม่ต้องไปค้นหาฐานข้อมูล
        }
        // 🔥 3. เช็คเงื่อนไข วันนี้, พรุ่งนี้, สัปดาห์นี้, เดือนนี้
        else if (
          userMessage === "คิววันนี้" ||
          userMessage === "คิวงานวันนี้"
        ) {
          startDate = todayStr;
          endDate = todayStr;
          queryTitle = "คิวงานวันนี้";
          matchDateQuery = true;
          filterParam = "today";
        } else if (
          userMessage === "คิวพรุ่งนี้" ||
          userMessage === "คิวงานพรุ่งนี้"
        ) {
          startDate = getThaiDateStr(1);
          endDate = startDate;
          queryTitle = "คิวงานพรุ่งนี้";
          matchDateQuery = true;
          filterParam = "tomorrow";
        } else if (
          userMessage === "คิวสัปดาห์นี้" ||
          userMessage === "คิวงานสัปดาห์นี้"
        ) {
          // เปลี่ยนเป็นสัปดาห์นี้
          startDate = todayStr;
          endDate = getThaiDateStr(6);
          queryTitle = "คิวงานสัปดาห์นี้"; // เปลี่ยนเป็นสัปดาห์นี้
          matchDateQuery = true;
          filterParam = "week";
        } else if (
          userMessage === "คิวเดือนนี้" ||
          userMessage === "คิวงานเดือนนี้"
        ) {
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

          const { count, error: countError } = await supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "active")
            .gte("appointment_date", startDate)
            .lte("appointment_date", endDate);

          const totalCount = count || 0;

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
            console.error("Supabase Error:", error);
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
            const remainingCount = totalCount > 10 ? totalCount - 10 : 0;
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

        // ==========================================
        // ส่วนอื่นๆ เช่น แจ้งเตือนสำเร็จ, รายการคิวงาน, ฟอร์มจอง (เหมือนเดิม)
        // ==========================================
        if (
          userMessage.startsWith("ข้อมุลบันทึกคิวงาน") ||
          userMessage.startsWith("ข้อมูลบันทึกคิวงาน")
        ) {
          await startLoading(userId);
          const lines = userMessage.split("\n");
          const extractLine = (keyword: string) => {
            const foundLine = lines.find((l) => l.startsWith(keyword));
            return foundLine ? foundLine.replace(keyword, "").trim() : "-";
          };
          await replyToLine(replyToken, [
            flex.getSuccessMessage(
              extractLine("หัวข้อ:"),
              extractLine("สถานที่:"),
              extractLine("ติดต่อ:"),
              extractLine("ผู้เข้าร่วม:"),
              extractLine("วันที่:"),
              extractLine("เวลา:"),
              liffUrl,
            ),
          ]);
        } else if (
          userMessage === "รายการคิวงาน" ||
          userMessage === "ดูตารางนัด" ||
          userMessage === "ดูตารางคิวงาน"
        ) {
          await startLoading(userId);
          const todayStr = getThaiDateStr(0);
          const { count } = await supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "active")
            .gte("appointment_date", todayStr);
          const totalCount = count || 0;
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
            const remainingCount = totalCount > 10 ? totalCount - 10 : 0;
            await replyToLine(replyToken, [
              flex.getListCarousel(data, remainingCount, liffUrl, "all"),
            ]);
          }
        } else if (
          userMessage === "บันทึกคิวงาน" ||
          userMessage === "จองคิว" ||
          userMessage === "จองนัด" ||
          userMessage === "ลงนัด" ||
          userMessage === "เพิ่มคิวงาน" ||
          userMessage === "เพิ่มงาน" ||
          userMessage === "เพิ่มนัด"
        ) {
          await replyToLine(replyToken, [flex.getOpenForm(liffUrl)]);
        }
      }

      // ==========================================
      // 🌟 เพิ่มใหม่: รับค่าจากระบบปฏิทิน (Datetime Picker)
      // ==========================================
      if (
        event.type === "postback" &&
        event.postback.data === "action=search_date"
      ) {
        const replyToken = event.replyToken;
        const userId = event.source.userId;
        const selectedDate = event.postback.params.date; // จะได้ฟอร์แมต YYYY-MM-DD

        await startLoading(userId);

        // แยก ปี-เดือน-วัน เพื่อเอาไปจัดรูปแบบให้สวยงาม
        const [y, m, d] = selectedDate.split("-");
        const thaiYear = parseInt(y) + 543;
        const queryTitle = `คิวงานวันที่ ${d}/${m}/${thaiYear}`;

        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "active")
          .eq("appointment_date", selectedDate);

        const { data, error } = await supabase
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
