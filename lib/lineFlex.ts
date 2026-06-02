// ไฟล์: lib/lineFlex.ts

// 🔥 ออบเจกต์เก็บชุดสี 7 วัน (Pastel สำหรับพื้นหลัง / Dark สำหรับตัวหนังสือ)
const getDayTheme = (dateStr: string) => {
  const themes: { [key: number]: { light: string; dark: string } } = {
    0: { light: "#FEE2E2", dark: "#991B1B" }, // อาทิตย์ (แดง)
    1: { light: "#FEF9C3", dark: "#A16207" }, // จันทร์ (เหลือง)
    2: { light: "#FCE7F3", dark: "#9D174D" }, // อังคาร (ชมพู)
    3: { light: "#DCFCE7", dark: "#166534" }, // พุธ (เขียว)
    4: { light: "#FFEDD5", dark: "#C2410C" }, // พฤหัสบดี (แสด)
    5: { light: "#DBEAFE", dark: "#1E40AF" }, // ศุกร์ (ฟ้า)
    6: { light: "#F3E8FF", dark: "#6B21A8" }, // เสาร์ (ม่วง)
  };
  const [y, m, d] = dateStr.split("-");
  const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return themes[dateObj.getDay()] || { light: "#F3F4F6", dark: "#374151" };
};

// 1. Flex กรณี "ไม่มีคิวงาน"
export const getEmptyAppointment = (queryTitle: string, liffUrl: string) => ({
  type: "flex",
  altText: `ไม่มี${queryTitle}`,
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "20px",
      alignItems: "center",
      contents: [
        { type: "text", text: "📭", size: "3xl", margin: "md" },
        {
          type: "text",
          text: `ไม่มี${queryTitle}`,
          weight: "bold",
          size: "lg",
          color: "#1e293b",
          margin: "sm",
          wrap: true,
        },
        {
          type: "text",
          text: "คุณยังไม่มีคิวงานในช่วงเวลานี้ครับ",
          size: "sm",
          color: "#64748b",
          wrap: true,
          align: "center",
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
          action: { type: "uri", label: "+ เพิ่มคิวงานใหม่", uri: liffUrl },
        },
      ],
    },
  },
});

// 2. Flex สำหรับแสดง Carousel คิวงาน (ดีไซน์ Pop-up ถอดแบบจากเว็บ)
export const getDateCarousel = (
  displayData: any[],
  queryTitle: string,
  remainingCount: number,
  liffUrl: string,
  filterParam: string = "all",
) => {
  const bubbles = displayData.map((item: any) => {
    const timeStr = `${item.start_time.substring(0, 5)} - ${item.end_time.substring(0, 5)}`;
    const [y, m, d] = item.appointment_date.split("-");
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const dayNames = [
      "อาทิตย์",
      "จันทร์",
      "อังคาร",
      "พุธ",
      "พฤหัสบดี",
      "ศุกร์",
      "เสาร์",
    ];
    const thaiDateStr = `${dayNames[dateObj.getDay()]}ที่ ${d}/${m}/${parseInt(y) + 543}`;

    const theme = getDayTheme(item.appointment_date);

    let calTypeStr = "ส่วนกลาง";
    if (item.appointment_type === "personal") calTypeStr = "🔒 ส่วนตัวของฉัน";
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
          // 🔥 เปลี่ยนมาใช้ queryTitle ที่ผู้ใช้พิมพ์ และใส่ wrap: true
          {
            type: "text",
            text: ` ${queryTitle}`,
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

          // 🔥 กล่องวันที่และเวลา: ปรับสัดส่วน flex และใส่ wrap: true ป้องกันตกขอบ
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
              { type: "text", text: "🕒", align: "end", size: "xl", flex: 1 },
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
            action: { type: "uri", label: "+ เพิ่มคิวงาน", uri: liffUrl },
          },
          {
            type: "button",
            style: "primary",
            color: "#1f2937",
            action: {
              type: "uri",
              label: "ดูรายการ",
              uri: `${liffUrl}?tab=list&filter=${filterParam}`,
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
              uri: `${liffUrl}?tab=list&filter=${filterParam}`,
            },
          },
        ],
      },
    });
  }
  return {
    type: "flex",
    altText: queryTitle,
    contents: { type: "carousel", contents: bubbles },
  };
};

