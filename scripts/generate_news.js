import dotenv from 'dotenv';
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import getToday from '../utils/getToday.js';
import prompt1 from '../prompts/prompt1.js';

const date = getToday();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateNews() {
  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt1(date) }],
    max_tokens: 512,
    temperature: 1
  });

  const newsText = choices[0].message.content.trim();
  fs.writeFileSync(path.join(path.resolve(), 'data', 'news.txt'), newsText, 'utf-8');
  console.log('Новость сгенерирована:\n', newsText);
}

generateNews();
