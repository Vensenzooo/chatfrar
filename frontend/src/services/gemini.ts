import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Message } from "../types";

// Initialisation de l'API Gemini
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

if (!API_KEY) {
  console.error("La clé API Gemini n'est pas configurée dans le fichier .env");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Fonction pour formater l'historique des messages
const formatChatHistory = (messages: Message[]): string => {
  return messages
    .filter(msg => msg.content.toLowerCase().includes('@gemini'))
    .map(msg => `${msg.sender.username}: ${msg.content}\nGemini: ${msg.gemini_response || ''}`)
    .join('\n\n');
};

export async function getGeminiResponse(content: string, messages: Message[]): Promise<string> {
  try {
    if (!API_KEY) {
      throw new Error("La clé API Gemini n'est pas configurée");
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const chatHistory = formatChatHistory(messages);
    const prompt = `${chatHistory}\n\nUser: ${content}\nGemini:`;

    console.log("Envoi de requête à Gemini:", prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""));
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
    
    const response = await result.response;
    const text = response.text();
    
    console.log("Réponse reçue de Gemini:", text.substring(0, 100) + (text.length > 100 ? "..." : ""));
    
    return text;
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API Gemini:", error);
    return 'Désolé, je ne peux pas répondre pour le moment.';
  }
} 