// 3. Flex แจ้งเตือนบันทึกสำเร็จ
export const getSuccessMessage = (
  title: string,
  location: string,
  contactPerson: string,
  attendees: string,
  date: string,
  time: string,
  liffUrl: string,
) => ({
  type: "flex",
  altText: "บันทึกคิวงานสำเร็จ",
  contents: {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#2563EB",
      contents: [
        { type: "text", text: "บันทึกคิวงานสำเร็จ", color: "#ffffff" },
      ],
    },
    hero: {
      type: "image",
      url: "https://uppic.cloud/ib/NsNQAhgQLNa5pqA_1779854528.jpg",
      size: "full",
      aspectRatio: "20:7",
      aspectMode: "cover",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: title || "ไม่มีหัวข้อ",
          weight: "bold",
          size: "md",
          color: "#3f3f3f",
          wrap: true,
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "icon",
                  url: "https://uppic.cloud/ib/xk5zIatFiWLFxER_1779854220.png",
                  size: "sm",
                },
                {
                  type: "text",
                  text: "สถานที่ :",
                  color: "#aaaaaa",
                  size: "xs",
                  flex: 2,
                  weight: "bold",
                },
                {
                  type: "text",
                  text: location || "-",
                  wrap: true,
                  color: "#666666",
                  size: "xs",
                  flex: 5,
                  align: "start",
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "icon",
                  url: "https://uppic.cloud/ib/UKRJf8dfdi5YIlT_1779854220.png",
                  size: "sm",
                },
                {
                  type: "text",
                  text: "ติดต่อ :",
                  color: "#aaaaaa",
                  size: "xs",
                  flex: 2,
                  align: "start",
                  weight: "bold",
                },
                {
                  type: "text",
                  text: contactPerson || "-",
                  wrap: true,
                  color: "#666666",
                  size: "xs",
                  flex: 5,
                  align: "start",
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "icon",
                  url: "https://uppic.cloud/ib/hkeWu3a2kL08WB6_1779859532.png",
                  size: "sm",
                },
                {
                  type: "text",
                  text: "ผู้เข้าร่วม :",
                  color: "#aaaaaa",
                  size: "xs",
                  flex: 2,
                  align: "start",
                  weight: "bold",
                },
                {
                  type: "text",
                  text: attendees || "-",
                  wrap: true,
                  color: "#666666",
                  size: "xs",
                  flex: 5,
                  align: "start",
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "icon",
                  url: "https://uppic.cloud/ib/OPhZDwS3nY4gpvg_1779854220.png",
                  size: "sm",
                },
                {
                  type: "text",
                  text: "วัน-เวลา :",
                  color: "#aaaaaa",
                  size: "xs",
                  flex: 2,
                  align: "start",
                  weight: "bold",
                },
                {
                  type: "text",
                  text: `${date} ${time}`,
                  wrap: true,
                  color: "#666666",
                  size: "xs",
                  flex: 5,
                  align: "start",
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
      paddingAll: "6px",
      paddingTop: "0px",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#2563eb",
          action: {
            type: "uri",
            label: "📋 ดูรายการคิวงาน",
            uri: `${liffUrl}?tab=list`,
          },
        },
        {
          type: "button",
          style: "secondary",
          action: { type: "uri", label: "📝 เพิ่มบันทึกคิวงาน", uri: liffUrl },
        },
      ],
    },
  },
});

// 4. Flex สำหรับคำสั่ง "รายการคิวงาน"
export const getListCarousel = (
  data: any[],
  remainingCount: number,
  liffUrl: string,
) => {
  return getDateCarousel(
    data,
    "รายการคิวงานทั้งหมด",
    remainingCount,
    liffUrl,
    "all",
  );
};

// 5. Flex เปิดฟอร์ม
export const getOpenForm = (liffUrl: string) => ({
  type: "flex",
  altText: "ฟอร์มบันทึกคิวงาน",
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "20px",
      contents: [
        {
          type: "text",
          text: "STPLUS SYSTEM",
          weight: "bold",
          color: "#2563eb",
          size: "sm",
        },
        {
          type: "text",
          text: "สร้างคิวงานใหม่",
          weight: "bold",
          size: "xl",
          wrap: true,
        },
        {
          type: "text",
          text: "แตะที่ปุ่มด้านล่างเพื่อเปิดแบบฟอร์มบันทึกคิวงานครับ",
          color: "#64748b",
          size: "sm",
          wrap: true,
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
          action: {
            type: "uri",
            label: "📝 เปิดฟอร์มสร้างคิวงาน",
            uri: liffUrl,
          },
        },
      ],
    },
  },
});

