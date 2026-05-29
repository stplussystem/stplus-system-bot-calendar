export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// สร้างการเชื่อมต่อกับ Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const LINE_API_URL = "https://api.line.me/v2/bot/message/push";
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_URL =
  process.env.NEXT_PUBLIC_LIFF_URL ||
  "https://stplus-system-bot-calendar.vercel.app";

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

    const managers = users.filter(
      (u) => u.role === "manager" || u.role === "admin",
    );
    const managerIds = managers.map((m) => m.id);

    // 🔍 4. ดึงข้อมูลคิวงานของ "วันนี้"
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
      // ✅ [แก้ปัญหา]: ค้นหา LINE ID ของคนสร้าง (Manager) แบบครอบคลุม 100%
      const creator = users.find(
        (u) => u.id === app.created_by || u.line_user_id === app.created_by,
      );
      let creatorLineId = null;
      if (creator) {
        creatorLineId =
          creator.line_user_id ||
          (creator.id?.startsWith("U") ? creator.id : null);
      }
      if (!creatorLineId && app.created_by?.startsWith("U")) {
        creatorLineId = app.created_by; // กรณี id ถูกบันทึกเป็น LINE ID มาตรงๆ
      }

      if (creatorLineId) {
        if (!userSchedules[creatorLineId]) userSchedules[creatorLineId] = [];
        // ป้องกันคิวซ้ำ
        if (!userSchedules[creatorLineId].some((a) => a.id === app.id)) {
          userSchedules[creatorLineId].push(app);
        }
      }

      // ✅ จัดการผู้เข้าร่วม (Attendees)
      if (app.attendees && Array.isArray(app.attendees)) {
        app.attendees.forEach((attendeeId: string) => {
          const attendee = users.find(
            (u) => u.id === attendeeId || u.line_user_id === attendeeId,
          );
          let attLineId = null;
          if (attendee) {
            attLineId =
              attendee.line_user_id ||
              (attendee.id?.startsWith("U") ? attendee.id : null);
          }
          if (!attLineId && attendeeId?.startsWith("U")) {
            attLineId = attendeeId;
          }

          if (attLineId) {
            if (!userSchedules[attLineId]) userSchedules[attLineId] = [];
            if (!userSchedules[attLineId].some((a) => a.id === app.id)) {
              userSchedules[attLineId].push(app);
            }
          }
        });
      }
    });

    // 🚀 7. วนลูปยิงข้อความ (ดีไซน์ Carousel ถอดแบบจากเว็บเป๊ะๆ)
    const pushPromises = Object.entries(userSchedules).map(
      async ([lineUserId, apps]) => {
        const sortedApps = apps.sort((a, b) =>
          a.start_time.localeCompare(b.start_time),
        );
        const displayApps = sortedApps.slice(0, 10);

        const bubbles = displayApps.map((item) => {
          const timeStr = `${item.start_time.substring(0, 5)} - ${item.end_time.substring(0, 5)}`;
          const [yy, mm, dd] = item.appointment_date.split("-");
          const appDateObj = new Date(
            parseInt(yy),
            parseInt(mm) - 1,
            parseInt(dd),
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
          const thaiDateStr = `${dayNames[appDateObj.getDay()]}ที่ ${dd}/${mm}/${parseInt(yy) + 543}`;

          const theme = getDayTheme(item.appointment_date);

          let calTypeStr = "ส่วนกลาง";
          if (item.appointment_type === "personal")
            calTypeStr = "🔒 ส่วนตัวของฉัน";
          if (item.appointment_type === "manager") calTypeStr = "ผู้บริหาร";
          if (item.appointment_type === "it") calTypeStr = "ทีม Support";

          return {
            type: "bubble",
            size: "mega",
            header: {
              type: "box",
              layout: "horizontal",
              backgroundColor: theme.light,
              paddingAll: "16px",
              alignItems: "center",
              contents: [
                { type: "text", text: "🧾", flex: 0, size: "md" },
                {
                  type: "text",
                  text: " คิวงานวันนี้",
                  color: theme.dark,
                  weight: "bold",
                  size: "md",
                  margin: "sm",
                  wrap: true,
                },
              ],
            },
            body: {
              type: "box",
              layout: "vertical",
              paddingAll: "20px",
              contents: [
                {
                  type: "text",
                  text: "หัวข้อ",
                  color: "#9ca3af",
                  size: "xs",
                  weight: "bold",
                },
                {
                  type: "text",
                  text: item.title || "-",
                  color: "#111827",
                  size: "lg",
                  weight: "bold",
                  wrap: true,
                },
                {
                  type: "box",
                  layout: "horizontal",
                  backgroundColor: theme.light,
                  cornerRadius: "xl",
                  paddingAll: "16px",
                  margin: "lg",
                  alignItems: "center",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      flex: 4,
                      contents: [
                        {
                          type: "text",
                          text: thaiDateStr,
                          color: theme.dark,
                          size: "sm",
                          weight: "bold",
                          wrap: true,
                        },
                        {
                          type: "text",
                          text: timeStr,
                          color: theme.dark,
                          size: "lg",
                          weight: "bold",
                          wrap: true,
                        },
                      ],
                    },
                    {
                      type: "text",
                      text: "🕒",
                      align: "end",
                      size: "xl",
                      flex: 1,
                    },
                  ],
                },
                {
                  type: "box",
                  layout: "horizontal",
                  margin: "xl",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      flex: 1,
                      contents: [
                        {
                          type: "text",
                          text: "สถานที่",
                          color: "#9ca3af",
                          size: "xs",
                          weight: "bold",
                        },
                        {
                          type: "text",
                          text: item.location || "-",
                          color: "#374151",
                          size: "sm",
                          weight: "bold",
                          wrap: true,
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      flex: 1,
                      contents: [
                        {
                          type: "text",
                          text: "ปฏิทินที่บันทึก",
                          color: "#9ca3af",
                          size: "xs",
                          weight: "bold",
                        },
                        {
                          type: "text",
                          text: calTypeStr,
                          color: "#374151",
                          size: "sm",
                          weight: "bold",
                          wrap: true,
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "box",
                  layout: "horizontal",
                  margin: "lg",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      flex: 1,
                      contents: [
                        {
                          type: "text",
                          text: "ผู้ติดต่อ",
                          color: "#9ca3af",
                          size: "xs",
                          weight: "bold",
                        },
                        {
                          type: "text",
                          text: item.contact_person || "-",
                          color: "#374151",
                          size: "sm",
                          weight: "bold",
                          wrap: true,
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      flex: 1,
                      contents: [
                        {
                          type: "text",
                          text: "เบอร์โทร",
                          color: "#9ca3af",
                          size: "xs",
                          weight: "bold",
                        },
                        {
                          type: "text",
                          text: item.contact_phone || "-",
                          color: "#374151",
                          size: "sm",
                          weight: "bold",
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
              layout: "horizontal",
              spacing: "sm",
              paddingAll: "20px",
              paddingTop: "0px",
              contents: [
                {
                  type: "button",
                  style: "secondary",
                  action: {
                    type: "uri",
                    label: "+ เพิ่มคิวงาน",
                    uri: LIFF_URL,
                  },
                },
                {
                  type: "button",
                  style: "primary",
                  color: "#1f2937",
                  action: {
                    type: "uri",
                    label: "ดูรายการ",
                    uri: `${LIFF_URL}?tab=list`,
                  },
                },
              ],
            },
          };
        });

        const flexMessage = {
          type: "flex",
          altText: "แจ้งเตือนคิวงานวันนี้",
          contents: { type: "carousel", contents: bubbles },
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
      },
    );

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
