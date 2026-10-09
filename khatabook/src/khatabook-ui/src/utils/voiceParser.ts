import { Item } from '../types';

export interface VoiceParsedItem {
  matchedItem: Item;
  quantity: number;
  rawText: string;
}

// Convert common Indian number words in Hindi/Gujarati/English to digits
const numberWordMap: Record<string, number> = {
  'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5, 'chhe': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'એક': 1, 'બે': 2, 'ત્રણ': 3, 'ચાર': 4, 'પાંચ': 5, 'છ': 6, 'સાત': 7, 'આઠ': 8, 'નવ': 9, 'દસ': 10,
  'half': 0.5, 'adha': 0.5, 'adho': 0.5, 'aadha': 0.5, 'અડધો': 0.5, 'आधा': 0.5
};

export function parseVoiceCommand(transcript: string, items: Item[]): VoiceParsedItem | null {
  if (!transcript.trim() || items.length === 0) return null;

  const clean = transcript.toLowerCase().trim();
  const words = clean.split(/\s+/);

  let quantity = 1;
  let remainingWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Check if numeric
    const parsedNum = parseFloat(word);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      quantity = parsedNum;
      continue;
    }

    // Check if number word
    if (numberWordMap[word] !== undefined) {
      quantity = numberWordMap[word];
      continue;
    }

    // Ignore filler words like "packet", "kg", "kilo", "bag", "box", "piece", "aur", "and", "add", "karo", "do"
    if (['packet', 'packets', 'kg', 'kilo', 'bag', 'bags', 'box', 'boxes', 'strip', 'strips', 'pcs', 'piece', 'pieces', 'aur', 'and', 'add', 'karo', 'kar do', 'do', 'na', 'chahiye'].includes(word)) {
      continue;
    }

    remainingWords.push(word);
  }

  const searchTerm = remainingWords.join(' ');
  if (!searchTerm) return null;

  // Find best match in inventory
  const bestMatch = items.find((item) => {
    const name = item.name.toLowerCase();
    const native = (item.nativeName || '').toLowerCase();
    const barcode = (item.barcode || '').toLowerCase();

    return name.includes(searchTerm) || searchTerm.includes(name) ||
           (native && (native.includes(searchTerm) || searchTerm.includes(native))) ||
           barcode === searchTerm;
  });

  if (!bestMatch) {
    // Try partial word match
    const partialMatch = items.find((item) => {
      const name = item.name.toLowerCase();
      return remainingWords.some((w) => w.length > 2 && name.includes(w));
    });

    if (partialMatch) {
      return {
        matchedItem: partialMatch,
        quantity,
        rawText: transcript
      };
    }
    return null;
  }

  return {
    matchedItem: bestMatch,
    quantity,
    rawText: transcript
  };
}
