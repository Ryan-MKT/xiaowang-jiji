// Test the updated flex message with fixed date
const { createTaskStackFlexMessage } = require('./task-flex-message');

// Test with sample tasks
const testTasks = [
  { id: 1759037587567, text: '襪子', completed: false }
];

console.log('Testing createTaskStackFlexMessage with fixed date...');

try {
  const flexMessage = createTaskStackFlexMessage(testTasks, null, 'general');

  console.log('✅ Flex message created successfully!');
  console.log('Alt text:', flexMessage.altText);

  // Check if date is correctly embedded in the body
  const bodyContents = flexMessage.contents.body.contents;
  console.log('Body contents count:', bodyContents.length);

  // Look for date text in the first text element (which should contain the date)
  const firstContent = bodyContents[0];
  if (firstContent && firstContent.type === 'box') {
    console.log('First content found:', firstContent.contents?.[0]?.text || 'No text found');
  }

  // Output to file for inspection
  require('fs').writeFileSync('./debug_flex_fixed.json', JSON.stringify({
    messages: [flexMessage]
  }, null, 2));

  console.log('✅ Flex message saved to debug_flex_fixed.json');

} catch (error) {
  console.error('❌ Error creating flex message:', error.message);
  console.error(error.stack);
}