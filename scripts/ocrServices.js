// services/ocrService.js
import * as FileSystem from "expo-file-system";

// Option 1: Using Tesseract.js (Client-side OCR)
import Tesseract from "tesseract.js";

export const recognizeText = async (imageUri) => {
  try {
    // Convert image to base64 for processing
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const imageData = `data:image/jpeg;base64,${base64}`;

    // Use Tesseract.js for OCR
    const result = await Tesseract.recognize(imageData, "eng", {
      logger: (m) => console.log(m), // Optional: log progress
    });

    return result.data.text;
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};

// Option 2: Google Vision API (More accurate but requires API key)
/*
const GOOGLE_VISION_API_KEY = 'YOUR_API_KEY_HERE';

export const recognizeTextWithGoogleVision = async (imageUri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    );

    const result = await response.json();
    
    if (result.responses && result.responses[0] && result.responses[0].textAnnotations) {
      return result.responses[0].textAnnotations[0].description;
    }
    
    return '';
  } catch (error) {
    console.error('Google Vision API Error:', error);
    throw error;
  }
};
*/

// Option 3: Simple pattern matching for structured data (Fallback)
export const parseStructuredText = (text) => {
  const lines = text.split("\n");
  const data = [];

  lines.forEach((line) => {
    // Look for patterns like: date | sales | remit | payment | balance
    const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    const numberMatches = line.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);

    if (dateMatch && numberMatches && numberMatches.length >= 2) {
      data.push({
        date: dateMatch[1],
        values: numberMatches.map((num) => num.replace(/,/g, "")),
      });
    }
  });

  return data;
};
