import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const sourcePptx = "D:/25113/qqliaotian/qq-download/模板.pptx";
const outDir = "F:/比赛/智能体 ican 教育skill/ppt_work_20260829/template-inspect-direct";

async function saveBlob(filePath, blob) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

const presentation = await PresentationFile.importPptx(await FileBlob.load(sourcePptx));
await fs.mkdir(outDir, { recursive: true });
const summary = await presentation.inspect({ kind: "slide,layout,notes", maxChars: 120000 });
await fs.writeFile(path.join(outDir, "template-inspect.ndjson"), summary.ndjson ?? String(summary), "utf8");
for (const [index, slide] of presentation.slides.items.entries()) {
  const stem = `slide-${String(index + 1).padStart(2, "0")}`;
  await saveBlob(path.join(outDir, "slides", `${stem}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(outDir, "layouts", `${stem}.layout.json`), await layout.text(), "utf8");
}
await saveBlob(path.join(outDir, "template-montage.webp"), await presentation.export({ format: "webp", montage: true, scale: 1 }));
console.log(JSON.stringify({ slides: presentation.slides.items.length, outDir }, null, 2));
