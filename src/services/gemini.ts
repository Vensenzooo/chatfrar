import { GoogleGenerativeAI } from "@google/generative-ai";
import { Message } from "../types";


const genAI = new GoogleGenerativeAI("AIzaSyAZMDvDenHr8OhJopHsEbAaj0ezxMZT3xQ");


const formatChatHistory = (messages: Message[]) => {
  return messages
    .map(msg => {
      const isGemini = msg.sender_id === 'gemini';
      return `${isGemini ? 'Gemini' : msg.sender.username}: ${msg.content}`;
    })
    .join('\n');
};

export async function getGeminiResponse(content: string, messages: Message[]): Promise<string | null> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Extraire la question après @gemini
    const question = content.replace('@gemini', '').trim();
    
    // Formater le contexte des messages precedents
    const chatHistory = formatChatHistory(messages);

    // Construire le prompt avec un contexte adapter
    const prompt = `Tu es Gemini, un assistant IA amical et utile. Tu dois garder en mémoire le contexte de la conversation et les informations importantes comme la localisation.

    Historique de la conversation:
    ${chatHistory}

    Question actuelle: ${question}

    Instructions:
    1. Réponds en français de manière concise et directe
    2. Si la question concerne la météo, utilise la localisation mentionnée précédemment
    3. Si la question concerne l'heure, donne l'heure actuelle pour la localisation mentionnée
    4. Garde en mémoire les informations importantes comme la localisation
    5. Si on te demande la météo sans localisation, demande où se trouve l'utilisateur

    Réponds maintenant:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error('Error getting Gemini response:', error);
    return "Désolé, je ne peux pas répondre pour le moment. Veuillez réessayer plus tard.";
  }
} 