import axios from "axios";

// ====== USE CORS PROXY FOR GROQ ======
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || "";
const GROQ_URL =
  "https://corsproxy.io/?" +
  encodeURIComponent("https://api.groq.com/openai/v1/chat/completions");

const MAX_TEXT_LENGTH = 3000;
const MODEL = "llama-3.1-8b-instant";

export const generateUnits = async (text, language, retryCount = 0) => {
  const textToSend = text.substring(0, MAX_TEXT_LENGTH);

  const prompt = `
Create JSON from this text:
${textToSend}

Language: ${language}

Format:
{
  "courseTitle": "title",
  "units": [{
    "id": 1,
    "title": "Unit 1",
    "description": "Description",
    "lessons": [{
      "id": 1,
      "title": "Lesson 1",
      "content": "Lesson content",
      "vocabulary": [{"word": "word", "meaning": "meaning"}]
    }],
    "quiz": {
      "questions": [{"question": "Q?", "options": ["A","B","C","D"], "answer": 0}]
    }
  }]
}

ONLY JSON. No other text.`;

  try {
    console.log(
      `🔄 Sending request to Groq via CORS proxy (attempt ${retryCount + 1})...`,
    );

    const response = await axios.post(
      GROQ_URL,
      {
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a JSON generator. Output ONLY valid JSON. Never output any other text.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      },
    );

    const content = response.data.choices[0].message.content;
    let jsonString = content.replace(/```json/g, "").replace(/```/g, "");
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    jsonString = jsonString
      .replace(/,\s*}/g, "}")
      .replace(/,\s*\]/g, "]")
      .replace(/—/g, "-")
      .replace(/’/g, "'")
      .replace(/“/g, '"')
      .replace(/”/g, '"')
      .trim();

    const result = JSON.parse(jsonString);

    if (!result.units || result.units.length === 0) {
      result.units = [
        {
          id: 1,
          title: "Course Content",
          description: "Content from the text",
          lessons: [
            {
              id: 1,
              title: "Main Lesson",
              content: textToSend.substring(0, 500),
              vocabulary: [],
            },
          ],
          quiz: {
            questions: [
              {
                question: "What did you learn?",
                options: ["A", "B", "C", "D"],
                answer: 0,
              },
            ],
          },
        },
      ];
    }

    return result;
  } catch (error) {
    console.error("❌ Groq Error:", error);

    if (error.response?.status === 429 && retryCount < 3) {
      const waitTime = (retryCount + 1) * 8000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return generateUnits(text, language, retryCount + 1);
    }

    return {
      courseTitle: `${language} Course`,
      units: [
        {
          id: 1,
          title: "Content from Text",
          description: textToSend.substring(0, 200),
          lessons: [
            {
              id: 1,
              title: "Main Lesson",
              content: textToSend.substring(0, 800),
              vocabulary: [],
            },
          ],
          quiz: {
            questions: [
              {
                question: "What is the main topic?",
                options: ["A", "B", "C", "D"],
                answer: 0,
              },
            ],
          },
        },
      ],
    };
  }
};
