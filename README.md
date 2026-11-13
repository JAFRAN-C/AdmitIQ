# AdmitIQ

> Exams that understand how you think.

AdmitIQ is an intelligent exam platform that silently tracks student behavior—including response time, option switching, hesitation, and decision confidence—to generate a behavioral DNA report and personalized AI-powered study notes in Bengali.

## Features
- **Behavior Intelligence Tracking**: Tracks time per question, switch count, click sequence, and confidence.
- **DNA Report**: Categorizes performance into *Slow*, *Confused*, *Mastered*, and *Danger* (confidently wrong).
- **AI Study Notes Powered by Qwen**: Automatically generates concise Bengali study notes, comparison tables, memory tricks, and trap questions using Qwen.
- **Interactive UI**: Clean, responsive frontend with a cinematic intro animation.

## Getting Started

### 1. Install Dependencies
```bash
cd medha-out
npm install
```

### 2. Configure Environment Variables
Create a `.env` file inside `medha-out/`:
```env
GROQ_API_KEY=your_groq_api_key_here
MODEL=qwen/qwen3.8-27b
PORT=3000
```
*(Optionally, you can configure a direct Qwen / DashScope API key with `QWEN_API_KEY`)*

### 3. Run the Server
```bash
npm start
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.
