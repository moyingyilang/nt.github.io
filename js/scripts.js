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

// ======== 修复版侧边栏交互 ========
class SidebarManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.menuToggle = document.getElementById('menuToggle');
        this.submenus = document.querySelectorAll('.has-submenu');
        this.#init();
    }

    #init() {
        // 修复语法错误并增强点击外部关闭逻辑
        document.addEventListener('click', (e) => {
            const isInside = this.sidebar.contains(e.target) || e.target === this.menuToggle;
            if (!isInside && this.isMenuOpen()) {
                this.closeMenu();
            }
        });

        // 添加键盘事件支持
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen()) {
                this.closeMenu();
            }
        });

        // 绑定主菜单切换
        this.menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });
        
        // 优化子菜单交互
        this.submenus.forEach(item => {
            const submenu = item.querySelector('.submenu');
            const link = item.querySelector('a');
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleSubmenu(item, submenu);
            });
        });

        // 添加触摸滑动关闭支持（移动端）
        this.#enableSwipeToClose();
        this.#handleResponsive();
    }

    // 新增方法：判断菜单是否打开
    isMenuOpen() {
        return this.sidebar.classList.contains('active');
    }

    toggleMenu() {
        this.sidebar.classList.toggle('active');
        this.menuToggle.classList.toggle('active');
        this.menuToggle.setAttribute('aria-expanded', this.isMenuOpen());
        
        const wasOpen = this.isMenuOpen();
        this.sidebar.classList.toggle('active');
        this.menuToggle.classList.toggle('active');
        this.menuToggle.setAttribute('aria-expanded', !wasOpen);
        this.sidebar.setAttribute('aria-hidden', wasOpen);
        document.body.classList.toggle('menu-open', !wasOpen);
        
        // 添加过渡动画
        if (this.isMenuOpen()) {
            this.sidebar.style.transform = 'translateX(0)';
        } else {
            this.sidebar.style.transform = 'translateX(-100%)';
        }
    }

    closeMenu() {
        this.sidebar.classList.remove('active');
        this.menuToggle.classList.remove('active');
        this.menuToggle.setAttribute('aria-expanded', 'false');
        this.sidebar.style.transform = 'translateX(-100%)';
    }

    // 新增方法：触摸滑动关闭
    #enableSwipeToClose() {
        let touchStartX = 0;
        const SWIPE_THRESHOLD = 50;

        this.sidebar.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });

        this.sidebar.addEventListener('touchmove', (e) => {
            if (!this.isMenuOpen()) return;
            
            const currentX = e.touches[0].clientX;
            const deltaX = currentX - touchStartX;
            
            if (deltaX < -SWIPE_THRESHOLD) {
                this.closeMenu();
            }
        }, { passive: true });
    }

    // 优化后的响应式处理
    #handleResponsive() {
        const handleResize = () => {
            if (window.innerWidth > 992) {
                this.closeMenu();
                this.submenus.forEach(item => {
                    item.classList.remove('open');
                    item.querySelector('.submenu').style.maxHeight = '';
                });
                this.sidebar.style.transform = '';
            } else {
                this.sidebar.style.transform = this.isMenuOpen() 
                    ? 'translateX(0)' 
                    : 'translateX(-100%)';
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // 初始化执行
    }

    // 保持原有子菜单切换逻辑
    toggleSubmenu(parentItem, submenu) {
        this.submenus.forEach(otherItem => {
            if (otherItem !== parentItem) {
                otherItem.classList.remove('open');
                otherItem.querySelector('.submenu').style.maxHeight = '0';
            }
        });

        const isOpening = !parentItem.classList.contains('open');
        parentItem.classList.toggle('open');
        submenu.style.maxHeight = isOpening ? `${submenu.scrollHeight}px` : '0';
    }
}
// ======== 初始化 ========
document.addEventListener('DOMContentLoaded', () => {
    // 确保按顺序初始化
    const sidebarManager = new SidebarManager();
    const articleLoader = new ArticleLoader();
    new WallpaperManager().init();
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