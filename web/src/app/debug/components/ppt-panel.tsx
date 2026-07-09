"use client";

import { EditableFilePanel } from "./editable-file-panel";

const defaultPrompt = "Cần tạo một bản PPT «Báo cáo vận hành thương mại điện tử Q2/2026» dùng cho cuộc họp quý của ban lãnh đạo, tổng số trang không quá 8, phong cách thiên về công nghệ - thương mại. Trọng tâm thể hiện tăng trưởng doanh số, tăng trưởng người dùng, hiệu quả quảng cáo và kết quả chiến dịch khuyến mãi, trình bày bằng biểu đồ đường, biểu đồ cột, biểu đồ vòng và biểu đồ phễu.";

export function PptPanel() {
  return <EditableFilePanel title="Tạo PPT" kind="ppt" endpoint="/v1/ppt/generations" defaultPrompt={defaultPrompt} />;
}
