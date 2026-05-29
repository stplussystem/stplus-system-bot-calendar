import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// สร้างการเชื่อมต่อกับ Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const LINE_API_URL = "https://api.line.me/v2/bot/message/push";
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

export async function GET(request: Request) {
  try {
    // 🔒 1. ตรวจสอบความปลอดภัย
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 📅 2. หาวันที่ของ "วันนี้" (อิงตามเวลาไทย)
    const dateObj = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }),
    );
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    // 🔍 3. ดึงข้อมูล Users ทั้งหมด
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("*");
    if (userError) throw userError;

    // หาเฉพาะ Manager หรือ Admin
    const managers = users.filter(
      (u) => u.role === "manager" || u.role === "admin",
    );
    const managerIds = managers.map((m) => m.id);

    // 🔍 4. ดึงข้อมูลคิวงานของ "วันนี้" ทั้งหมด
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", todayStr);

    if (apptError) throw apptError;

    // 🎯 5. กรองเฉพาะคิวงานที่สร้างโดย Manager
    const managerAppointments = appointments.filter((app) =>
      managerIds.includes(app.created_by),
    );

    if (managerAppointments.length === 0) {
      return NextResponse.json({ message: "No manager appointments today." });
    }

    // 📦 6. จัดกลุ่มคิวงานตาม LINE User ID
    const userSchedules: Record<string, any[]> = {};

    managerAppointments.forEach((app) => {
      // ✅ [แก้ไขแล้ว]: บังคับส่งให้ Manager (คนสร้าง) เสมอ 100% ต่อให้ไม่มี Attendees ก็ตาม
      const creator = users.find((u) => u.id === app.created_by);
      if (creator && creator.line_user_id) {
        if (!userSchedules[creator.line_user_id])
          userSchedules[creator.line_user_id] = [];
        if (!userSchedules[creator.line_user_id].find((a) => a.id === app.id)) {
          userSchedules[creator.line_user_id].push(app);
        }
      }

      // ส่งให้ ผู้เข้าร่วม (Attendees) ถ้ามีการระบุไว้
      if (app.attendees && Array.isArray(app.attendees)) {
        app.attendees.forEach((attendeeId: string) => {
          const attendee = users.find((u) => u.id === attendeeId);
          if (attendee && attendee.line_user_id) {
            if (!userSchedules[attendee.line_user_id])
              userSchedules[attendee.line_user_id] = [];
            if (
              !userSchedules[attendee.line_user_id].find((a) => a.id === app.id)
            ) {
              userSchedules[attendee.line_user_id].push(app);
            }
          }
        });
      }
    });

    // 🚀 7. วนลูปยิงข้อความหาแต่ละคน (ดีไซน์ Flex Carousel สไตล์ Modern SaaS)
    const pushPromises = Object.entries(userSchedules).map(
      async ([lineUserId, apps]) => {
        // เรียงเวลาจากเช้าไปเย็น
        const sortedApps = apps.sort((a, b) =>
          a.start_time.localeCompare(b.start_time),
        );

        // สร้าง Bubble การ์ดสไตล์มินิมอล
        const bubbles = sortedApps.slice(0, 10).map((app) => ({
          type: "bubble",
          size: "kilo", // ขนาดกะทัดรัดพอดีจอสำหรับ Carousel
          body: {
            type: "box",
            layout: "vertical",
            paddingAll: "24px",
            contents: [
              {
                type: "text",
                text: "📅 TODAY'S SCHEDULE",
                weight: "bold",
                color: "#3b82f6", // สีน้ำเงิน Blue 500
                size: "xs",
                style: "normal",
              },
              {
                type: "text",
                text: app.title,
                weight: "bold",
                size: "xl",
                margin: "md",
                wrap: true,
                color: "#0f172a", // สีดำเข้ม Slate 900
              },
              {
                type: "box",
                layout: "vertical",
                margin: "xl",
                spacing: "md",
                contents: [
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "md",
                    contents: [
                      { type: "text", text: "🕒", size: "sm", flex: 0 },
                      {
                        type: "text",
                        text: `${app.start_time.substring(0, 5)} - ${app.end_time.substring(0, 5)}`,
                        size: "sm",
                        color: "#334155",
                        weight: "bold",
                      },
                    ],
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "md",
                    contents: [
                      { type: "text", text: "📍", size: "sm", flex: 0 },
                      {
                        type: "text",
                        text: app.location || "ไม่ระบุสถานที่",
                        size: "sm",
                        color: "#475569",
                        wrap: true,
                      },
                    ],
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "md",
                    contents: [
                      { type: "text", text: "👤", size: "sm", flex: 0 },
                      {
                        type: "text",
                        text: app.contact_person || "-",
                        size: "sm",
                        color: "#475569",
                        wrap: true,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            paddingAll: "16px",
            contents: [
              {
                type: "button",
                action: {
                  type: "uri",
                  label: "เปิดดูปฏิทิน",
                  uri: "https://stplus-system-bot-calendar.vercel.app",
                },
                height: "sm",
                style: "primary",
                color: "#2563eb", // สีปุ่มเป็นน้ำเงิน Vercel/Tailwind
              },
            ],
          },
          styles: {
            footer: {
              separator: true, // เส้นคั่นบางๆ สไตล์ Modern
            },
          },
        }));

        // ประกอบร่างเป็น Carousel
        const flexMessage = {
          type: "flex",
          altText: `แจ้งเตือน! คุณมีคิวงานวันนี้ ${sortedApps.length} รายการ`,
          contents: {
            type: "carousel",
            contents: bubbles,
          },
        };

        // ยิง API ไปที่ LINE
        return fetch(LINE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LINE_TOKEN}`,
          },
          body: JSON.stringify({
            to: lineUserId,
            messages: [flexMessage],
          }),
        });
      },
    );

    // รอให้ส่งข้อความครบทุกคน
    await Promise.all(pushPromises);

    return NextResponse.json({
      success: true,
      message: `Sent morning brief to ${Object.keys(userSchedules).length} users.`,
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
