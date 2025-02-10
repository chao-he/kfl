const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require("openai");

const app = express();
const port = 3000;

// 设置存储路径和文件名
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // 使用时间戳作为文件名
    }
});

const upload = multer({ storage: storage });

// 创建上传目录
const dir = './uploads';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// 配置 DashScope API
const openai = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY || "api_key", // 替换为你的 DashScope API 密钥
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
});

// 处理图片上传请求
app.post('/upload', upload.array('images'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: '没有文件被上传' });
    }

    const uploadedImages = req.files;
    const ocrResults = [];

    // 对每个上传的图片进行 OCR 识别
    for (const file of uploadedImages) {
        try {
            const filePath = path.join(__dirname, file.path);

            // 读取图片文件并将其转换为 Base64 编码
            const imageBase64 = fs.readFileSync(filePath, { encoding: 'base64' });

            // 调用 DashScope API 进行 OCR 识别
            const completion = await openai.chat.completions.create({
                model: "qwen-vl-ocr", // 使用通义千问的多模态模型
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "这是一篇小学生作文，请提取图片中的文本"
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageBase64}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 300
            });

            // 获取 OCR 识别结果
            const ocrResult = completion.choices[0].message.content;
            ocrResults.push({
                filename: file.filename,
                text: ocrResult || '无法识别'
            });
        } catch (error) {
            console.error('OCR 识别失败:', error.response ? error.response.data : error.message);
            ocrResults.push({
                filename: file.filename,
                text: 'OCR 识别失败'
            });
        }
    }

    res.json({ success: true, message: '文件上传成功', files: uploadedImages, ocrResults });
});

// 获取已上传图片的列表
app.get('/get-images', (req, res) => {
    fs.readdir(dir, (err, files) => {
        if (err) {
            return res.status(500).json({ success: false, message: '无法读取图片目录' });
        }

        // 过滤出图片文件（可以根据需要扩展支持的图片格式）
        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

        // 返回图片的相对路径
        const images = imageFiles.map(file => `/uploads/${file}`);
        res.json({ success: true, images });
    });
});

// 提供静态文件服务
app.use(express.static('public'));

// 提供上传目录的静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});
