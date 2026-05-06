#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(WEB_ROOT, "..");
const SRC_DIR = join(WEB_ROOT, "src");
const DICT_PATH = join(__dirname, "i18n-dict.json");
const KEEP_PATH = join(__dirname, "i18n-keep.json");

const CJK_RE = /[　-鿿＀-￯]/u;
const FILE_EXT = /\.(tsx?|jsx?)$/;

function loadKeep() {
  if (!existsSync(KEEP_PATH)) return new Set();
  const raw = JSON.parse(readFileSync(KEEP_PATH, "utf-8"));
  const list = Array.isArray(raw) ? raw : Array.isArray(raw.keep) ? raw.keep : [];
  return new Set(list);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (FILE_EXT.test(entry)) out.push(full);
  }
  return out;
}

function extractTokens(line) {
  const tokens = [];
  const patterns = [
    { re: /"((?:\\.|[^"\\])*)"/g, kind: "dq" },
    { re: /'((?:\\.|[^'\\])*)'/g, kind: "sq" },
    { re: /`([^`${}]*)`/g, kind: "bt" },
  ];
  for (const p of patterns) {
    p.re.lastIndex = 0;
    let m;
    while ((m = p.re.exec(line)) !== null) {
      tokens.push({ kind: p.kind, value: m[1], index: m.index });
    }
  }
  const jx = />([^<>{}\n]*?)</g;
  let m;
  while ((m = jx.exec(line)) !== null) {
    if (m[1].trim()) tokens.push({ kind: "jx", value: m[1], index: m.index + 1 });
  }
  return tokens.sort((a, b) => a.index - b.index);
}

function loadDict() {
  if (!existsSync(DICT_PATH)) return {};
  return JSON.parse(readFileSync(DICT_PATH, "utf-8"));
}

function saveDict(dict) {
  const sorted = Object.fromEntries(
    Object.entries(dict).sort(([a], [b]) => b.length - a.length || a.localeCompare(b)),
  );
  mkdirSync(dirname(DICT_PATH), { recursive: true });
  writeFileSync(DICT_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}

function cmdExtract(baseRef) {
  const dict = loadDict();
  const keep = loadKeep();
  let added = 0;
  let conflicts = 0;
  let skipped = 0;
  const ref = baseRef || "HEAD";

  const diff = execSync(`git diff ${ref} -- web/src`, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });

  const lines = diff.split("\n");
  let oldBuf = [];
  let newBuf = [];

  const flush = () => {
    const len = Math.min(oldBuf.length, newBuf.length);
    for (let i = 0; i < len; i++) {
      const oldTokens = extractTokens(oldBuf[i]);
      const newTokens = extractTokens(newBuf[i]);
      const n = Math.min(oldTokens.length, newTokens.length);
      for (let j = 0; j < n; j++) {
        const ot = oldTokens[j];
        const nt = newTokens[j];
        if (ot.kind !== nt.kind) continue;
        if (ot.value === nt.value) continue;
        if (!CJK_RE.test(ot.value)) continue;
        if (keep.has(ot.value)) {
          skipped++;
          continue;
        }
        if (dict[ot.value] && dict[ot.value] !== nt.value) conflicts++;
        if (!(ot.value in dict)) added++;
        dict[ot.value] = nt.value;
      }
    }
    oldBuf = [];
    newBuf = [];
  };

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    if (line.startsWith("@@") || line.startsWith("diff ")) {
      flush();
      continue;
    }
    if (line.startsWith("-")) oldBuf.push(line.slice(1));
    else if (line.startsWith("+")) newBuf.push(line.slice(1));
    else flush();
  }
  flush();

  for (const k of keep) delete dict[k];

  saveDict(dict);
  console.log(`✓ Extract xong: thêm ${added} cặp mới, ${conflicts} conflict (cái sau ghi đè), ${skipped} cặp bị skip (whitelist).`);
  console.log(`  Tổng số entry: ${Object.keys(dict).length}`);
  console.log(`  Lưu tại: ${relative(REPO_ROOT, DICT_PATH)}`);

  const sample = Object.entries(dict).slice(0, 5);
  if (sample.length > 0) {
    console.log("\n  Mẫu 5 entry đầu:");
    for (const [k, v] of sample) console.log(`    "${k}"  →  "${v}"`);
  }
}

function cmdApply() {
  const dict = loadDict();
  const keep = loadKeep();
  const entries = Object.entries(dict)
    .filter(([k]) => !keep.has(k))
    .sort(([a], [b]) => b.length - a.length);
  if (entries.length === 0) {
    console.log("Dictionary trống. Hãy chạy `extract` trước.");
    return;
  }

  const files = walk(SRC_DIR);
  let totalReplacements = 0;
  let touchedFiles = 0;

  for (const file of files) {
    let content = readFileSync(file, "utf-8");
    const original = content;
    let local = 0;

    for (const [zh, vi] of entries) {
      const variants = [
        [`"${zh}"`, `"${vi}"`],
        [`'${zh}'`, `'${vi}'`],
        [`\`${zh}\``, `\`${vi}\``],
        [`>${zh}<`, `>${vi}<`],
      ];
      for (const [from, to] of variants) {
        if (!content.includes(from)) continue;
        const parts = content.split(from);
        local += parts.length - 1;
        content = parts.join(to);
      }
    }

    if (content !== original) {
      writeFileSync(file, content, "utf-8");
      touchedFiles++;
      totalReplacements += local;
    }
  }

  console.log(`✓ Đã thay thế ${totalReplacements} chỗ trong ${touchedFiles} file.`);
}

