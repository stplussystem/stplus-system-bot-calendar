export const generateCheckinTimelineFlex = (
  workDate: string,
  teamName: string,
  topicName: string,
  checkInTime: string,
  checkOutTime: string | null = null,
  checkpoints: { time: string; location: string }[] = [],
  liffUrl: string,
) => {
  const contentsList: any[] = [];

  // --- Node 1: ลงชื่อเข้างาน ---
  contentsList.push({
    type: "box",
    layout: "horizontal",
    spacing: "lg",
    margin: "xl",
    contents: [
      {
        type: "text",
        text: checkInTime || "-",
        size: "sm",
        gravity: "center",
        align: "end",
        flex: 1,
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
            height: "12px",
            width: "12px",
            borderWidth: "2px",
            borderColor: "#009900",
          },
          { type: "filler" },
        ],
      },
      {
        type: "box",
        layout: "vertical",
        flex: 4,
        gravity: "center",
        contents: [
          {
            type: "text",
            text: "ลงชื่อเข้างาน",
            size: "sm",
            weight: "bold",
            color: "#009900",
          },
          { type: "text", text: "ประจำออฟฟิศ", size: "xs", color: "#9ca3af" },
        ],
      },
    ],
  });

  // --- วนลูปสร้างจุด Checkpoint ---
  let previousLocation = "ประจำออฟฟิศ"; // ใช้เพื่อแสดงเป็นข้อความข้างๆ เส้น

  checkpoints.forEach((cp) => {
    // 1. สร้างเส้นเชื่อม
    contentsList.push({
      type: "box",
      layout: "horizontal",
      spacing: "lg",
      height: "40px",
      contents: [
        {
          type: "box",
          layout: "baseline",
          flex: 1,
          contents: [{ type: "filler" }],
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
                  width: "2px",
                  backgroundColor: "#B7B7B7",
                },
                { type: "filler" },
              ],
            },
          ],
        },
        {
          type: "text",
          text: previousLocation,
          gravity: "top",
          flex: 4,
          size: "xs",
          color: "#8c8c8c",
          wrap: true,
        },
      ],
    });

    // 2. สร้างจุดแวะ (วงกลมสีฟ้า)
    contentsList.push({
      type: "box",
      layout: "horizontal",
      spacing: "lg",
      contents: [
        {
          type: "text",
          text: cp.time || "-",
          size: "sm",
          gravity: "center",
          align: "end",
          flex: 1,
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
              height: "12px",
              width: "12px",
              borderWidth: "2px",
              borderColor: "#3B82F6",
            },
            { type: "filler" },
          ],
        },
        {
          type: "box",
          layout: "vertical",
          flex: 4,
          gravity: "center",
          contents: [
            {
              type: "text",
              text: "จุดแวะ",
              size: "sm",
              weight: "bold",
              color: "#3B82F6",
            },
            {
              type: "text",
              text: cp.location || "-",
              size: "xs",
              color: "#9ca3af",
              wrap: true,
            },
          ],
        },
      ],
    });

    previousLocation = cp.location || "จุดแวะ";
  });

  // --- เส้นเชื่อมก่อนลงเวลาออกงาน ---
  contentsList.push({
    type: "box",
    layout: "horizontal",
    spacing: "lg",
    height: "40px",
    contents: [
      {
        type: "box",
        layout: "baseline",
        flex: 1,
        contents: [{ type: "filler" }],
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
                width: "2px",
                backgroundColor: "#B7B7B7",
              },
              { type: "filler" },
            ],
          },
        ],
      },
      {
        type: "text",
        text: previousLocation,
        gravity: "top",
        flex: 4,
        size: "xs",
        color: "#8c8c8c",
        wrap: true,
      },
    ],
  });

  // --- Node 3: ลงชื่อออกงาน ---
  const outStatusColor = checkOutTime ? "#EF454D" : "#B7B7B7";
  const outTimeText = checkOutTime || "ยังไม่...";
  const outTimeFontColor = checkOutTime ? "#000000" : "#B7B7B7";

  contentsList.push({
    type: "box",
    layout: "horizontal",
    spacing: "lg",
    contents: [
      {
        type: "text",
        text: outTimeText,
        size: "sm",
        gravity: "center",
        align: "end",
        color: outTimeFontColor,
        flex: 1,
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
            height: "12px",
            width: "12px",
            borderWidth: "2px",
            borderColor: outStatusColor,
          },
          { type: "filler" },
        ],
      },
      {
        type: "box",
        layout: "vertical",
        flex: 4,
        gravity: "center",
        contents: [
          {
            type: "text",
            text: "ลงชื่อออกงาน",
            size: "sm",
            weight: "bold",
            color: outStatusColor,
          },
        ],
      },
    ],
  });

  // (ถ้าลงชื่อออกแล้ว ให้เพิ่มหางเส้นสั้นๆ ปิดท้ายเหมือนต้นฉบับ)
  if (checkOutTime) {
    contentsList.push({
      type: "box",
      layout: "horizontal",
      spacing: "lg",
      height: "35px",
      contents: [
        {
          type: "box",
          layout: "baseline",
          flex: 1,
          contents: [{ type: "filler" }],
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
          text: "ลงชื่อออกงานเรียบร้อย",
          gravity: "top",
          flex: 4,
          size: "xs",
          color: "#8c8c8c",
          wrap: true,
        },
      ],
    });
  }

  // ประกอบร่าง Flex Message
  const flexObj: any = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      backgroundColor: "#009900",
      spacing: "md",
      height: "110px",
      paddingTop: "22px",
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
                  text: "เช้า",
                  color: "#ffffff",
                  size: "md",
                  flex: 1,
                  margin: "md",
                },
              ],
            },
            {
              type: "text",
              text: workDate,
              color: "#ffffff",
              size: "lg",
              flex: 4,
              weight: "bold",
              margin: "md",
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
                  text: teamName || "-",
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
              text: topicName || "-",
              color: "#000000",
              size: "sm",
              flex: 1,
              margin: "md",
              wrap: true,
            },
          ],
        },
        ...contentsList,
      ],
    },
  };

  // ถ้ายังไม่ออกงาน ให้โชว์ปุ่มลงเวลาออกงาน
  if (!checkOutTime) {
    flexObj.footer = {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "ลงเวลาออกงาน", uri: liffUrl },
          color: "#EF454D",
          style: "primary",
        },
      ],
    };
  }

  return {
    type: "flex",
    altText: "สถานะการลงเวลาทำงาน",
    contents: flexObj,
  };
};
