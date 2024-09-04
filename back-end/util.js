const axios = require("axios")
require('dotenv').config();

async function testOpenAIKey() {
    console.log('Starting test for OpenAI key...');

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Say this is a test' }
                ],
                max_tokens: 5
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_KEY}`
                }
            }
        );
        const messageContent = response.data.choices[0].message.content;
        console.log('Response Message:', messageContent);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }

    console.log('Finished test for OpenAI key');
}

testOpenAIKey();