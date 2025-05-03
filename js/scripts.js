/* ======== 壁纸管理器 ======== */
class WallpaperManager {
    static #CACHE_TTL = 7200000; // 2小时缓存
    static #RETRY_INTERVAL = 30000; // 30秒重试

    /**
     * 设置壁纸背景
     * @async
     */
    static async setBackground() {
        try {
            document.body.classList.add('loading-active');
            
            const isMobile = window.matchMedia("(max-width: 768px)").matches;
            const isRetina = window.devicePixelRatio >= 2;
            
            const baseUrl = isMobile 
                ? 'https://bing.img.run/m.php' 
                : 'https://bing.img.run/uhd.php';
            
            const url = new URL(baseUrl);
            url.searchParams.set('t', Date.now());
            url.searchParams.set('q', isRetina ? 100 : 85);

            await this.#preloadImage(url);
            this.#applyBackground(url);
        } catch(error) {
            console.error('壁纸加载失败:', error);
            this.#useFallback();
        } finally {
            document.body.classList.remove('loading-active');
        }
    }

    /**
     * 预加载图片
     * @private
     */
    static #preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = resolve;
            img.onerror = reject;
        });
    }

    /**
     * 应用背景图片
     * @private
     */
    static #applyBackground(url) {
        document.body.style.backgroundImage = `url("${url}")`;
        localStorage.setItem('lastWallpaper', url);
    }

    /**
     * 使用备用背景
     * @private
     */
    static #useFallback() {
        const fallbacks = [
            'https://source.unsplash.com/random/1920x1080/?nature',
            'https://source.unsplash.com/random/1920x1080/?tech'
        ];
        const url = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        document.body.style.backgroundImage = `url("${url}")`;
    }
}

/* ======== Markdown加载器 ======== */
class MarkdownLoader {
    #cache = new Map();
    #CACHE_TTL = 3600000; // 1小时缓存
    #routes = new Map([
        ['#home', 'home.md'],
        ['#nt-fps', 'nt-fps/overview.md'],
        ['#nt-fps/install', 'nt-fps/install.md'],
        ['#nt-fps/config', 'nt-fps/config.md'],
        ['#server', 'server/guide.md']
    ]);

    constructor() {
        this.articleEl = document.getElementById('mainContent');
        this.#init();
    }

    /**
     * 初始化路由和高亮
     * @private
     */
    #init() {
        window.addEventListener('hashchange', () => this.#load());
        window.addEventListener('DOMContentLoaded', () => this.#load());
        
        hljs.configure({
            cssSelector: 'pre code',
            languages: ['javascript', 'bash', 'ini'],
            ignoreUnescapedHTML: true
        });
    }

    /**
     * 加载内容
     * @async
     * @private
     */
    async #load() {
        const hash = window.location.hash || '#home';
        const path = this.#routes.get(hash) || 'home.md';

        try {
            this.#showLoading();
            
            if (this.#checkCache(path)) return;

            const response = await fetch(`articles/${path}`);
            if (!response.ok) throw new Error(`${response.status}`);
            
            const markdown = await response.text();
            this.#processContent(markdown, path);
        } catch(error) {
            this.#showError(error);
        } finally {
            this.#hideLoading();
        }
    }

    /**
     * 处理并缓存内容
     * @private
     */
    #processContent(markdown, path) {
        const html = marked.parse(markdown);
        this.#cache.set(path, { html, timestamp: Date.now() });
        this.#render(html);
        this.#updateTitle(path);
    }

    /**
     * 渲染内容
     * @private
     */
    #render(html) {
        this.articleEl.innerHTML = html;
        this.#lazyLoadImages();
        hljs.highlightAll();
    }

    /**
     * 图片懒加载
     * @private
     */
    #lazyLoadImages() {
        this.articleEl.querySelectorAll('img').forEach(img => {
            img.loading = 'lazy';
            img.classList.add('lazyload');
        });
    }

    // 其他辅助方法...
}

/* ======== 侧边栏管理器 ======== */
class SidebarManager {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.menuToggle = document.querySelector('.menu-toggle');
        this.#bindEvents();
    }

    /**
     * 绑定事件监听
     * @private
     */
    #bindEvents() {
        document.addEventListener('click', (e) => this.#handleClick(e));
        window.addEventListener('resize', () => this.#handleResize());
    }

    /**
     * 处理点击事件
     * @private
     */
    #handleClick(e) {
        if (e.target.closest('.menu-toggle')) {
            this.#toggle();
        } else if (this.sidebar.classList.contains('active')) {
            this.#close();
        }
    }

    // 其他方法...
}

/* ======== 初始化 ======== */
document.addEventListener('DOMContentLoaded', () => {
    new MarkdownLoader();
    new SidebarManager();
   