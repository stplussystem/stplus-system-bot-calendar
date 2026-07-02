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
  "https://exchange-ending-getaway.ngrok-free.dev/";

const getDayTheme = (dateStr: string) => {
  const themes: { [key: number]: { light: string; dark: string } } = {
    0: { light: "#FEE2E2", dark: "#991B1B" },
    1: { light: "#FEF9C3", dark: "#A16207" },
    2: { light: "#FCE7F3", dark: "#9D174D" },
    3: { light: "#DCFCE7", dark: "#166534" },
    4: { light: "#FFEDD5", dark: "#C2410C" },
    5: { light: "#DBEAFE", dark: "#1E40AF" },
    6: { light: "#F3E8FF", dark: "#6B21A8" },
  };
  const [y, m, d] = dateStr.split("-");
  const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return themes[dateObj.getDay()] || { light: "#F3F4F6", dark: "#374151" };
};

export async function GET(request: Request) {
  try {
    // 🔒 1. ตรวจสอบความปลอดภัย
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🌟 2. ดึงการตั้งค่าจาก Database (เวลา และ ผู้รับ)
    const { data: settings } = await supabase
      .from("company_settings")
      .select("*")
      .in("setting_key", ["cron_bot_time", "cron_bot_target"]);

    const timeSetting =
      settings?.find((s) => s.setting_key === "cron_bot_time")?.setting_value ||
      "07:00";
    const targetSettingStr = settings?.find(
      (s) => s.setting_key === "cron_bot_target",
    )?.setting_value;

    let targetRoles = ["manager", "admin"];
    let targetUsers: string[] = [];

    if (targetSettingStr) {
      try {
        const parsed = JSON.parse(targetSettingStr);
        if (Array.isArray(parsed)) targetRoles = parsed;
        else {
          targetRoles = parsed.roles || [];
          targetUsers = parsed.users || [];
        }
      } catch (e) {
        console.error("Parse error");
      }
    }

    // ⏰ 3. เช็คเวลา (ให้ Vercel เรียกมาทุกชั่วโมง แล้วโค้ดเช็คเวลาตรงนี้)
    const now = new Date();

    // 🔥 ดึงชั่วโมงของไทย (00-23) แบบตรงๆ ป้องกันบั๊ก Vercel Timezone
    let currentHour = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      hour: "numeric",
      hour12: false,
    }).format(now);

    // จัดการกรณี Node.js บางเวอร์ชันคืนค่าเที่ยงคืนเป็น "24" ให้กลายเป็น "00"
    if (currentHour === "24") currentHour = "00";
    currentHour = currentHour.padStart(2, "0");

    const [targetHour] = timeSetting.split(":");

    // 🌟 ระบบล็อคเวลากลับมาทำงานแล้ว! 🌟
    if (currentHour !== targetHour) {
      return NextResponse.json({
        message: `Skipping: Current hour (${currentHour}:00) does not match target hour (${targetHour}:00).`,
      });
    }

    // 📅 4. หาวันที่ของ "วันนี้" (เวลาไทย) แบบชัวร์ 100%
    const y = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
    }).format(now);
    const m = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      month: "2-digit",
    }).format(now);
    const d = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
    }).format(now);
    const todayStr = `${y}-${m}-${d}`;

    // ==========================================
    // 🌟 HR AUTOMATION: ระบบปรับใบลาที่ค้างอนุมัติเป็น "ขาดงาน" อัตโนมัติ
    // ลอจิก: ถ้าสถานะยัง pending และวันที่ลานั้น ผ่านพ้นไปแล้ว (น้อยกว่าวันปัจจุบัน)
    // ==========================================
    const { data: expiredLeaves } = await supabase
      .from("leave_requests")
      .select("id")
      .eq("status", "pending")
      .lt("start_date", todayStr); // เช็คว่าวันที่เริ่มลา ผ่านมาแล้ว

    if (expiredLeaves && expiredLeaves.length > 0) {
      const expiredIds = expiredLeaves.map((l) => l.id);

      // อัปเดตให้กลายเป็น ขาดงาน (absent) และ บังคับอนุมัติ (approved) เพื่อให้นับสถิติ
      await supabase
        .from("leave_requests")
        .update({
          leave_type: "absent",
          status: "approved",
          reject_reason:
            "ระบบปรับเป็นขาดงานอัตโนมัติ เนื่องจากไม่ได้รับการอนุมัติภายในวันที่กำหนด กรุณาติดต่อหัวหน้างานเพื่อสอบถามรายละเอียด",
        })
        .in("id", expiredIds);

      console.log(
        `Auto-absent executed for ${expiredIds.length} expired leave requests.`,
      );
    }
    // ==========================================

    // 🔍 5. ดึงข้อมูล Users และกรองเฉพาะคนที่ "มีสิทธิ์ได้รับข้อความ" (ด่านที่ 1: กรองสิทธิ์)
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("*");
    if (userError) throw userError;

    const validRecipients = users.filter((u) => {
      if (u.is_active === false) return false;
      if (targetRoles.includes(u.role)) return true;
      if (u.line_user_id && targetUsers.includes(u.line_user_id)) return true;
      return false; // ถ้าไม่อยู่ในกลุ่มที่เลือก จะถูกข้าม ไม่กินโควต้า!
    });

    if (validRecipients.length === 0)
      return NextResponse.json({ message: "No valid recipients found." });

    // 🔍 6. ดึงข้อมูลคิวงานของ "วันนี้" ทั้งหมด
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", todayStr)
      .eq("status", "active");

    if (apptError) throw apptError;
    if (!appointments || appointments.length === 0)
      return NextResponse.json({ message: "No appointments today." });

    // 🚀 7. วนลูปรายบุคคล เพื่อสร้างข้อความแบบ Personalized (ของใครของมัน)
    let sentCount = 0;
    const pushPromises = validRecipients.map(async (user) => {
      if (!user.line_user_id) return;

      // 🎯 ด่านที่ 2: กรองเฉพาะงานของคนๆ นี้
      const userApps = appointments.filter((app) => {
        const isOwner = app.user_id === user.line_user_id; // เป็นคนสร้าง
        const isAttendee =
          Array.isArray(app.attendees) &&
          user.gmail &&
          app.attendees.includes(user.gmail); // เป็นผู้เข้าร่วม
        const isShared = app.appointment_type === "shared"; // เป็นงานส่วนกลาง (ทุกคนควรทราบ)

        // ถ้าระบุว่าเป็นผู้บริหาร (Manager/Admin) อาจจะอยากเห็นคิวงานทั้งหมด?
        // ถ้าต้องการให้ Admin เห็นทุกอย่าง ให้ปลดคอมเมนต์บรรทัดล่างนี้ครับ
        // if (user.role === "admin" || user.role === "manager") return true;

        return isOwner || isAttendee || isShared;
      });

      // 🛑 ด่านที่ 3: ถ้าวันนี้ไม่มีคิวงานเลย ไม่ต้องส่ง (ประหยัดโควต้า!)
      if (userApps.length === 0) return;

      const sortedApps = userApps.sort((a, b) =>
        a.start_time.localeCompare(b.start_time),
      );
      const displayApps = sortedApps.slice(0, 10);
      const remainingCount = sortedApps.length - 10;

      const bubbles = displayApps.map((item) => {
        const timeStr = `${item.start_time.substring(0, 5)} - ${item.end_time.substring(0, 5)}`;
        const [yy, mm, dd] = item.appointment_date.split("-");
        const dateObj = new Date(parseInt(yy), parseInt(mm) - 1, parseInt(dd));
        const dayNames = [
          "อาทิตย์",
          "จันทร์",
          "อังคาร",
          "พุธ",
          "พฤหัสบดี",
          "ศุกร์",
          "เสาร์",
        ];
        const thaiDateStr = `${dayNames[dateObj.getDay()]}ที่ ${dd}/${mm}/${parseInt(yy) + 543}`;

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
                text: " คิวงานวันนี้ของคุณ",
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
                action: { type: "uri", label: "+ เพิ่มคิวงาน", uri: LIFF_URL },
              },
              {
                type: "button",
                style: "primary",
                color: "#1f2937",
                action: {
                  type: "uri",
                  label: "ดูรายการ",
                  uri: `${LIFF_URL}?tab=list&filter=today`,
                },
              },
            ],
          },
        };
      });

      if (remainingCount > 0) {
        bubbles.push({
          type: "bubble",
          size: "mega",
          body: {
            type: "box",
            layout: "vertical",
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            contents: [
              {
                type: "text",
                text: `มีคิวงานอีก ${remainingCount} รายการ`,
                weight: "bold",
                color: "#64748b",
                align: "center",
                wrap: true,
              },
              {
                type: "text",
                text: "แตะเพื่อดูทั้งหมด",
                size: "xs",
                color: "#94a3b8",
                align: "center",
                margin: "md",
              },
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            paddingAll: "20px",
            paddingTop: "0px",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#1f2937",
                height: "sm",
                action: {
                  type: "uri",
                  label: "ดูรายการทั้งหมด",
                  uri: `${LIFF_URL}?tab=list&filter=today`,
                },
              },
            ],
          },
        });
      }

      const flexMessage = {
        type: "flex",
        altText: "สรุปคิวงานวันนี้",
        contents: { type: "carousel", contents: bubbles },
      };

      sentCount++;
      return fetch(LINE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LINE_TOKEN}`,
        },
        body: JSON.stringify({
          to: user.line_user_id,
          messages: [flexMessage],
        }),
      });
    });

    await Promise.all(pushPromises);

    return NextResponse.json({
      success: true,
      message: `Sent personalized morning brief to ${sentCount} users.`,
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
