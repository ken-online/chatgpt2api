"use client";

import { EditableFilePanel } from "./editable-file-panel";

const defaultPrompt = "Tách các phần tử của poster theo đúng vị trí ảnh gốc và ghép thành file PSD chỉnh sửa được, giữ nguyên nền và vị trí layer của từng phần tử, đồng thời xuất file zip chứa tài nguyên của từng layer.";

export function PsdPanel() {
  return <EditableFilePanel title="Tạo PSD" kind="psd" endpoint="/v1/psd/generations" defaultPrompt={defaultPrompt} imageRequired />;
}
