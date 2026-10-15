"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import webConfig from "@/constants/common-env";
import { fetchSettingsConfig } from "@/lib/api";
import { getStoredAuthSession } from "@/store/auth";

export function SkillPanel() {
  const [browserBaseUrl, setBrowserBaseUrl] = useState("");
  const [configuredBaseUrl, setConfiguredBaseUrl] = useState("");
  const [authKey, setAuthKey] = useState("");

  useEffect(() => {
    setBrowserBaseUrl(window.location.origin);
    void fetchSettingsConfig().then((data) => setConfiguredBaseUrl(String(data.config.base_url || "").replace(/\/$/, ""))).catch(() => undefined);
    void getStoredAuthSession().then((session) => setAuthKey(session?.key || ""));
  }, []);

  const apiBaseUrl = configuredBaseUrl || webConfig.apiUrl.replace(/\/$/, "") || browserBaseUrl;
  const skillVi = useMemo(() => `---
name: chatgpt2api-search
description: Dùng khi người dùng cần tìm kiếm trên web, tra thông tin mới nhất, kiểm chứng sự thật hoặc cần link nguồn — gọi API tìm kiếm của máy chủ chatgpt2api.
---

# ChatGPT2API Tìm kiếm

Dùng skill này khi người dùng yêu cầu tìm kiếm trên web, tra thông tin mới nhất, kiểm chứng tài liệu, xem tin tức, giá cả, cập nhật tài liệu hoặc cần link nguồn.

## API

POST ${apiBaseUrl}/v1/search

Headers:

Authorization: Bearer ${authKey}
Content-Type: application/json

Body:

{
  "prompt": "<câu hỏi cần tìm kiếm>"
}

## Xử lý kết quả

- Dùng trường \`answer\` trả về làm câu trả lời chính.
- Nếu có \`sources\`, đính kèm các link nguồn trong câu trả lời.
- Nếu API báo lỗi, tóm tắt ngắn lỗi và hỏi người dùng có muốn thử lại không.`, [apiBaseUrl, authKey]);

  const skillEn = useMemo(() => `---
name: chatgpt2api-search
description: Use when current web search is needed through this chatgpt2api server. Call the configured HTTP search endpoint with a prompt and return the answer with source URLs.
---

# ChatGPT2API Search

Use this skill when the user asks for current web search, online lookup, recent information, or source-backed answers. It calls the local chatgpt2api search endpoint and returns an answer with source links.

## When to use

- The user asks to search the web, look something up, verify current information, or find the latest status.
- The answer needs source URLs, recent details, prices, releases, docs, laws, schedules, or news.
- Do not use it for purely local codebase questions unless the user explicitly asks for web search.

## Request

POST ${apiBaseUrl}/v1/search

Headers:

Authorization: Bearer ${authKey}
Content-Type: application/json

JSON body:

{
  "prompt": "<search question>"
}

## Response handling

- Use \`answer\` as the main response.
- Include source URLs from \`sources\` when available.
- If the endpoint returns an error, summarize the error and ask the user whether to retry.
- Keep the final answer concise unless the user asks for detail.`, [apiBaseUrl, authKey]);

  const viPrompt = useMemo(() => `Hãy cài giúp tôi một skill tìm kiếm web trên máy này.

Yêu cầu:
1. Cài thành skill cục bộ theo đúng quy chuẩn cài skill của môi trường hiện tại.
2. Tên skill: chatgpt2api-search
3. Tên file: SKILL.md
4. Nếu không xác định được thư mục skills cục bộ, hãy hỏi tôi cần đặt ở thư mục nào trước, đừng đoán đường dẫn.
5. Chỉ tạo hoặc cập nhật file skill này, không sửa file nào khác.
6. Ghi toàn bộ nội dung bên dưới vào SKILL.md.

Nội dung SKILL.md:

\`\`\`markdown
${skillVi}
\`\`\``, [skillVi]);

  const enPrompt = useMemo(() => `Please install a local web-search skill on this machine.

Requirements:
1. Install this as a local skill according to the skill installation rules of your current environment.
2. Skill name: chatgpt2api-search
3. File name: SKILL.md
4. If you cannot determine the local skills directory, tell me which directory is required before writing files.
5. Only create or update this skill file. Do not modify unrelated files.
6. Write the full content below into SKILL.md.

SKILL.md content:

\`\`\`markdown
${skillEn}
\`\`\``, [skillEn]);

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Đã sao chép");
  };

  const downloadSkill = (text: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "SKILL.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  const versions = [
    { title: "Hướng dẫn cài đặt tiếng Việt", desc: "Sao chép và gửi cho Codex hoặc Claude để cài đặt cục bộ.", prompt: viPrompt, skill: skillVi },
    { title: "English install prompt", desc: "Copy and send this to Codex or Claude to install locally.", prompt: enPrompt, skill: skillEn },
  ];

  return (
    <section className="grid items-stretch gap-4 lg:grid-cols-2">
      {versions.map((item) => (
        <div key={item.title} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div>
              <h2 className="font-medium text-slate-900 dark:text-slate-100">{item.title}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => downloadSkill(item.skill)}>
                <Download />
                Tải xuống
              </Button>
              <Button size="sm" className="cursor-pointer" onClick={() => void copyText(item.prompt)}>
                <Copy />
                Sao chép
              </Button>
            </div>
          </div>
          <pre className="flex-1 whitespace-pre-wrap p-4 font-mono text-sm leading-6">
            {item.prompt}
          </pre>
        </div>
      ))}
    </section>
  );
}
