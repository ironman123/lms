// // scripts/ocr-test.ts
// import fs from 'fs';
// import path from 'path';
// import DiscoveryV2 from 'ibm-watson/discovery/v2';
// import { IamAuthenticator } from 'ibm-watson/auth';
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import * as dotenv from 'dotenv';

// // Load .env variables
// dotenv.config();

// // Initialize Clients
// const discovery = new DiscoveryV2({
//     version: '2020-08-30',
//     authenticator: new IamAuthenticator({ apikey: process.env.IBM_WATSON_API_KEY || '' }),
//     serviceUrl: process.env.IBM_WATSON_URL,
// });

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// async function processDocument(inputPath: string) {
//     const fileName = path.basename(inputPath);
//     console.log(`🚀 Processing: ${fileName}`);

//     try
//     {
//         // 1. IBM Watson - Layout & Text Extraction
//         console.log("⏳ Step 1: IBM Watson analyzing structure...");
//         const fileBuffer = fs.readFileSync(inputPath);

//         const ibmResponse = await discovery.analyzeDocument({
//             projectId: process.env.IBM_PROJECT_ID || '',
//             file: fileBuffer,
//             filename: fileName,
//         });

//         // Group elements by page
//         const pages: Record<number, string[]> = {};
//         ibmResponse.result.elements?.forEach((el: any) => {
//             const pageNum = el.location?.page_number || 1;
//             if (!pages[pageNum]) pages[pageNum] = [];
//             pages[pageNum].push(`[${el.attributes?.[0]?.type || 'text'}] ${el.text}`);
//         });

//         console.log(`✅ IBM found ${Object.keys(pages).length} pages.`);

//         // 2. Gemini - JSON Structuring
//         let allQuestions: any[] = [];
//         const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//         for (const pageNum of Object.keys(pages))
//         {
//             console.log(`⏳ Step 2: Gemini structuring Page ${pageNum}...`);

//             const pageText = pages[parseInt(pageNum)].join('\n');

//             const prompt = `
//         Convert the following OCR text from a question paper into a structured JSON array.
//         Text:
//         ${pageText}

//         Return ONLY a JSON array with this schema:
//         [{
//           "content": "the question",
//           "type": "MCQ",
//           "difficulty": "MEDIUM",
//           "topic": "infer from content",
//           "options": [
//             { "text": "Option A", "isCorrect": boolean },
//             { "text": "Option B", "isCorrect": boolean }
//           ],
//           "explanation": "brief reasoning"
//         }]
//       `;

//             const aiResult = await model.generateContent(prompt);
//             const rawJson = aiResult.response.text().replace(/```json|```/g, "").trim();

//             try
//             {
//                 const parsed = JSON.parse(rawJson);
//                 allQuestions = [...allQuestions, ...parsed];
//             } catch (e)
//             {
//                 console.error(`❌ Failed to parse JSON on page ${pageNum}`);
//             }

//             // Delay to respect Free Tier Rate Limits (RPM)
//             if (Object.keys(pages).length > 1) await new Promise(r => setTimeout(r, 3000));
//         }

//         // 3. Save Output
//         const outputPath = path.join(process.cwd(), 'ocr-output.json');
//         fs.writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2));

//         console.log(`\n✨ FINISHED! Saved ${allQuestions.length} questions to: ocr-output.json`);

//     } catch (error)
//     {
//         console.error("❌ Pipeline Error:", error);
//     }
// }

// // EXECUTION
// // Get file path from command line argument
// const targetFile = process.argv[2];

// if (!targetFile)
// {
//     console.error("Please provide a file path: npx ts-node scripts/ocr-test.ts ./my-paper.pdf");
// } else
// {
//     processDocument(path.resolve(targetFile));
// }