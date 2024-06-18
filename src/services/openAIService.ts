import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();
// Initialize the OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to categorize email
export const categorizeEmail = async  (emailContent:string) => {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an email categorization assistant. Your task is to categorize emails based on their content" },
        { role: "user", content: `Categorize the following email: ${emailContent}\nCategories: Interested, Not Interested, More Information` }
      ],
    });
  
    if (response && response.choices && response.choices.length > 0 && response.choices[0].message.content) {
        return response.choices[0].message.content.trim();
    } else {
        throw new Error("Failed to get a response from the API");
    }
}
  
  // Function to generate email replies
export async function generateReply(emailContent :string) {
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
        { role: "system", content: "You are an email response assistant. Your task is to generate appropriate and professional replies to emails. Provide only the body content of the reply without any additional text." },
        { role: "user", content: `Generate a reply for the following email content: ${emailContent}` }
        ],
    });
    if (response && response.choices && response.choices.length > 0 && response.choices[0].message.content) {
        return response.choices[0].message.content.trim();
    } else {
        throw new Error("Failed to get a response from the API");
    }
}