import { NextResponse } from "next/server";
import { google } from "googleapis";

// ฟังก์ชันช่วยยืนยันตัวตน Google (เขียนครั้งเดียวใช้ได้ทุกระบบ)
const getCalendarAuth = () => {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth });
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      location,
      contactPerson,
      date,
      time,
      displayName,
      userId,
      email,
      attendeeNames,
      targetCalendarId,
    } = body;

    const timeParts = time.split(" - ");
    const startTimeStr = timeParts[0];
    const endTimeStr = timeParts[1] || timeParts[0];

    const calendar = getCalendarAuth();
    const startDateTime = new Date(`${date}T${startTimeStr}:00+07:00`);
    const endDateTime = new Date(`${date}T${endTimeStr}:00+07:00`);
    const calendarIdToUse = targetCalendarId || process.env.GOOGLE_CALENDAR_ID;

    // 🔥 FIX ISSUE 1: ใส่ชื่อผู้เข้าร่วมใน Description แทนการใช้ attendees array ของ Google เพื่อป้องกัน Error Domain-Wide
    const descriptionText = `ผู้บันทึก: ${displayName}\nอีเมล: ${email || "-"}\nผู้ติดต่อ: ${contactPerson || "-"}\nสถานที่: ${location || "-"}\nผู้เข้าร่วม: ${attendeeNames || "-"}\nLINE User ID: ${userId}`;

    const response = await calendar.events.insert({
      calendarId: calendarIdToUse,
      sendUpdates: "none", // ปิดการแจ้งเตือนจาก Google
      requestBody: {
        summary: `🗓️ ${title} | ติดต่อ: ${contactPerson || "ไม่ได้ระบุ"}`,
        location: location || "",
        description: descriptionText,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "Asia/Bangkok",
        },
        end: { dateTime: endDateTime.toISOString(), timeZone: "Asia/Bangkok" },
      },
    });

    return NextResponse.json({
      success: true,
      eventId: response.data.id,
      eventUrl: response.data.htmlLink,
    });
  } catch (error: any) {
    console.error("Calendar POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// 🔥 FIX ISSUE 2: เพิ่มระบบอัปเดต (PUT) นัดหมาย
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      location,
      contactPerson,
      date,
      time,
      displayName,
      userId,
      email,
      attendeeNames,
      targetCalendarId,
      eventId,
    } = body;

    if (!eventId) throw new Error("No Event ID provided");

    const timeParts = time.split(" - ");
    const startTimeStr = timeParts[0];
    const endTimeStr = timeParts[1] || timeParts[0];

    const calendar = getCalendarAuth();
    const startDateTime = new Date(`${date}T${startTimeStr}:00+07:00`);
    const endDateTime = new Date(`${date}T${endTimeStr}:00+07:00`);
    const calendarIdToUse = targetCalendarId || process.env.GOOGLE_CALENDAR_ID;

    const descriptionText = `ผู้บันทึก: ${displayName}\nอีเมล: ${email || "-"}\nผู้ติดต่อ: ${contactPerson || "-"}\nสถานที่: ${location || "-"}\nผู้เข้าร่วม: ${attendeeNames || "-"}\nLINE User ID: ${userId}`;

    const response = await calendar.events.update({
      calendarId: calendarIdToUse,
      eventId: eventId,
      sendUpdates: "none",
      requestBody: {
        summary: `🗓️ ${title} | ติดต่อ: ${contactPerson || "ไม่ได้ระบุ"}`,
        location: location || "",
        description: descriptionText,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "Asia/Bangkok",
        },
        end: { dateTime: endDateTime.toISOString(), timeZone: "Asia/Bangkok" },
      },
    });

    return NextResponse.json({
      success: true,
      eventId: response.data.id,
      eventUrl: response.data.htmlLink,
    });
  } catch (error: any) {
    console.error("Calendar PUT Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// 🔥 FIX ISSUE 2: เพิ่มระบบลบ (DELETE) นัดหมาย
export async function DELETE(request: Request) {
  try {
    const { eventId, targetCalendarId } = await request.json();
    const calendarIdToUse = targetCalendarId || process.env.GOOGLE_CALENDAR_ID;

    if (!eventId) throw new Error("No Event ID provided");

    const calendar = getCalendarAuth();
    await calendar.events.delete({
      calendarId: calendarIdToUse,
      eventId: eventId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Calendar DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
