import { NextResponse } from "next/server";
import { getAttendanceMessage } from "@/lib/lineFlex";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      topicTitle,
      thaiDateStr,
      shiftType,
      teamName,
      checkInTime,
      liffUrl,
    } = body;

    const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!LINE_ACCESS_TOKEN) {
      throw new Error(
        "Missing LINE_CHANNEL_ACCESS_TOKEN in environment variables",
      );
    }

    // สร้าง Flex Message จาก Template ของเรา
    const flexMessage = getAttendanceMessage(
      topicTitle,
      thaiDateStr,
      shiftType,
      teamName,
      checkInTime,
      "ยังไม่ลงชื่อ", // ตอน Check-in ขาออกยังว่างอยู่
      liffUrl,
    );

    // ยิง API ไปหา LINE
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [flexMessage],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("LINE API Error:", errorData);
      throw new Error("Failed to send LINE message");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error pushing message:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
