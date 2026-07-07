import 'dotenv/config';
import { generateShopAIResponse } from './src/lib/gemini';

async function runTest() {
  console.log('⏳ Booting up Sizabantu AI Engine (Sizwe)...');
  
  const testMessage = "Howzit! How does the appointment check-in work when I get to the shop?";
  console.log(`\n🗣️ Test Customer asks: "${testMessage}"\n`);

  const result = await generateShopAIResponse(
    testMessage,
    "Shop Status: Open today until 6 PM.",
    "test-user-terminal"
  );

  if (result.success) {
    console.log('\x1b[36m🤖 Sizwe responds:\x1b[0m');
    console.log(result.text);
    console.log('\x1b[32m🎉 BLOCK 1 FULLY OPERATIONAL!\x1b[0m');
  } else {
    console.error('\x1b[31m💥 AI Engine Failed:\x1b[0m', result.error);
  }
}

runTest();
