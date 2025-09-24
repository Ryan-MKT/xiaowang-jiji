// 全域左側邊欄管理系統
class GlobalSidebar {
    constructor() {
        this.sidebarData = {
            profile: {
                name: 'Ryan',
                title: '每日任務'
            }
        };
        this.init();
    }

    // 初始化側邊欄
    init() {
        console.log('🏷️ [全域側邊欄] 開始初始化');
        this.createSidebar();
        console.log('🏷️ [全域側邊欄] 側邊欄HTML已創建');
        this.setupEventListeners();
        console.log('🏷️ [全域側邊欄] 事件監聽器已設置');
        this.adjustMainContent();
        console.log('🏷️ [全域側邊欄] 內容調整完成');
    }

    // 創建側邊欄HTML結構
    createSidebar() {
        // 檢查是否已存在側邊欄
        if (document.querySelector('.global-sidebar')) {
            return;
        }

        const sidebarHTML = `
            <div class="global-sidebar" id="globalSidebar">
                <!-- 用戶標題區 -->
                <div class="sidebar-profile">
                    <div class="profile-title">${this.sidebarData.profile.title}</div>
                    <div class="profile-name">${this.sidebarData.profile.name}</div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    }

    // 調整主要內容區域的邊距
    adjustMainContent() {
        console.log('🏷️ [全域側邊欄] 調整主要內容, 螢幕寬度:', window.innerWidth);

        // 調試：檢查所有可能影響佈局的元素
        console.log('🔍 [調試] 開始檢查所有可能的空白來源:');

        // 檢查 body 的所有樣式
        const body = document.body;
        const bodyStyles = window.getComputedStyle(body);
        console.log('🔍 [調試] body margin:', bodyStyles.margin);
        console.log('🔍 [調試] body padding:', bodyStyles.padding);

        // 檢查所有可能的容器元素
        const allContainers = document.querySelectorAll('*');
        allContainers.forEach(element => {
            const styles = window.getComputedStyle(element);
            if (styles.marginLeft && parseInt(styles.marginLeft) > 100) {
                console.log('🔍 [調試] 發現大margin元素:', element.tagName, element.className, 'margin-left:', styles.marginLeft);
            }
            if (styles.paddingLeft && parseInt(styles.paddingLeft) > 50) {
                console.log('🔍 [調試] 發現大padding元素:', element.tagName, element.className, 'padding-left:', styles.paddingLeft);
            }
        });

        // 確保移除右側面板的狀態
        const mainLayout = document.querySelector('.main-layout');
        const rightPanel = document.querySelector('.right-panel');

        if (mainLayout && mainLayout.classList.contains('panel-open')) {
            mainLayout.classList.remove('panel-open');
            console.log('🏷️ [全域側邊欄] 移除右側面板打開狀態');
        }

        if (rightPanel && rightPanel.classList.contains('open')) {
            rightPanel.classList.remove('open');
            console.log('🏷️ [全域側邊欄] 關閉右側面板');
        }

        // 只在桌面版顯示側邊欄
        const isDesktop = window.innerWidth >= 1024;
        const sidebar = document.querySelector('.global-sidebar');

        if (!sidebar) {
            console.log('🏷️ [全域側邊欄] 找不到側邊欄元素');
            return;
        }

        console.log('🏷️ [全域側邊欄] 是否為桌面版:', isDesktop);

        if (isDesktop) {
            sidebar.style.display = 'block';
            console.log('🏷️ [全域側邊欄] 顯示側邊欄');

            // 調整各種容器的邊距
            const selectors = [
                '.main-layout',
                '.container',
                '.container-fluid',
                'body > .row',
                'main',
                '.content-wrapper',
                'body'
            ];

            let foundContainers = 0;
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    foundContainers += elements.length;
                    console.log(`🏷️ [全域側邊欄] 找到 ${elements.length} 個 ${selector} 元素`);
                }

                elements.forEach((element, index) => {
                    if (element.tagName === 'BODY') {
                        // 跳過 body 元素，不設置邊距
                        console.log('🏷️ [全域側邊欄] 跳過 body 元素');
                    } else {
                        // 強制清除任何舊的inline styles並重新設置
                        element.style.marginLeft = '125px';
                        console.log(`🏷️ [全域側邊欄] 強制設置 ${selector}[${index}] 左邊距為125px`);
                    }
                });
            });

            console.log(`🏷️ [全域側邊欄] 總共調整了 ${foundContainers} 個容器`);
        } else {
            sidebar.style.display = 'none';
            console.log('🏷️ [全域側邊欄] 隱藏側邊欄（手機版）');

            // 強制移除桌面版的所有邊距，並清除任何inline styles
            const selectors = [
                '.main-layout',
                '.container',
                '.container-fluid',
                'body > .row',
                'main',
                '.content-wrapper'
            ];

            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach((element, index) => {
                    if (element.tagName !== 'BODY') {
                        // 完全清除margin-left的inline style，讓CSS媒體查詢生效
                        element.style.removeProperty('margin-left');
                        console.log(`🏷️ [全域側邊欄] 清除手機版 ${selector}[${index}] 左邊距inline樣式`);
                    }
                });
            });
        }
    }

    // 日曆功能已完全移除



    // 設置事件監聽器
    setupEventListeners() {
        // 響應式設計監聽器
        window.addEventListener('resize', () => {
            this.adjustMainContent();
        });

    }


    // 月份切換功能已移除

    // 刷新側邊欄數據
    refresh() {
        // 重新調整佈局即可
        this.adjustMainContent();
    }
}

// 全域側邊欄樣式
const sidebarStyles = `
<style>
/* 強制覆蓋瀏覽器預設樣式 */
body {
    margin: 0 !important;
    padding: 0 !important;
    overflow-x: hidden !important;
}

/* 移除所有滑軌 */
* {
    scrollbar-width: none !important; /* Firefox */
    -ms-overflow-style: none !important; /* IE and Edge */
}

*::-webkit-scrollbar {
    display: none !important; /* Chrome, Safari and Opera */
}

.global-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: 125px;
    height: 100vh;
    background: #f8f9fa;
    border-right: 1px solid #e9ecef;
    z-index: 1000;
    overflow-y: auto;
    padding: 15px;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft JhengHei', sans-serif;
    display: block;
}

/* 用戶資料區 */
.sidebar-profile {
    background: black;
    color: white;
    padding: 15px;
    text-align: center;
    border-radius: 8px;
    margin-bottom: 15px;
}

.profile-title {
    font-size: 12px;
    margin-bottom: 5px;
}

.profile-name {
    font-size: 14px;
    font-weight: bold;
}

/* 日曆樣式已完全移除 */


/* 響應式設計 - 手機版隱藏側邊欄 */
@media (max-width: 1023px) {
    .global-sidebar {
        display: none !important;
    }

    .main-layout {
        margin-left: 0 !important;
    }
}

/* 桌面版顯示側邊欄 */
@media (min-width: 1024px) {
    .global-sidebar {
        display: block !important;
    }
}
</style>
`;

// 將樣式注入頁面
document.head.insertAdjacentHTML('beforeend', sidebarStyles);

// 全域變量，供其他腳本使用
let globalSidebar = null;

// 初始化函數
function initGlobalSidebar() {
    console.log('🏷️ [全域側邊欄] 準備初始化，當前狀態:', document.readyState);

    if (!globalSidebar) {
        console.log('🏷️ [全域側邊欄] 創建新的全域側邊欄實例');
        globalSidebar = new GlobalSidebar();
        window.globalSidebar = globalSidebar;
        console.log('🏷️ [全域側邊欄] 全域側邊欄實例創建完成');
    } else {
        console.log('🏷️ [全域側邊欄] 全域側邊欄已存在，跳過創建');
    }
}

// DOM 載入完成後初始化
if (document.readyState === 'loading') {
    console.log('🏷️ [全域側邊欄] DOM正在載入，註冊DOMContentLoaded事件');
    document.addEventListener('DOMContentLoaded', initGlobalSidebar);
} else {
    console.log('🏷️ [全域側邊欄] DOM已載入完成，立即初始化');
    initGlobalSidebar();
}

// 為了確保在 LIFF 初始化後也能正常工作，提供延遲初始化
setTimeout(() => {
    if (!globalSidebar) {
        initGlobalSidebar();
    }
}, 1000);

// 監聽 LIFF 相關事件
if (typeof window !== 'undefined') {
    // 當 LIFF 初始化完成時
    window.addEventListener('liff-initialized', () => {
        if (globalSidebar) {
            globalSidebar.refresh();
        }
    });

    // 當用戶資料載入完成時
    window.addEventListener('profile-loaded', () => {
        if (globalSidebar) {
            globalSidebar.refresh();
        }
    });
}