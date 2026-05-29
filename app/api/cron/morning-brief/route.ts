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
    // 🔒 1. ตรวจสอบความปลอดภัย (ป้องกันคนอื่นแอบมารัน API ของเรา)
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

    // 🔍 3. ดึงข้อมูล Users ทั้งหมด เพื่อหาว่าใครเป็น Manager บ้าง
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("*");
    if (userError) throw userError;

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

    // 📦 6. จัดกลุ่มคิวงานตาม LINE User ID ของแต่ละคน (คนนึงอาจจะมีหลายคิวงานในวันนี้)
    const userSchedules: Record<string, any[]> = {};

    managerAppointments.forEach((app) => {
      // 6.1 เอาคิวงานใส่ให้ตัว Manager เอง
      const creator = users.find((u) => u.id === app.created_by);
      if (creator && creator.line_user_id) {
        if (!userSchedules[creator.line_user_id])
          userSchedules[creator.line_user_id] = [];
        // ป้องกันคิวซ้ำ
        if (!userSchedules[creator.line_user_id].find((a) => a.id === app.id)) {
          userSchedules[creator.line_user_id].push(app);
        }
      }

      // 6.2 เอาคิวงานใส่ให้ ผู้เข้าร่วม (Attendees) ทุกคน
      if (app.attendees && Array.isArray(app.attendees)) {
        app.attendees.forEach((attendeeId: string) => {
          const attendee = users.find((u) => u.id === attendeeId);
          if (attendee && attendee.line_user_id) {
            if (!userSchedules[attendee.line_user_id])
              userSchedules[attendee.line_user_id] = [];
            // ป้องกันคิวซ้ำ
            if (
              !userSchedules[attendee.line_user_id].find((a) => a.id === app.id)
            ) {
              userSchedules[attendee.line_user_id].push(app);
            }
          }
        });
      }
    });

    // 🚀 7. วนลูปยิงข้อความหาแต่ละคน (สร้างเป็น Flex Carousel)
    const pushPromises = Object.entries(userSchedules).map(
      async ([lineUserId, apps]) => {
        // เรียงเวลาจากเช้าไปเย็น
        const sortedApps = apps.sort((a, b) =>
          a.start_time.localeCompare(b.start_time),
        );

        // สร้าง Bubble การ์ดสำหรับแต่ละคิวงาน
        const bubbles = sortedApps.slice(0, 10).map((app) => ({
          type: "bubble",
          size: "micro",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "แจ้งเตือนคิวงาน 🚨",
                weight: "bold",
                color: "#ffffff",
                size: "sm",
              },
            ],
            backgroundColor: "#2563eb",
            paddingAll: "12px",
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: app.title,
                weight: "bold",
                size: "md",
                wrap: true,
              },
              {
                type: "box",
                layout: "horizontal",
                margin: "md",
                contents: [
                  { type: "text", text: "🕒", size: "sm", flex: 0 },
                  {
                    type: "text",
                    text: `${app.start_time.substring(0, 5)} - ${app.end_time.substring(0, 5)}`,
                    size: "sm",
                    color: "#64748b",
                    margin: "sm",
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                margin: "sm",
                contents: [
                  { type: "text", text: "📍", size: "sm", flex: 0 },
                  {
                    type: "text",
                    text: app.location || "ไม่ระบุ",
                    size: "sm",
                    color: "#64748b",
                    margin: "sm",
                    wrap: true,
                  },
                ],
              },
            ],
            paddingAll: "16px",
          },
        }));

        // ประกอบร่างเป็น Carousel
        const flexMessage = {
          type: "flex",
          altText: `คุณมีคิวงานสำคัญวันนี้ ${sortedApps.length} รายการ`,
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
