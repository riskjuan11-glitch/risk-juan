
import { GoogleGenAI, Type } from "@google/genai";
import { KycData, IdCardData } from '../types';
import { SYSTEM_INSTRUCTION, ID_SCANNER_SYSTEM_INSTRUCTION } from '../constants';

const KycDataSchema = {
  type: Type.OBJECT,
  properties: {
    date: { type: Type.STRING, nullable: true, description: "The date of the audit, if available." },
    auditor: { type: Type.STRING, nullable: true, description: "The name or ID of the auditor, if available." },
    member_id: { type: Type.STRING, nullable: true, description: "The numeric member ID." },
    name: { type: Type.STRING, nullable: true, description: "The full name of the member, if available." },
    remark_raw: { type: Type.STRING, description: "The exact, original remark text from the image." },
    remark_normalized: { type: Type.STRING, description: "The remark normalized to a canonical label." },
    kyc_status: { type: Type.STRING, description: "The KYC status, e.g., 'Failed' or 'Verification Approved'." },
    confidence: { type: Type.NUMBER, description: "Overall confidence score for the entire extraction." },
    fields_confidence: {
      type: Type.OBJECT,
      properties: {
        member_id: { type: Type.NUMBER, description: "Confidence for member_id extraction." },
        remark_raw: { type: Type.NUMBER, description: "Confidence for remark_raw extraction." },
      },
      required: ['member_id', 'remark_raw']
    },
    notes: { type: Type.STRING, description: "Any notes about the extraction process or uncertainties." },
    csv_row: { type: Type.STRING, description: "The final, Google Sheet-compatible CSV row." },
  },
  required: ['date', 'auditor', 'member_id', 'name', 'remark_raw', 'remark_normalized', 'kyc_status', 'confidence', 'fields_confidence', 'notes', 'csv_row']
};


const IdCardDataSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, nullable: true, description: 'Full name in "First Middle Last" format.' },
        dateOfBirth: { type: Type.STRING, nullable: true, description: 'Date of birth in YYYY-MM-DD format.' },
        idNumber: { type: Type.STRING, nullable: true, description: 'The ID card number.' },
        dateOfExpiry: { type: Type.STRING, nullable: true, description: 'The expiration date in YYYY-MM-DD format.' },
    },
    required: ['name', 'dateOfBirth', 'idNumber'],
};


export const extractKycDataFromImage = async (
  base64Image: string,
  mimeType: string
): Promise<KycData> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart] },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: KycDataSchema,
      },
    });

    const text = response.text.trim();
    const data: KycData = JSON.parse(text);
    return data;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to extract KYC data: ${error.message}`);
    }
    throw new Error('An unknown error occurred during KYC data extraction.');
  }
};


export const extractIdCardData = async (
  base64Image: string,
  mimeType: string
): Promise<IdCardData> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart] },
      config: {
        systemInstruction: ID_SCANNER_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: IdCardDataSchema,
      },
    });

    const text = response.text.trim();
    const data: IdCardData = JSON.parse(text);
    return data;
  } catch (error) {
    console.error("Error calling Gemini API for ID Scan:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to extract ID card data: ${error.message}`);
    }
    throw new Error('An unknown error occurred during ID card data extraction.');
  }
};