// ==========================================
// 6. Flex แจ้งเตือนการ Check-in / Check-out
// ==========================================
export const getAttendanceMessage = (
  isCheckin: boolean,
  data: {
    shift: string;
    date: string;
    team: string;
    topic: string;
    inTime: string;
    inLocation: string;
    outTime: string;
    outLocation: string;
  },
  checkinLiffUrl: string,
) => {
  const headerColor = isCheckin ? "#009900" : "#EF454D";

  const flex: any = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "กะการทำงาน :",
                  color: "#ffffff66",
                  size: "md",
                  flex: 0,
                },
                {
                  type: "text",
                  text: data.shift,
                  color: "#ffffff",
                  size: "md",
                  flex: 1,
                  margin: "md",
                },
              ],
            },
            {
              type: "text",
              text: data.date,
              color: "#ffffff",
              size: "lg",
              flex: 4,
              weight: "bold",
              margin: "sm",
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "ทีม :",
                  color: "#ffffff66",
                  size: "md",
                  flex: 0,
                },
                {
                  type: "text",
                  text: data.team,
                  color: "#ffffff",
                  size: "md",
                  flex: 1,
                  margin: "md",
                },
              ],
            },
          ],
        },
      ],
      paddingAll: "20px",
      backgroundColor: headerColor,
      spacing: "md",
      height: "110px",
      paddingTop: "22px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "baseline",
          contents: [
            {
              type: "text",
              text: "ชื่องาน :",
              color: "#b7b7b7",
              size: "sm",
              flex: 0,
            },
            {
              type: "text",
              text: data.topic,
              color: "#000000",
              size: "sm",
              flex: 1,
              margin: "md",
              wrap: true,
            },
          ],
        },
        // 🟢 กล่องลงเวลาเข้างาน
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: data.inTime, size: "sm", gravity: "center" },
            {
              type: "box",
              layout: "vertical",
              flex: 0,
              margin: "xs",
              contents: [
                { type: "filler" },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [],
                  cornerRadius: "30px",
                  height: "12px",
                  width: "12px",
                  borderWidth: "2px",
                  borderColor: "#008000",
                },
                { type: "filler" },
              ],
            },
            {
              type: "text",
              text: "ลงชื่อเข้างาน",
              gravity: "center",
              flex: 4,
              size: "sm",
              color: "#008000",
            },
          ],
          spacing: "lg",
          cornerRadius: "30px",
          margin: "xl",
        },
        // เส้นเชื่อมต่อ (เข้า)
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "box",
              layout: "baseline",
              contents: [{ type: "filler" }],
              flex: 1,
            },
            {
              type: "box",
              layout: "vertical",
              width: "12px",
              margin: "xs",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  flex: 1,
                  contents: [
                    { type: "filler" },
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [],
                      width: isCheckin ? "0px" : "2px",
                      backgroundColor: "#B7B7B7",
                    },
                    { type: "filler" },
                  ],
                },
              ],
            },
            {
              type: "text",
              text: data.inLocation,
              gravity: "top",
              flex: 4,
              size: "xs",
              color: "#8c8c8c",
              wrap: true,
            },
          ],
          spacing: "lg",
          height: isCheckin ? "35px" : "64px",
        },
      ],
    },
  };

  // 🔴 ถ้าเป็นการลงชื่อออกงาน ให้ต่อกล่องสีแดงเข้าไป
  if (!isCheckin) {
    flex.body.contents.push(
      {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            flex: 1,
            contents: [
              {
                type: "text",
                text: data.outTime,
                gravity: "center",
                size: "sm",
              },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            flex: 0,
            margin: "xs",
            contents: [
              { type: "filler" },
              {
                type: "box",
                layout: "vertical",
                contents: [],
                cornerRadius: "30px",
                width: "12px",
                height: "12px",
                borderWidth: "2px",
                borderColor: "#EF454D",
              },
              { type: "filler" },
            ],
          },
          {
            type: "text",
            text: "ลงชื่อออกงาน",
            gravity: "center",
            flex: 4,
            size: "sm",
            color: "#EF454D",
          },
        ],
        spacing: "lg",
        cornerRadius: "30px",
      },
      {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "box",
            layout: "baseline",
            contents: [{ type: "filler" }],
            flex: 1,
          },
          {
            type: "box",
            layout: "vertical",
            width: "12px",
            margin: "xs",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                flex: 1,
                contents: [
                  { type: "filler" },
                  {
                    type: "box",
                    layout: "vertical",
                    contents: [],
                    width: "0px",
                    backgroundColor: "#6486E3",
                    height: "30px",
                  },
                  { type: "filler" },
                ],
              },
            ],
          },
          {
            type: "text",
            text: data.outLocation,
            gravity: "top",
            flex: 4,
            size: "xs",
            color: "#8c8c8c",
            wrap: true,
          },
        ],
        spacing: "lg",
        height: "35px",
      },
    );
  } else {
    // 🟢 ถ้าเพิ่งเข้างาน ให้ใส่ปุ่มลงชื่อออก
    flex.footer = {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "ลงเวลาออกงาน", uri: checkinLiffUrl },
          color: "#009900",
          style: "primary", // เพิ่ม style ให้ปุ่มดูชัดขึ้น
        },
      ],
    };
  }

  return flex;
};
