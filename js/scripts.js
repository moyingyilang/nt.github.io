// ======== 壁纸管理类 ========
class WallpaperManager {
    static #CACHE_KEY = 'wallpaperCache';
    static #CACHE_TTL = 3600000; // 1小时缓存

    constructor() {
        this.overlay = document.getElementById('wallpaperOverlay');
        this.descEl = document.getElementById('wallpaperDesc');
        this.currentUrl = null;
    }

    async init() {
        try {
            const cached = this.#getCache();
            if (cached && Date.now() - cached.timestamp < WallpaperManager.#CACHE_TTL) {
                this.#applyBackground(cached.url);
                return;
            }
            await this.#updateWallpaper();
        } catch (error) {
            console.error('壁纸初始化失败:', error);
            this.#applyFallback();
        }
        setInterval(() => this.#updateWallpaper(), 3600000);
    }

    async #updateWallpaper() {
        try {
            const url = await this.#fetchWallpaper();
            this.#applyBackground(url);
            this.#updateCache(url);
        } catch (error) {
            this.#applyFallback();
            throw error;
        }
    }

    async #fetchWallpaper() {
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        const baseUrl = isMobile ? 'https://bing.img.run/m.php' : 'https://bing.img.run/uhd.php';
        const url = new URL(baseUrl);
        url.searchParams.set('t', Date.now());
        
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = resolve;
            img.onerror = reject;
        });
        
        return url.href;
    }

    #applyBackground(url) {
        document.body.style.backgroundImage = `url("${url}")`;
        this.currentUrl = url;
        this.descEl.textContent = '今日壁纸已更新';
    }

    #applyFallback() {
        document.body.style.backgroundImage = 
            'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)';
        this.descEl.textContent = '壁纸服务不可用';
    }

    #getCache() {
        const data = localStorage.getItem(WallpaperManager.#CACHE_KEY);
        return data ? JSON.parse(data) : null;
    }

    #updateCache(url) {
        localStorage.setItem(WallpaperManager.#CACHE_KEY, 
            JSON.stringify({ url, timestamp: Date.now() }));
    }
}

// ======== 文章加载类 ========
class ArticleLoader {
    static #CACHE_TTL = 86400000; // 24小时缓存
    static #INSTANCE = null;

    constructor() {
        if (ArticleLoader.#INSTANCE) return ArticleLoader.#INSTANCE;
        
        this.container = document.getElementById('articleContent');
        this.contentEl = this.container.querySelector('.markdown-body');
        this.cache = new Map();
        this.#init();
        
        ArticleLoader.#INSTANCE = this;
        return this;
    }

    #init() {
        this.#bindSidebarLinks();
        this.#bindCloseButton();
        this.#enableTouchGestures();
        marked.setOptions({
            highlight: (code, lang) => hljs.highlightAuto(code).value,
            langPrefix: 'hljs language-'
        });
    }

    #bindSidebarLinks() {
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                this.loadArticle(e.target.getAttribute('href').substring(1));
            });
        });
    }

    #bindCloseButton() {
        document.getElementById('closeArticle').addEventListener('click', () => {
            this.container.hidden = true;
            document.getElementById('wallpaperOverlay').style.opacity = '1';
        });
    }

    #enableTouchGestures() {
        let touchStart = 0;
        this.container.addEventListener('touchstart', e => {
            touchStart = e.touches[0].clientX;
        }, { passive: true });

        this.container.addEventListener('touchend', e => {
            if (Math.abs(e.changedTouches[0].clientX - touchStart) > 100) {
                this.container.hidden = true;
            }
        });
    }

    async loadArticle(articleId) {
        try {
            this.#showLoading();
            
            let content = this.cache.get(articleId)?.content;
            if (!content || this.#isCacheExpired(articleId)) {
                content = await this.#fetchArticle(articleId);
                this.cache.set(articleId, { content, timestamp: Date.now() });
            }

            this.#render(content);
            this.#showContainer();
        } catch (error) {
            this.#showError(articleId);
        }
    }

    async #fetchArticle(id) {
        const response = await fetch(`articles/${id}.md`);
        if (!response.ok) throw new Error(`加载失败: ${response.status}`);
        return marked.parse(await response.text());
    }

    #render(content) {
        this.contentEl.innerHTML = content;
        hljs.highlightAll();
        this.#optimizeImages();
    }

    #optimizeImages() {
        this.contentEl.querySelectorAll('img').forEach(img => {
            img.loading = 'lazy';
            if (!img.complete) img.classList.add('lazyload');
        });
    }

    #isCacheExpired(id) {
        return Date.now() - (this.cache.get(id)?.timestamp || 0) > ArticleLoader.#CACHE_TTL;
    }

    #showLoading() {
        this.contentEl.innerHTML = `
            <div class="skeleton" style="height:2em; width:80%"></div>
            <div class="skeleton" style="height:200px; margin-top:1em"></div>
        `;
    }

    #showContainer() {
        this.container.hidden = false;
        document.getElementById('wallpaperOverlay').style.opacity = '0.2';
    }

    #showError(id) {
        this.contentEl.innerHTML = `
            <div class="error">
                <h2>⚠️ 加载失败</h2>
                <p>无法加载文章: ${id}</p>
                <button onclick="location.reload()">重试</button>
            </div>
        `;
        this.#showContainer();
    }
}

// ======== 侧边栏管理类 ========
class SidebarManager {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.toggleBtn = document.querySelector('.menu-toggle');
        this.#init();
    }

    #init() {
        this.#bindEvents();
        this.#checkViewport();
    }

    #bindEvents() {
        document.addEventListener('click', e => this.#handleClick(e));
        window.addEventListener('resize', () => this.#checkViewport());
    }

    #handleClick(e) {
        if (e.target.closest('.menu-toggle')) {
            this.toggle();
        } else if (this.sidebar.classList.contains('active')) {
            this.close();
        }
    }

    #checkViewport() {
        if (window.innerWidth > 992) this.close();
    }

    toggle() {
        this.sidebar.classList.toggle('active');
        this.toggleBtn.classList.toggle('active');
        this.toggleBtn.setAttribute('aria-expanded', 
            this.sidebar.classList.contains('active'));
    }

    close() {
        this.sidebar.classList.remove('active');
        this.toggleBtn.classList.remove('active');
        this.toggleBtn.setAttribute('aria-expanded', 'false');
    }
}

// ======== 初始化 ========
document.addEventListener('DOMContentLoaded', () => {
    // 核心模块
    new WallpaperManager().init();
    new ArticleLoader();
    new SidebarManager();

    // 保留原有搜索功能
    const searchModule = {
        init() {
            document.getElementById('searchInput').addEventListener('input', 
                this.debounce(this.handleSearch, 300));
        },
        // ...原有搜索逻辑...
    };
    searchModule.init();

    // 性能优化
    const perfObserver = new PerformanceObserver(list => {
        console.log('资源加载统计:', list.getEntries());
    });
    perfObserver.observe({ entryTypes: ['resource'] });
});