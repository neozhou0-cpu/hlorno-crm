// 修改后的文件上传逻辑 - 直接通过 multipart/form-data 发送给 Moonshot API

// 新增：通过 multipart/form-data 上传文件到 Moonshot API 的函数
async function uploadFileToMoonshot(file, onProgress) {
  onProgress?.(10, "正在上传文件到 Moonshot API...");
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "file-extract");
  
  try {
    // 第一步：上传文件
    const uploadResponse = await fetch("https://api.moonshot.cn/v1/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jge}`
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`文件上传失败: ${errorData.error?.message || uploadResponse.statusText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    const fileId = uploadResult.id;
    onProgress?.(50, "文件上传成功，正在获取内容...");
    
    // 第二步：获取文件内容
    const contentResponse = await fetch(`https://api.moonshot.cn/v1/files/${fileId}/content`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${jge}`
      }
    });
    
    if (!contentResponse.ok) {
      throw new Error("获取文件内容失败");
    }
    
    const contentResult = await contentResponse.json();
    onProgress?.(100, "文件处理完成");
    
    return contentResult.content || contentResult.text || "";
  } catch (error) {
    console.error("Moonshot 文件上传失败:", error);
    throw error;
  }
}

// 修改后的 hge 函数
async function hge(e, t) {
  const r = e.name.toLowerCase();
  t?.(0, "正在准备文件...");
  
  try {
    // PDF 和 Word 文件直接上传到 Moonshot API
    if (r.endsWith(".pdf") || r.endsWith(".docx") || r.endsWith(".doc")) {
      return await uploadFileToMoonshot(e, t);
    }
    
    // 其他文件类型保持原有逻辑
    if (e.type.startsWith("image/") || r.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/)) {
      return await xge(e, t);
    }
    if (r.endsWith(".txt") || r.endsWith(".md")) {
      return await yge(e, t);
    }
    if (r.endsWith(".html") || r.endsWith(".htm")) {
      return await bge(e, t);
    }
    
    t?.(50, "尝试读取文件内容...");
    const n = await e.text();
    t?.(100, "读取完成");
    return n;
  } catch (n) {
    throw console.error("文件提取失败:", n), n;
  }
}

// 保留原有的本地解析函数作为备用
async function mge_local(e, t) {
  t?.(5, "正在加载PDF...");
  const r = await ql(() => import("./pdf-vkbVaD7t.js"), [], import.meta.url);
  r.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${r.version}/pdf.worker.min.js`;
  const n = await e.arrayBuffer(),
    a = await r.getDocument({ data: n }).promise,
    o = a.numPages;
  t?.(10, `PDF共${o}页，开始提取...`);
  let l = "", u = !1;
  for (let f = 1; f <= o; f++)
    try {
      t?.(Math.round(10 + (f - 1) / o * 40), `正在提取第${f}/${o}页文本...`);
      const m = (await (await a.getPage(f)).getTextContent()).items.map(v => v.str).join(" ").trim();
      m.length > 10 && (l += m + "\n");
    } catch (l) {
      console.warn(`第${o}页OCR失败:`, l);
    }
  return t?.(100, "OCR识别完成"), l.trim();
}

async function vge_local(e, t) {
  t?.(10, "正在提取Word文档...");
  try {
    const r = await ql(() => import("./index-DgnFZDhx.js").then(u => u.i), __vite__mapDeps([2, 1]), import.meta.url),
      n = await e.arrayBuffer(),
      a = await r.extractRawText({ arrayBuffer: n });
    if (a.value.trim().length > 100) return t?.(100, "Word提取完成"), a.value;
    t?.(50, "文本较少，尝试转换为图片OCR...");
    const l = (await r.convertToHtml({ arrayBuffer: n })).value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return t?.(100, "Word处理完成"), l.length > 50 ? l : a.value;
  } catch (r) {
    return console.warn("Word提取失败:", r), "";
  }
}
