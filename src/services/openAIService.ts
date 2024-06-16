import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();
// Initialize the OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// export const generateReply = async (emailContent: string): Promise<string> => {
//     const response = await openai.createCompletion({
//         model: 'text-davinci-003', gpt-3.5-turbo-instruct
//         prompt: `Generate a professional response for the following email content:\n\n${emailContent}`,
//         max_tokens: 150,
//     });

//     return response.data.choices[0].text.trim();
// };

export const categorizeEmail = async  (emailContent:string) => {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an email categorization assistant." },
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
        { role: "system", content: "You are an email response assistant." },
        { role: "user", content: `Generate a reply for the following email content: ${emailContent}.\nGenrate only body content.` }
        ],
    });
    if (response && response.choices && response.choices.length > 0 && response.choices[0].message.content) {
        return response.choices[0].message.content.trim();
    } else {
        throw new Error("Failed to get a response from the API");
    }
}