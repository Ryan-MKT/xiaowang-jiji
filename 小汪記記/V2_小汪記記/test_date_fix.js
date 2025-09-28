// Test date function to debug issue
function testDateFunction() {
  const now = new Date();
  const taipeiDate = new Date(now.toLocaleString('en-US', {timeZone: 'Asia/Taipei'}));

  const month = taipeiDate.getMonth() + 1;
  const day = taipeiDate.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[taipeiDate.getDay()];

  console.log('Debug values:');
  console.log('now:', now);
  console.log('taipeiDate:', taipeiDate);
  console.log('month:', month);
  console.log('day:', day);
  console.log('weekday:', weekday);

  return {
    dateText: `${month}/${day}`,
    weekdayText: ` (${weekday})`
  };
}

console.log('Test result:', testDateFunction());

// Also test the actual function from the module
try {
  const { generateDateTitle } = require('./task-flex-message');
  console.log('Module function result:', generateDateTitle());
} catch (error) {
  console.log('Error loading module:', error.message);
}