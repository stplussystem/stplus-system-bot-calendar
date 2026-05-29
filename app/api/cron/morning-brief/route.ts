import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// สร้างการเชื่อมต่อกับ Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LINE_API_URL = "https://api.line.me/v2/bot/message/push";
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_URL = process.env.NEXT_PUBLIC_LIFF_URL || "https://stplus-system-bot-calendar.vercel.app"; // เปลี่ยนเป็น URL จริงได้ครับ

// ฟังก์ชันหาธีมสีตามวัน
const getDayTheme = (dateStr: string) => {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay();
  const themes: Record<number, { light: string; dark: string }> = {
    0: { light: "#fef2f2", dark: "#b91c1c" }, // อา - แดง
    1: { light: "#fefce8", dark: "#a16207" }, // จ - เหลือง
    2: { light: "#fdf2f8", dark: "#be185d" }, // อ - ชมพู
    3: { light: "#f0fdf4", dark: "#15803d" }, // พ - เขียว
    4: { light: "#fff7ed", dark: "#c2410c" }, // พฤ - ส้ม
    5: { light: "#eff6ff", dark: "#1d4ed8" }, // ศ - ฟ้า
    6: { light: "#f5f3ff", dark: "#6d28d9" }, // ส - ม่วง
  };
  return themes[day] || { light: "#eff6ff", dark: "#1d4ed8" };
};

