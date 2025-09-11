// 診斷同步問題 - 檢查為什麼 LIFF 沒有收到 FLEX MESSAGE 的任務資料
console.log('🔍 === 同步問題診斷開始 ===');

// 模擬實際的測試場景
const mockTasks = [
    { id: 1, text: '完成報告', timestamp: new Date().toISOString(), completed: false },
    { id: 2, text: '開會', timestamp: new Date().toISOString(), completed: true },
    { id: 3, text: '寫文件', timestamp: new Date().toISOString(), completed: false }
];

console.log('📋 模擬 FLEX MESSAGE 中的任務資料:');
mockTasks.forEach((task, index) => {
    console.log(`   ${index + 1}. ${task.text} ${task.completed ? '✅' : '⏳'}`);
});

// 問題 1: 檢查 URL 生成
function checkUrlGeneration() {
    console.log('\n🔍 檢查 1: URL 生成問題');
    console.log('=' .repeat(40));
    
    // 模擬 task-flex-message.js 中的 URL 生成
    const tasksJson = JSON.stringify(mockTasks);
    const encodedTasks = encodeURIComponent(tasksJson);
    const fullUrl = `https://22af292ce500.ngrok-free.app/liff/records?syncTasks=${encodedTasks}`;
    
    console.log('📝 原始任務 JSON 長度:', tasksJson.length);
    console.log('🔗 編碼後參數長度:', encodedTasks.length);
    console.log('🌐 完整 URL 長度:', fullUrl.length);
    console.log('🔗 URL 前100字元:', fullUrl.substring(0, 100) + '...');
    
    // 檢查 URL 長度是否過長
    if (fullUrl.length > 2048) {
        console.log('❌ 問題：URL 長度超過瀏覽器限制 (2048字元)');
        return { issue: 'url_too_long', length: fullUrl.length };
    } else {
        console.log('✅ URL 長度正常');
        return { issue: null, url: fullUrl };
    }
}

// 問題 2: 檢查 LIFF 路由配置
function checkLiffRouting() {
    console.log('\n🔍 檢查 2: LIFF 路由配置');
    console.log('=' .repeat(40));
    
    console.log('📋 當前 FLEX MESSAGE 連結指向:');
    console.log('   https://22af292ce500.ngrok-free.app/liff/records');
    
    console.log('📋 server.js 中的路由配置:');
    console.log('   GET /liff → liff-app.html (編輯頁面)');
    console.log('   GET /liff/records → liff-records.html (記錄頁面)');
    
    console.log('💡 可能問題: LIFF ID 動態替換可能沒有處理 records 路由');
    
    return { 
        issue: 'routing_mismatch',
        recommendation: '檢查 server.js 中 /liff/records 路由是否有動態 LIFF ID 處理'
    };
}

// 問題 3: 檢查 LIFF ID 配置
function checkLiffIdConfiguration() {
    console.log('\n🔍 檢查 3: LIFF ID 配置問題');
    console.log('=' .repeat(40));
    
    console.log('📋 liff-records.html 中的 LIFF ID:');
    console.log('   硬編碼: 2008077335-rZlgE4bX (開發環境)');
    
    console.log('📋 FLEX MESSAGE 連結使用的 LIFF ID:');
    console.log('   可能不一致，需要確認環境變數');
    
    return {
        issue: 'liff_id_mismatch',
        recommendation: '確保 FLEX MESSAGE 和 liff-records.html 使用相同的 LIFF ID'
    };
}

// 問題 4: 檢查同步邏輯
function checkSyncLogic() {
    console.log('\n🔍 檢查 4: 同步邏輯問題');
    console.log('=' .repeat(40));
    
    // 模擬 LIFF 頁面的同步檢查邏輯
    const mockUrl = 'https://22af292ce500.ngrok-free.app/liff/records?syncTasks=%5B%7B%22id%22%3A1%7D%5D';
    const urlParams = new URLSearchParams(mockUrl.split('?')[1]);
    const syncTasks = urlParams.get('syncTasks');
    
    console.log('📥 模擬 URL 參數解析:');
    console.log('   syncTasks 參數存在:', !!syncTasks);
    
    if (syncTasks) {
        try {
            const parsedTasks = JSON.parse(decodeURIComponent(syncTasks));
            console.log('   解析成功，任務數量:', parsedTasks.length);
            return { issue: null, success: true };
        } catch (error) {
            console.log('❌ 解析失敗:', error.message);
            return { issue: 'parsing_failed', error: error.message };
        }
    } else {
        console.log('❌ syncTasks 參數不存在');
        return { issue: 'no_sync_param' };
    }
}

