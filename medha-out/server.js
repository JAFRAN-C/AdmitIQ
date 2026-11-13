const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.'));  // serves the frontend

// Helper to call Qwen via Groq or native Qwen API
async function generateWithQwen(dnaReport) {
  const prompt = `You are AdmitIQ's study note generator. You receive a student's DNA exam report and generate structured study notes.

CRITICAL RULES:
1. Respond ONLY with valid JSON. No extra text, no markdown, no backticks.
2. Follow the exact output schema provided.
3. Never copy raw exam questions — derive the topic from the correct answer.
4. For confused questions, the comparisonTable first entry is ALWAYS the correct concept.
5. Include ALL options the student clicked as wrong columns in the table.
6. Keep explanations concise and student-friendly.
7. IMPORTANT: Write ALL study note content in Bangla (Bengali language). Topics, explanations, memory tricks, trap questions — everything in Bangla.

OUTPUT SCHEMA:
{
  "slow": [{ "topic": "", "explanation": "", "memoryTrick": "", "trapQuestion": "" }],
  "confused": [{ "topic": "", "comparisonTable": [{"concept":"","description":""}], "memoryTrick": "", "trapQuestion": "" }],
  "danger": [{ "topic": "", "explanation": "", "whyCorrect": "", "whyTricked": "", "trapQuestion": "" }]
}

DNA REPORT:
${JSON.stringify(dnaReport)}`;

  let rawContent = '';

  // 1. If dedicated Qwen API key (DashScope / OpenAI compatible) is configured
  const qwenApiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
  if (qwenApiKey) {
    const baseUrl = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
    const model = process.env.QWEN_MODEL || 'qwen-plus';
    console.log(`Calling native Qwen API (${model})...`);
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${qwenApiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Qwen API returned ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    rawContent = data.choices?.[0]?.message?.content || '';
  } else {
    // 2. Default: Use Qwen on Groq (fast, reliable)
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      throw new Error('Neither GROQ_API_KEY nor QWEN_API_KEY is configured in .env');
    }

    const model = process.env.MODEL || 'qwen/qwen3.8-27b';
    console.log(`Calling Groq Qwen model (${model})...`);
    const groq = new Groq({ apiKey: groqKey });

    const completion = await groq.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      max_tokens: 3000,
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }]
    });

    rawContent = completion.choices?.[0]?.message?.content || '';
  }

  // Sanitize LLM response (strip thinking tags, code fences, markdown)
  let cleanText = rawContent
    .replace(/<think>[\s\S]*?<\/think>/gi, '') // remove reasoning tags if any
    .trim();

  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Parse JSON
  const parsed = JSON.parse(cleanText);

  return {
    slow: Array.isArray(parsed.slow) ? parsed.slow : [],
    confused: Array.isArray(parsed.confused) ? parsed.confused : [],
    danger: Array.isArray(parsed.danger) ? parsed.danger : []
  };
}

app.post('/generate-notes', async (req, res) => {
  const { dnaReport } = req.body;

  if (!dnaReport) {
    return res.status(400).json({ error: 'dnaReport is required' });
  }

  // If report has no issues needing notes
  const totalCount =
    (dnaReport.slow?.length || 0) +
    (dnaReport.confused?.length || 0) +
    (dnaReport.danger?.length || 0);

  if (totalCount === 0) {
    return res.json({
      notes: { slow: [], confused: [], danger: [] }
    });
  }

  try {
    const notes = await generateWithQwen(dnaReport);
    return res.json({ notes });
  } catch (err) {
    console.error('Note generation failed:', err);
    return res.status(500).json({
      error: 'AI request failed',
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AdmitIQ server running on port ${PORT}`);
});
