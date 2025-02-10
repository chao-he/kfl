$(document).ready(function() {
    // 页面加载时获取已上传的图片
    $.get('/get-images', function(response) {
        if (response.success) {
            displayImages(response.images);
        } else {
            M.toast({ html: '无法加载已上传的图片', classes: 'red' });
        }
    });

    // 监听表单提交事件
    $('#uploadForm').on('submit', function(event) {
        event.preventDefault(); // 防止表单默认提交行为

        const files = $('#fileInput')[0].files;
        if (files.length === 0) {
            M.toast({ html: '请选择至少一张图片', classes: 'red' });
            return;
        }

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('images', files[i]);
        }

        // 使用 jQuery 发送 AJAX 请求
        $.ajax({
            url: '/upload',
            type: 'POST',
            data: formData,
            processData: false, // 不要处理数据
            contentType: false, // 不要设置内容类型
            xhr: function() {
                const xhr = new window.XMLHttpRequest();
                // 监听上传进度
                xhr.upload.addEventListener('progress', function(event) {
                    if (event.lengthComputable) {
                        const percentComplete = (event.loaded / event.total) * 100;
                        $('#progressBarFill').css('width', percentComplete + '%');
                    }
                });
                return xhr;
            },
            success: function(response) {
                if (response.success) {
                    M.toast({ html: '图片上传成功！', classes: 'green' });
                    previewImages(files);

                    // 显示 OCR 识别结果
                    displayOCRResults(response.ocrResults);

                    // 重新获取已上传的图片列表
                    $.get('/get-images', function(response) {
                        if (response.success) {
                            displayImages(response.images);
                        }
                    });
                } else {
                    M.toast({ html: '图片上传失败！', classes: 'red' });
                }
            },
            error: function() {
                M.toast({ html: '上传出错，请稍后再试', classes: 'red' });
            }
        });
    });

    // 图片预览函数
    function previewImages(files) {
        const imagePreview = $('#imagePreview');
        imagePreview.empty(); // 清空之前的预览

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();

            reader.onload = function(e) {
                const img = $('<img>').attr('src', e.target.result);
                imagePreview.append(img);
            };

            reader.readAsDataURL(file);
        }
    }

    // 显示已上传的图片
    function displayImages(images) {
        const imagePreview = $('#imagePreview');
        imagePreview.empty(); // 清空之前的预览

        images.forEach(imageUrl => {
            const img = $('<img>').attr('src', imageUrl);
            imagePreview.append(img);
        });
    }

    // 显示 OCR 识别结果
    function displayOCRResults(ocrResults) {
        const ocrResultsContainer = $('#ocrResults');
        ocrResultsContainer.empty(); // 清空之前的 OCR 结果

        ocrResults.forEach(result => {
            const resultDiv = $('<div>').addClass('ocr-result');
            resultDiv.append($('<h5>').text(`图片: ${result.filename}`));
            resultDiv.append($('<p>').text(`识别文本: ${result.text}`));
            ocrResultsContainer.append(resultDiv);
        });
    }
});
