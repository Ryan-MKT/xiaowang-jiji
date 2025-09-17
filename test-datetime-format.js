// 測試新的日期時間格式儲存
const fetch = require('node-fetch');

async function testNewDateTimeFormat() {
    console.log('🧪 [測試] 開始測試新的日期時間格式');

    const taskData = {
        taskId: Date.now(), // 使用當前時間戳作為 ID
        title: '新日期時間格式測試任務',
        note: '測試完整的 ISO 8601 格式儲存',
        tag: '測試',
        date: '2025-09-15T14:30:00', // 新格式：完整的 ISO 8601 timestamp
        reminder: null, // 不再使用 reminder 欄位
        repeat: null
    };

    try {
        const response = await fetch('http://localhost:3003/api/save-task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': 'test-datetime-user'
            },
            body: JSON.stringify(taskData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ [測試成功] 新格式儲存成功:', result);
        } else {
            const error = await response.text();
            console.error('❌ [測試失敗] 儲存失敗:', error);
        }
    } catch (error) {
        console.error('❌ [測試錯誤] 網路錯誤:', error);
    }
}

// 執行測試
testNewDateTimeFormat();