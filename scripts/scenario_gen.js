import dotenv from 'dotenv';
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// scripts/scenario_gen.js
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import prompt2 from '../prompts/prompt2.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateScenario() {
  const newsText = fs.readFileSync(path.join(path.resolve(), 'data', 'news.txt'), 'utf-8').trim();
  const scenarioPrompt = prompt2(newsText);

  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: scenarioPrompt }],
    max_tokens: 3000,
    temperature: 1
  });

  // Очищаем от возможных префиксов, объяснений и парсим JSON
  let raw = choices[0].message.content;
  raw = raw.replace(/^```json|^```|```$/gm, '').trim();
  const scenario = JSON.parse(raw);

  fs.writeFileSync(path.join(path.resolve(), 'data', 'scenario.json'), JSON.stringify(scenario, null, 2), 'utf-8');
  console.log('scenario.json успешно создан!');
}

generateScenario();
