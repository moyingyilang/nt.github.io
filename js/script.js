// 智能设备检测+壁纸加载
class WallpaperLoader {
    static #MOBILE_MAX_WIDTH = 768;

    constructor() {
        this.bgContainer = document.createElement('div');
        this.bgContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -2;
            transition: opacity 0.5s;
        `;
        document.body.prepend(this.bgContainer);
        this.#loadWallpaper();
        window.addEventListener('resize', () => this.#loadWallpaper());
    }

    #isMobile() {
        return window.matchMedia(`(max-width: ${WallpaperLoader.#MOBILE_MAX_WIDTH}px)`).matches;
    }

    #getWallpaperUrl() {
        return this.#isMobile() 
            ? 'https://bing.img.run/m.php' 
            : 'https://bing.img.run/uhd.php';
    }

    #loadWallpaper() {
        const img = new Image();
        img.src = `${this.#getWallpaperUrl()}?t=${Date.now()}`;
        img.onload = () => {
            this.bgContainer.style.background = `url("${img.src}") center/cover fixed`;
            this.bgContainer.style.opacity = 1;
        };
        img.onerror = () => {
            console.error('壁纸加载失败，使用默认背景');
            this.bgContainer.style.background = 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)';
        };
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new WallpaperLoader();
});