const API_PRIORITY_KEY = 'api_priority';
const SHINCHAN_IMAGE = './images/shinchan.png';

document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('videoUrl');
    const parseButton = document.getElementById('parseButton');
    const videoPlayer = document.getElementById('videoPlayer');

    // 更新 API_LIST，将已知可用的API放在前面
    const API_LIST = [
        'https://jx.xmflv.com/?url=',         // 已确认可用的API放第一位
        'https://jx.quankan.app/?url=',
        'https://jx.m3u8.tv/jiexi/?url=',
        'https://okjx.cc/?url=',
        'https://www.pangujiexi.cc/jiexi.php?url='
    ];
    
    let currentApiIndex = 0;
    let lastUrl = '';

    // 加载上次成功的API索引
    const savedPriority = localStorage.getItem(API_PRIORITY_KEY);
    if (savedPriority !== null) {
        currentApiIndex = parseInt(savedPriority);
    }

    parseButton.addEventListener('click', handleParse);
    videoPlayer.addEventListener('error', handleVideoError);
    videoPlayer.addEventListener('load', function() {
        try {
            if (videoPlayer.contentWindow) {
                showMessage('加载成功', 'success');
                showLoading(false);
            }
        } catch (e) {
            // 跨域错误也认为是成功的
            showMessage('加载成功', 'success');
            showLoading(false);
        }
    });

    async function handleParse() {
        const videoUrl = videoUrlInput.value.trim();
        
        if (!videoUrl) {
            showMessage('请输入视频链接！');
            return;
        }

        if (!isValidUrl(videoUrl)) {
            showMessage('请输入有效的视频链接！');
            return;
        }

        lastUrl = videoUrl;
        await tryParseVideo(videoUrl);
    }

    async function tryParseVideo(videoUrl) {
        showLoading(true);
        
        try {
            const parseUrl = API_LIST[currentApiIndex] + encodeURIComponent(videoUrl);
            
            // 创建一个新的 Promise 来处理 iframe 加载
            await new Promise((resolve, reject) => {
                videoPlayer.onload = () => {
                    // 检查iframe是否真的加载了内容
                    try {
                        if (videoPlayer.contentWindow) {
                            resolve();
                        } else {
                            reject(new Error('加载失败'));
                        }
                    } catch (e) {
                        // 如果出现跨域错误，我们认为加载成功
                        resolve();
                    }
                };
                
                videoPlayer.onerror = () => reject(new Error('加载失败'));
                
                // 设置超时
                setTimeout(() => reject(new Error('加载超时')), 10000);
                
                // 设置iframe的src
                videoPlayer.src = parseUrl;
            });

            // 如果成功加载，保存缓存
            localStorage.setItem('lastParsedUrl', JSON.stringify({
                originalUrl: videoUrl,
                parseUrl: parseUrl,
                timestamp: Date.now()
            }));

            // 如果解析成功，记录当前API索引
            localStorage.setItem(API_PRIORITY_KEY, currentApiIndex.toString());
            
            showMessage('解析成功', 'success');
            showLoading(false);
        } catch (error) {
            console.error('解析失败:', error);
            handleVideoError();
        }
    }

    function handleVideoError() {
        currentApiIndex = (currentApiIndex + 1) % API_LIST.length;
        
        if (currentApiIndex !== 0) {
            showMessage(`切换到下一个线路 (${currentApiIndex + 1}/${API_LIST.length})`, 'error');
            // 添加延迟，避免过快切换
            setTimeout(() => {
                tryParseVideo(lastUrl);
            }, 1000);
        } else {
            showMessage('解析失败，请刷新页面重试或更换视频链接', 'error');
            showLoading(false);
        }
    }

    // 其他辅助函数...
    function isValidUrl(url) {
        try {
            new URL(url);
            return url.includes('v.qq.com') || 
                   url.includes('iqiyi.com') || 
                   url.includes('mgtv.com') || 
                   url.includes('youku.com');
        } catch (e) {
            return false;
        }
    }

    function showLoading(show) {
        const loading = document.getElementById('loading');
        const parseButton = document.getElementById('parseButton');
        
        loading.style.display = show ? 'block' : 'none';
        parseButton.disabled = show;
        updateApiStatus();
    }

    function showMessage(text, type = 'error') {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
        
        // 3秒后自动隐藏消息
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }

    function updateApiStatus() {
        const statusEl = document.getElementById('apiStatus');
        statusEl.textContent = `当前使用API源: ${currentApiIndex + 1}/${API_LIST.length}`;
    }

    // 添加缓存检查功能
    function checkCache(videoUrl) {
        const cached = localStorage.getItem('lastParsedUrl');
        if (cached) {
            const { originalUrl, parseUrl, timestamp } = JSON.parse(cached);
            // 缓存时间小于1小时且URL相同
            if (Date.now() - timestamp < 3600000 && originalUrl === videoUrl) {
                return parseUrl;
            }
        }
        return null;
    }

    const shinchanImage = document.querySelector('.shinchan-image');
    shinchanImage.src = SHINCHAN_IMAGE;
    
    // 添加图片加载错误处理
    shinchanImage.onerror = function() {
        this.style.display = 'none';  // 如果图片加载失败就隐藏
        console.error('蜡笔小新图片加载失败');
    };
}); 