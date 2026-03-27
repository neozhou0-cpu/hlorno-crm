# 文件上传逻辑修改说明

## 变更概述

修改了 `assets/index-DRANtvxW.js` 中的文件处理逻辑，让 Word/PDF 文件直接作为 multipart/form-data 发送给 Moonshot API 进行解析，而不是在浏览器端本地解析。

## 具体修改

### 1. 新增函数 `uploadFileToMoonshot`

在文件开头添加了新的上传函数：

```javascript
async function uploadFileToMoonshot(file, onProgress) {
  onProgress?.(10, "正在上传文件到 Moonshot API...");
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "file-extract");
  
  try {
    // 第一步：上传文件到 Moonshot
    const uploadResponse = await fetch("https://api.moonshot.cn/v1/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jge}`  // 使用原有的 API key
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
```

### 2. 修改 `hge` 函数

原逻辑：
- PDF 文件 → 调用 `mge` 函数（本地使用 pdf.js 解析）
- Word 文件 → 调用 `vge` 函数（本地使用 mammoth.js 解析）

新逻辑：
- PDF 文件 → 调用 `uploadFileToMoonshot`（上传到 Moonshot API）
- Word 文件 → 调用 `uploadFileToMoonshot`（上传到 Moonshot API）
- 图片/文本/HTML 文件 → 保持原有本地处理逻辑

修改后的 `hge` 函数：
```javascript
async function hge(e, t) {
  const r = e.name.toLowerCase();
  t?.(0, "正在准备文件...");
  try {
    // PDF 和 Word 文件直接上传到 Moonshot API
    if (r.endsWith(".pdf")) return await uploadFileToMoonshot(e, t);
    if (r.endsWith(".docx") || r.endsWith(".doc")) return await uploadFileToMoonshot(e, t);
    
    // 其他文件类型保持原有逻辑
    if (e.type.startsWith("image/") || r.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/)) return await xge(e, t);
    if (r.endsWith(".txt") || r.endsWith(".md")) return await yge(e, t);
    if (r.endsWith(".html") || r.endsWith(".htm")) return await bge(e, t);
    
    t?.(50, "尝试读取文件内容...");
    const n = await e.text();
    return t?.(100, "读取完成"), n;
  } catch (n) {
    throw console.error("文件提取失败:", n), n;
  }
}
```

## 文件结构

```
hlorno-fix/
├── assets/
│   ├── index-DRANtvxW.js          # 修改后的主文件
│   ├── index-DRANtvxW.js.bak      # 原始文件备份
│   └── ...
├── file-upload-patch.js            # 补丁代码参考
├── CHANGELOG.md                    # 本说明文件
└── index.html
```

## 注意事项

1. **API Key**: 修改后的代码继续使用原有的 `jge` 变量（Moonshot API Key），无需额外配置
2. **备用方案**: 原有的 `mge` 和 `vge` 函数仍然保留在代码中，可作为备用方案
3. **进度回调**: 上传过程中会显示进度信息（10%→50%→100%）
4. **错误处理**: 如果 Moonshot API 调用失败，会在控制台输出错误信息

## 测试建议

1. 测试上传 PDF 文件，确认文件被发送到 Moonshot API
2. 测试上传 Word (.docx/.doc) 文件，确认文件被发送到 Moonshot API
3. 测试上传图片文件，确认仍使用本地 OCR 处理
4. 测试网络异常情况下，确认错误处理机制正常工作

## 回滚方法

如需恢复原始版本，执行：
```bash
cp assets/index-DRANtvxW.js.bak assets/index-DRANtvxW.js
```
