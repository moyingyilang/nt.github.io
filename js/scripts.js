// ======== 壁纸管理模块 ========
const deviceDetector = {
    isMobile: () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                || window.matchMedia("(max-width: 768px)").matches,
    isRetina: () => window.devicePixelRatio >= 2
};

const wallpaperManager = {
    cache: { lastUpdate: 0 },
    
    getWallpaperUrl: function() {
        const baseUrl = deviceDetector.isMobile() 
            ? 'https://bing.img.run/m.php' 
            : 'https://bing.img.run/uhd.php';
        
        const params = new URLSearchParams({
            t: Date.now(),
            q: deviceDetector.isRetina() ? 100 : 85
        });
        
        return `${baseUrl}?${params}`;
    },

    preloadImage: url => new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(url);
        img.onerror = reject;
    }),

    setBackground: async function() {
        try {
            document.body.classList.add('loading-active');
            
            const url = this.getWallpaperUrl();
            await this.preloadImage(url);
            
            document.body.style.backgroundImage = `url("${url}")`;
            localStorage.setItem('lastWallpaper', url);
            this.cache.lastUpdate = Date.now();
        } catch(error) {
            console.error('壁纸加载失败:', error);
            this.useFallbackBackground();
        } finally {
            document.body.classList.remove('loading-active');
        }
    },

    useFallbackBackground: function() {
        const fallbacks = [
            'https://source.unsplash.com/random/1920x1080/?nature',
            'https://source.unsplash.com/random/1920x1080/?tech'
        ];
        const url = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        document.body.style.backgroundImage = `url("${url}")`;
    }
};

// ======== 窗口事件处理 ========
let resizeTimer;
const handleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (Date.now() - wallpaperManager.cache.lastUpdate > 300000) {
            wallpaperManager.setBackground();
        }
    }, 1000);
};

// ======== 初始化 ========
window.addEventListener('DOMContentLoaded', () => {
    const cached = localStorage.getItem('lastWallpaper');
    if (cached) document.body.style.backgroundImage = `url("${cached}")`;
    
    wallpaperManager.setBackground();
    setInterval(wallpaperManager.setBackground, 7200000);
    window.addEventListener('resize', handleResize);
});

// ======== 侧边栏交互 ========
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');

document.body.addEventListener('click', e => {
    if (e.target.closest('.menu-toggle')) {
        const isActive = !sidebar.classList.contains('active');
        sidebar.classList.toggle('active', isActive);
        menuToggle.classList.toggle('active', isActive);
        menuToggle.setAttribute('aria-expanded', isActive);
    } else if (sidebar.classList.contains('active') && !sidebar.contains(e.target)) {
        sidebar.classList.remove('active');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
    }
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 992) {
        sidebar.classList.remove('active');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
    }
}, { passive: true });

// ======== 搜索功能 ========
document.getElementById('searchInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) {
            alert(`执行搜索: ${query}`);
            e.target.value = '';
        }
    }
});

// 二级菜单交互
document.querySelectorAll('.has-submenu').forEach(item => {
    const submenu = item.querySelector('.submenu');
    submenu.style.maxHeight = '0';

    item.addEventListener('click', function(e) {
        e.preventDefault();
        const isActive = !item.classList.contains('active');
        
        document.querySelectorAll('.has-submenu').forEach(otherItem => {
            if(otherItem !== item) {
                otherItem.classList.remove('active');
                otherItem.querySelector('.submenu').style.maxHeight = '0';
                otherItem.querySelector('a').style.transform = 'translateX(0)';
            }
        });

        item.classList.toggle('active', isActive);
        submenu.style.maxHeight = isActive ? submenu.scrollHeight + 'px' : '0';
        item.querySelector('a').style.transform = 
            isActive ? 'translateX(8px)' : 'translateX(0)';
    });
});

// 搜索功能增强
const articleIndex = {
    "nt-fps": ["安装指南", "配置教程"],
    "docs": ["开发日志", "技术分享", "设计思路"],
    "server": "ESS服务器指南",
    "faq": "常见问题解答",
    "other": "其他文档"
};

document.getElementById('searchInput').addEventListener('input', function(e) {
    const query = this.value.trim().toLowerCase();
    let results = [];
    
    Object.entries(articleIndex).forEach(([key, value]) => {
        const content = Array.isArray(value) ? value.join(' ') : value;
        if(content.toLowerCase().includes(query)) {
            results.push({
                id: key,
                content: content
            });
        }
    });

    const resultEl = document.querySelector('.content-header .description');
    resultEl.textContent = results.length 
        ? `找到 ${results.length} 个相关结果：${results.map(r => r.content).join(', ')}` 
        : "没有找到匹配内容";
});
