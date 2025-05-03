// scripts.js
class SidebarManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.menuToggle = document.getElementById('menuToggle');
        this.overlay = document.createElement('div');
        this.overlay.className = 'menu-overlay';
        document.body.appendChild(this.overlay);
        
        this.#init();
    }

    #init() {
        // 汉堡菜单点击
        this.menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // 遮罩层点击
        this.overlay.addEventListener('click', () => this.closeMenu());

        // 窗口resize处理
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992) this.closeMenu();
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeMenu();
        });

        // 触摸滑动关闭
        this.#enableSwipe();
    }

    toggleMenu() {
        this.sidebar.classList.toggle('active');
        this.menuToggle.classList.toggle('active');
        this.overlay.classList.toggle('active');
        this.menuToggle.setAttribute('aria-expanded', 
            this.sidebar.classList.contains('active'));
    }

    closeMenu() {
        this.sidebar.classList.remove('active');
        this.menuToggle.classList.remove('active');
        this.overlay.classList.remove('active');
    }

    #enableSwipe() {
        let touchStartX = 0;
        const SWIPE_THRESHOLD = 50;

        this.sidebar.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });

        this.sidebar.addEventListener('touchmove', (e) => {
            if (!this.sidebar.classList.contains('active')) return;
            const deltaX = e.touches[0].clientX - touchStartX;
            if (deltaX < -SWIPE_THRESHOLD) this.closeMenu();
        }, { passive: true });
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new SidebarManager();
    new WallpaperManager().init();
    new ArticleLoader();
});