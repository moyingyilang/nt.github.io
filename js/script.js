// 初始化函数
function init() {
    // 设置背景图片
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const bgUrl = isMobile ? 
        'https://bing.img.run/m.php' : 
        'https://bing.img.run/uhd.php';
    
    document.body.style.backgroundImage = `url('${bgUrl}')`;

    // 侧边栏切换
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // 窗口尺寸变化处理
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
        }
    });
}

// 加载初始化
window.addEventListener('load', init);