// 問題 5: 檢查實際的記錄頁面訪問
function checkRecordsPageAccess() {
    console.log('\n🔍 檢查 5: 記錄頁面訪問問題');
    console.log('=' .repeat(40));
    
    console.log('🔍 根據你提供的 LOG:');
    console.log('   "🔄 [記錄同步] 開始載入任務記錄..."');
    console.log('   "💾 [記錄同步] 無現有任務記錄"');
    console.log('   "📊 [記錄同步] 最終任務數量: 0"');
    
    console.log('\n💡 診斷結果:');
    console.log('   ✅ LIFF 頁面成功載入');
    console.log('   ✅ checkForSyncData() 函數有執行');
    console.log('   ❌ window.flexMessageTasks 為空或不存在');
    console.log('   ❌ localStorage 也沒有任務資料');
    
    console.log('\n🎯 可能原因:');
    console.log('   1. FLEX MESSAGE 沒有攜帶 syncTasks 參數');
    console.log('   2. URL 參數被截斷或遺失');
    console.log('   3. LIFF 初始化前參數已經遺失');
    
    return {
        issue: 'no_sync_data_received',
        causes: ['missing_url_param', 'url_truncated', 'timing_issue']
    };
}

// 解決方案建議
function provideSolutions() {
    console.log('\n💡 === 解決方案建議 ===');
    console.log('=' .repeat(40));
    
    const solutions = [
        {
            issue: 'FLEX MESSAGE 連結問題',
            solution: '檢查 task-flex-message.js 中的 records 連結是否正確生成'
        },
        {
            issue: '路由配置問題', 
            solution: '確保 server.js 的 /liff/records 路由有動態 LIFF ID 處理'
        },
        {
            issue: '參數傳遞問題',
            solution: '使用 postMessage 或 localStorage 代替 URL 參數傳遞大量資料'
        },
        {
            issue: '時間順序問題',
            solution: '延遲 LIFF 初始化，確保 URL 參數解析完成'
        }
    ];
    
    solutions.forEach((sol, index) => {
        console.log(`\n${index + 1}. ${sol.issue}:`);
        console.log(`   💊 ${sol.solution}`);
    });
    
    console.log('\n🚀 建議的緊急修復:');
    console.log('   1. 在 liff-records.html 中加入 URL 參數的詳細 LOG');
    console.log('   2. 檢查瀏覽器開發者工具的 Network 面板');
    console.log('   3. 確認 FLEX MESSAGE 實際生成的連結');
    
    return solutions;
}

// 執行所有診斷
async function runDiagnostics() {
    console.log('🚀 開始完整診斷...\n');
    
    const results = {
        urlGen: checkUrlGeneration(),
        routing: checkLiffRouting(), 
        liffId: checkLiffIdConfiguration(),
        syncLogic: checkSyncLogic(),
        pageAccess: checkRecordsPageAccess()
    };
    
    const solutions = provideSolutions();
    
    console.log('\n📊 === 診斷總結 ===');
    console.log('=' .repeat(40));
    
    const issues = Object.entries(results).filter(([key, result]) => result.issue);
    
    if (issues.length > 0) {
        console.log('❌ 發現的問題:');
        issues.forEach(([key, result]) => {
            console.log(`   • ${key}: ${result.issue}`);
        });
    } else {
        console.log('✅ 邏輯診斷未發現明顯問題');
    }
    
    console.log('\n🎯 下一步行動:');
    console.log('   1. 檢查實際的 FLEX MESSAGE 輸出');
    console.log('   2. 確認瀏覽器收到的 URL');
    console.log('   3. 驗證 server.js 路由處理');
    
    return { results, solutions };
}

// 執行診斷
runDiagnostics()
    .then(() => {
        console.log('\n🏁 診斷完成');
    })
    .catch(error => {
        console.error('💥 診斷失敗:', error);
    });