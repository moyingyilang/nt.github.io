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

// scripts.js 新增部分
// 在文件末尾添加以下代码

class MarkdownLoader {
    constructor() {
        this.cache = new Map();
        this.CACHE_TTL = 3600000; // 1小时缓存
        this.initRouter();
    }

    initRouter() {
        window.addEventListener('hashchange', () => this.loadContent());
        document.addEventListener('DOMContentLoaded', () => this.loadContent());
        
        // 绑定侧边栏点击事件
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const path = e.target.getAttribute('href').substring(1);
                history.pushState(null, '', `#${path}`);
                this.loadContent();
            });
        });
    }

    async loadContent() {
        const articleId = window.location.hash.substring(1) || 'home';
        const mainContent = document.getElementById('mainContent');
        
        try {
            this.showLoading();
            
            // 检查缓存
            if (this.cache.has(articleId) {
                const { content, timestamp } = this.cache.get(articleId);
                if (Date.now() - timestamp < this.CACHE_TTL) {
                    mainContent.innerHTML = content;
                    this.highlightCode();
                    return;
                }
            }

            // 获取新内容
            const response = await fetch(`/articles/${articleId}.md`);
            if (!response.ok) throw new Error('404');
            
            const markdown = await response.text();
            const html = marked.parse(markdown);
            
            // 更新缓存和内容
            this.cache.set(articleId, {
                content: html,
                timestamp: Date.now()
            });
            
            mainContent.innerHTML = html;
            this.highlightCode();
            this.updateDocumentTitle(articleId);

        } catch (error) {
            console.error('内容加载失败:', error);
            mainContent.innerHTML = `
                <div class="error-message">
                    <h2>内容加载失败</h2>
                    <p>请尝试以下方法：</p>
                    <ul>
                        <li>检查网络连接</li>
                        <li>刷新页面</li>
                        <li>返回<a href="#home">首页</a></li>
                    </ul>
                </div>
            `;
        } finally {
            this.hideLoading();
        }
    }

    highlightCode() {
        document.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }

    updateDocumentTitle(articleId) {
        const titleMap = {
            home: 'NTの文档小站',
            'nt-fps': '提升FPS材质包文档',
            docs: '随写文档',
            server: 'ESS服务器指南'
        };
        document.title = titleMap[articleId] || 'NTの文档';
    }

    showLoading() {
        document.body.classList.add('loading-active');
    }

    hideLoading() {
        document.body.classList.remove('loading-active');
    }
}

// 初始化Markdown加载器
document.addEventListener('DOMContentLoaded', () => {
    new MarkdownLoader();
    
    // 保持原有其他初始化代码
    new SidebarManager();
    searchModule.init();
    wallpaperManager.init();
});