function cmdScan() {
  const dict = loadDict();
  const keep = loadKeep();
  const files = walk(SRC_DIR);
  const findings = [];

  for (const file of files) {
    const lines = readFileSync(file, "utf-8").split("\n");
    lines.forEach((line, idx) => {
      const tokens = extractTokens(line);
      for (const t of tokens) {
        if (!CJK_RE.test(t.value)) continue;
        if (keep.has(t.value)) continue;
        if (t.value in dict) continue;
        findings.push({ file: relative(WEB_ROOT, file), line: idx + 1, value: t.value, kind: t.kind });
      }
    });
  }

  if (findings.length === 0) {
    console.log("✓ Không tìm thấy string CJK chưa dịch.");
    return;
  }
  console.log(`Tìm thấy ${findings.length} string chưa có trong dict:\n`);
  for (const f of findings) {
    console.log(`  ${f.file}:${f.line}  [${f.kind}]  "${f.value}"`);
  }
  console.log(`\nThêm cặp dịch vào ${relative(REPO_ROOT, DICT_PATH)} rồi chạy lại \`apply\`.`);
}

function help() {
  console.log(`Tool i18n cho fork maintenance.

Cách dùng:
  node scripts/i18n.mjs extract [base-ref]   Extract dict từ git diff (mặc định: HEAD)
  node scripts/i18n.mjs apply                Áp dụng dict vào toàn bộ file source
  node scripts/i18n.mjs scan                 Liệt kê string CJK chưa có trong dict

File:
  scripts/i18n-dict.json   Dictionary {gốc: dịch}, được sort theo độ dài giảm dần
  scripts/i18n-keep.json   Whitelist: các string CJK PHẢI giữ nguyên (enum/protocol value)

Workflow sau khi merge upstream:
  git fetch && git merge origin/main         # giải quyết conflict code (nếu có)
  npm run i18n:apply                         # tự động áp dịch theo dict đã có
  npm run i18n:scan                          # liệt kê string mới chưa dịch
  # chỉnh tay vài chỗ rồi:
  npm run i18n:extract                       # cập nhật dict từ working diff
`);
}

const cmd = process.argv[2];
const args = process.argv.slice(3);

if (cmd === "extract") cmdExtract(args[0]);
else if (cmd === "apply") cmdApply();
else if (cmd === "scan") cmdScan();
else help();