export async function GET(request: Request) {
  try {
    // 🔒 1. ตรวจสอบความปลอดภัย
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 📅 2. หาวันที่ของ "วันนี้"
    const dateObj = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    // 🔍 3. ดึงข้อมูล Users ทั้งหมด
    const { data: users, error: userError } = await supabase.from("users").select("*");
    if (userError) throw userError;

    const managers = users.filter((u) => u.role === "manager" || u.role === "admin");
    const managerIds = managers.map((m) => m.id);

    // 🔍 4. ดึงข้อมูลคิวงานของ "วันนี้"
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", todayStr);
    
    if (apptError) throw apptError;

    // 🎯 5. กรองเฉพาะคิวงานที่สร้างโดย Manager
    const managerAppointments = appointments.filter((app) => managerIds.includes(app.created_by));

    if (managerAppointments.length === 0) {
      return NextResponse.json({ message: "No manager appointments today." });
    }

    // 📦 6. จัดกลุ่มคิวงานตาม LINE User ID
    const userSchedules: Record<string, any[]> = {};

    managerAppointments.forEach((app) => {
      // ✅ [แก้ปัญหาที่ 1]: บังคับใส่คนสร้าง (Manager) ลงในลิสต์รับข้อความ 100%
      const creator = users.find((u) => u.id === app.created_by || u.line_user_id === app.created_by);
      const creatorLineId = creator?.line_user_id || (app.created_by?.startsWith('U') ? app.created_by : null);
      
      if (creatorLineId) {
        if (!userSchedules[creatorLineId]) userSchedules[creatorLineId] = [];
        if (!userSchedules[creatorLineId].find((a) => a.id === app.id)) {
          userSchedules[creatorLineId].push(app);
        }
      }

      // ส่งให้ ผู้เข้าร่วม (Attendees) ทุกคน
      if (app.attendees && Array.isArray(app.attendees)) {
        app.attendees.forEach((attendeeId: string) => {
          const attendee = users.find((u) => u.id === attendeeId || u.line_user_id === attendeeId);
          const attLineId = attendee?.line_user_id || (attendeeId.startsWith('U') ? attendeeId : null);
          
          if (attLineId) {
            if (!userSchedules[attLineId]) userSchedules[attLineId] = [];
            if (!userSchedules[attLineId].find((a) => a.id === app.id)) {
              userSchedules[attLineId].push(app);
            }
          }
        });
      }
    });

    // 🚀 7. วนลูปยิงข้อความ (ดีไซน์ Carousel ถอดแบบจากระบบ[cite: 2])
    const pushPromises = Object.entries(userSchedules).map(async ([lineUserId, apps]) => {
      const sortedApps = apps.sort((a, b) => a.start_time.localeCompare(b.start_time));
      const displayApps = sortedApps.slice(0, 10);

      const bubbles = displayApps.map((item) => {
        const timeStr = `${item.start_time.substring(0, 5)} - ${item.end_time.substring(0, 5)}`;[cite: 2]
        const [yy, mm, dd] = item.appointment_date.split("-");[cite: 2]
        const appDateObj = new Date(parseInt(yy), parseInt(mm) - 1, parseInt(dd));[cite: 2]
        const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];[cite: 2]
        const thaiDateStr = `${dayNames[appDateObj.getDay()]}ที่ ${dd}/${mm}/${parseInt(yy) + 543}`;[cite: 2]

        const theme = getDayTheme(item.appointment_date);[cite: 2]

        let calTypeStr = "ส่วนกลาง";[cite: 2]
        if (item.appointment_type === "personal") calTypeStr = "🔒 ส่วนตัวของฉัน";[cite: 2]
        if (item.appointment_type === "manager") calTypeStr = "ผู้บริหาร";[cite: 2]
        if (item.appointment_type === "it") calTypeStr = "ทีม Support";[cite: 2]

        return {
          type: "bubble",[cite: 2]
          size: "mega",[cite: 2]
          header: {
            type: "box",[cite: 2]
            layout: "horizontal",[cite: 2]
            backgroundColor: theme.light,[cite: 2]
            paddingAll: "16px",[cite: 2]
            alignItems: "center",[cite: 2]
            contents: [
              { type: "text", text: "🧾", flex: 0, size: "md" },[cite: 2]
              {
                type: "text",[cite: 2]
                text: " คิวงานวันนี้", 
                color: theme.dark,[cite: 2]
                weight: "bold",[cite: 2]
                size: "md",[cite: 2]
                margin: "sm",[cite: 2]
                wrap: true,[cite: 2]
              },
            ],
          },
          body: {
            type: "box",[cite: 2]
            layout: "vertical",[cite: 2]
            paddingAll: "20px",[cite: 2]
            contents: [
              {
                type: "text",[cite: 2]
                text: "หัวข้อ",[cite: 2]
                color: "#9ca3af",[cite: 2]
                size: "xs",[cite: 2]
                weight: "bold",[cite: 2]
              },
              {
                type: "text",[cite: 2]
                text: item.title || "-",[cite: 2]
                color: "#111827",[cite: 2]
                size: "lg",[cite: 2]
                weight: "bold",[cite: 2]
                wrap: true,[cite: 2]
              },
              {
                type: "box",[cite: 2]
                layout: "horizontal",[cite: 2]
                backgroundColor: theme.light,[cite: 2]
                cornerRadius: "xl",[cite: 2]
                paddingAll: "16px",[cite: 2]
                margin: "lg",[cite: 2]
                alignItems: "center",[cite: 2]
                contents: [
                  {
                    type: "box",[cite: 2]
                    layout: "vertical",[cite: 2]
                    flex: 4,[cite: 2]
                    contents: [
                      {
                        type: "text",[cite: 2]
                        text: thaiDateStr,[cite: 2]
                        color: theme.dark,[cite: 2]
                        size: "sm",[cite: 2]
                        weight: "bold",[cite: 2]
                        wrap: true,[cite: 2]
                      },
                      {
                        type: "text",[cite: 2]
                        text: timeStr,[cite: 2]
                        color: theme.dark,[cite: 2]
                        size: "lg",[cite: 2]
                        weight: "bold",[cite: 2]
                        wrap: true,[cite: 2]
                      },
                    ],
                  },
                  { type: "text", text: "🕒", align: "end", size: "xl", flex: 1 },[cite: 2]
                ],
              },
              {
                type: "box",[cite: 2]
                layout: "horizontal",[cite: 2]
                margin: "xl",[cite: 2]
                contents: [
                  {
                    type: "box",[cite: 2]
                    layout: "vertical",[cite: 2]
                    flex: 1,[cite: 2]
                    contents: [
                      {
                        type: "text",[cite: 2]
                        text: "สถานที่",[cite: 2]
                        color: "#9ca3af",[cite: 2]
                        size: "xs",[cite: 2]
                        weight: "bold",[cite: 2]
                      },
                      {
                        type: "text",[cite: 2]
                        text: item.location || "-",[cite: 2]
                        color: "#374151",[cite: 2]
                        size: "sm",[cite: 2]
                        weight: "bold",[cite: 2]
                        wrap: true,[cite: 2]
                      },
                    ],
                  },
                  {
                    type: "box",[cite: 2]
                    layout: "vertical",[cite: 2]
                    flex: 1,[cite: 2]
                    contents: [
                      {
                        type: "text",[cite: 2]
                        text: "ปฏิทินที่บันทึก",[cite: 2]
                        color: "#9ca3af",[cite: 2]
                        size: "xs",[cite: 2]
                        weight: "bold",[cite: 2]
                      },
                      {
                        type: "text",[cite: 2]
                        text: calTypeStr,[cite: 2]
                        color: "#374151",[cite: 2]
                        size: "sm",[cite: 2]
                        weight: "bold",[cite: 2]
                        wrap: true,[cite: 2]
                      },
                    ],
                  },
                ],
              },
              {
                type: "box",[cite: 2]
                layout: "horizontal",[cite: 2]
                margin: "lg",[cite: 2]
                contents: [
                  {
                    type: "box",[cite: 2]
                    layout: "vertical",[cite: 2]
                    flex: 1,[cite: 2]
                    contents: [
                      {
                        type: "text",[cite: 2]
                        text: "ผู้ติดต่อ",[cite: 2]
                        color: "#9ca3af",[cite: 2]
                        size: "xs",[cite: 2]
                        weight: "bold",[cite: 2]
                      },
                      {
                        type: "text",[cite: 2]
                        text: item.contact_person || "-",[cite: 2]
                        color: "#374151",[cite: 2]
                        size: "sm",[cite: 2]
                        weight: "bold",[cite: 2]
                        wrap: true,[cite: 2]
                      },
                    ],
                  },
                  {
                    type: "box",[cite: 2]
                    layout: "vertical",[cite: 2]
                    flex: 1,[cite: 2]
                    contents: [
                      {
                        type: "text",[cite: 2]
                        text: "เบอร์โทร",[cite: 2]
                        color: "#9ca3af",[cite: 2]
                        size: "xs",[cite: 2]
                        weight: "bold",[cite: 2]
                      },
                      {
                        type: "text",[cite: 2]
                        text: item.contact_phone || "-",[cite: 2]
                        color: "#374151",[cite: 2]
                        size: "sm",[cite: 2]
                        weight: "bold",[cite: 2]
                        wrap: true,[cite: 2]
                      },
                    ],
                  },
                ],
              },
            ],
          },
          footer: {
            type: "box",[cite: 2]
            layout: "horizontal",[cite: 2]
            spacing: "sm",[cite: 2]
            paddingAll: "20px",[cite: 2]
            paddingTop: "0px",[cite: 2]
            contents: [
              {
                type: "button",[cite: 2]
                style: "secondary",[cite: 2]
                action: { type: "uri", label: "+ เพิ่มคิวงาน", uri: LIFF_URL },[cite: 2]
              },
              {
                type: "button",[cite: 2]
                style: "primary",[cite: 2]
                color: "#1f2937",[cite: 2]
                action: {
                  type: "uri",[cite: 2]
                  label: "ดูรายการ",[cite: 2]
                  uri: `${LIFF_URL}?tab=list`, 
                },
              },
            ],
          },
        };
      });

      const flexMessage = {
        type: "flex",[cite: 2]
        altText: "แจ้งเตือนคิวงานวันนี้", 
        contents: { type: "carousel", contents: bubbles },[cite: 2]
      };

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
    });

    await Promise.all(pushPromises);

    return NextResponse.json({ success: true, message: `Sent morning brief to ${Object.keys(userSchedules).length} users.` });
    
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}