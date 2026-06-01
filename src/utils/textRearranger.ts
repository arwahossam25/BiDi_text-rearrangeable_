import { Token, TokenType, RearrangeSettings, ParagraphAnalysis, LineAnalysis, ProcessingResult } from '../types';

/**
 * Tokenizes text into structured lexical units, preserving whitespace and identifying language.
 */
export function tokenizeText(text: string): Token[] {
  // Pattern components:
  // 1. Arabic: High-range Arabic unicode block characters
  // 2. English: Standard latin letters
  // 3. Numeric: Unicode numerals
  // 4. Space: Whitespace runs
  // 5. Punctuation/Other: Punctuation and specific signs
  const regex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)|([a-zA-Z]+)|(\d+)|(\s+)|([^\s\w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF])/g;

  let match;
  const tokens: Token[] = [];
  let idCounter = 0;

  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const rawVal = match[0];
    let type: TokenType = 'other';

    if (match[1]) {
      type = 'arabic';
    } else if (match[2]) {
      type = 'english';
    } else if (match[3]) {
      type = 'numeric';
    } else if (match[4]) {
      type = 'space';
    } else if (match[5]) {
      type = 'punctuation';
    }

    tokens.push({
      id: `token-${idCounter++}-${Math.random().toString(36).substring(2, 6)}`,
      text: rawVal,
      type,
    });
  }

  return tokens;
}

/**
 * Reverses characters of Arabic words (used to fix broken RTL rendering from PDFs)
 */
export function reverseWordChars(word: string): string {
  return word.split('').reverse().join('');
}

/**
 * Rearranges tokens based on the selected mode and correction criteria
 */
export function processTokens(tokens: Token[], settings: RearrangeSettings): Token[] {
  // Basic cleaning of tokens:
  // Filter out excessive spacing if requested
  let filteredTokens = [...tokens];
  if (settings.cleanDoubleSpaces) {
    filteredTokens = filteredTokens.filter((token, idx) => {
      if (token.type === 'space') {
        // Only keep space if the previous token wasn't a space, or if it's a newline
        if (token.text.includes('\n')) return true;
        const prev = filteredTokens[idx - 1];
        if (prev && prev.type === 'space') return false;
      }
      return true;
    });
  }

  // Separate non-space/non-newline words and punctuation to rearrange,
  // keeping track of their semantic blocks.
  const isSpacingOrNewline = (t: Token) => t.type === 'space' && t.text.includes('\n');

  // Let's divide input into subgroups separated by hard newlines,
  // then process each subgroup individually.
  const lines: Token[][] = [[]];
  for (const t of filteredTokens) {
    if (isSpacingOrNewline(t)) {
      lines.push([]);
    } else {
      lines[lines.length - 1].push(t);
    }
  }

  const rearrangedLineTokens: Token[] = [];

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const lineTokens = lines[lIdx];
    
    // Filter out standard spacing inside line to count words, 
    // but keep punctuation and words
    const contentTokens = lineTokens.filter(t => t.type !== 'space');
    
    if (contentTokens.length === 0) {
      continue;
    }

    let processedLine: Token[] = [];

    if (settings.mode === 'english-start') {
      // 1. ENGLISH START MODE:
      // Search for English words as anchors.
      // Scan tokens. Pre-pend anything before the first English word.
      // Then: first English word -> Arabic sentence between -> second English word
      
      const firstEngIdx = contentTokens.findIndex(t => t.type === 'english');
      
      if (firstEngIdx === -1) {
        // No English words in this line. Output original or reversed Arabic text
        processedLine = formatArabicBlock(contentTokens, settings);
      } else {
        // Add preamble (any tokens before the first English word)
        const preambleRecs = contentTokens.slice(0, firstEngIdx);
        processedLine.push(...formatArabicBlock(preambleRecs, settings));

        // Let's find all indices of English tokens
        const englishIndices: number[] = [];
        for (let i = firstEngIdx; i < contentTokens.length; i++) {
          if (contentTokens[i].type === 'english') {
            englishIndices.push(i);
          }
        }

        // Loop over successive English anchors
        for (let idx = 0; idx < englishIndices.length; idx++) {
          const currentEngIdx = englishIndices[idx];
          const currentEngToken = contentTokens[currentEngIdx];
          
          let processedEngText = currentEngToken.text;
          if (settings.reverseEnglishWords) {
            processedEngText = reverseWordChars(processedEngText);
          }
          
          const finalEngToken = { ...currentEngToken, text: processedEngText };

          if (idx < englishIndices.length - 1) {
            const nextEngIdx = englishIndices[idx + 1];
            // Arabic/punctuation/numbers between currentEngIdx and nextEngIdx
            const betweenTokens = contentTokens.slice(currentEngIdx + 1, nextEngIdx);
            
            // Format the Arabic block between them
            const formattedArabic = formatArabicBlock(betweenTokens, settings);

            // "right to left : first English word --> the Arabic sentence between them --> second English word"
            // Since this is evaluated RTL or logically:
            // Under default RTL layout or requested rearrangement, we can sequence them:
            // Standard order: First English -> Arabic middle -> Second English.
            // If the user's scan requires a true physical RTL re-distribution for standard LTR text input boxes:
            // e.g. We want to place the first English word visually on the right, and second on the left:
            // Line layout visual RTL becomes: [Next English] [Arabic sentence] [Current English]
            // We can arrange the logical tokens in normal reading order, but let's offer
            // LTR or RTL logical re-ordering!
            // Let's do logical ordering: [Current English] [Arabic Middle]
            processedLine.push(finalEngToken);
            processedLine.push(...formattedArabic);
          } else {
            // This is the last English word. Add it, and then add any trailing tokens as Arabic
            processedLine.push(finalEngToken);
            
            const postamble = contentTokens.slice(currentEngIdx + 1);
            if (postamble.length > 0) {
              processedLine.push(...formatArabicBlock(postamble, settings));
            }
          }
        }
      }
    } else {
      // 2. ARABIC START MODE:
      // Search for Arabic words as anchors.
      // Scan tokens. Pre-pend anything before the first Arabic word.
      // Then: first Arabic word --> English sentence between them --> second Arabic word
      
      const firstAraIdx = contentTokens.findIndex(t => t.type === 'arabic');
      
      if (firstAraIdx === -1) {
        // No Arabic words in this line. Output English text directly
        processedLine = contentTokens.map(t => {
          if (t.type === 'english' && settings.reverseEnglishWords) {
            return { ...t, text: reverseWordChars(t.text) };
          }
          return t;
        });
      } else {
        // Add preamble (any tokens before the first Arabic word)
        const preamble = contentTokens.slice(0, firstAraIdx).map(t => {
          if (t.type === 'english' && settings.reverseEnglishWords) {
            return { ...t, text: reverseWordChars(t.text) };
          }
          return t;
        });
        processedLine.push(...preamble);

        // Find all indices of Arabic tokens
        const arabicIndices: number[] = [];
        for (let i = firstAraIdx; i < contentTokens.length; i++) {
          if (contentTokens[i].type === 'arabic') {
            arabicIndices.push(i);
          }
        }

        // Loop over successive Arabic anchors
        for (let idx = 0; idx < arabicIndices.length; idx++) {
          const currentAraIdx = arabicIndices[idx];
          const currentAraToken = contentTokens[currentAraIdx];
          
          let processedAraText = currentAraToken.text;
          if (settings.reverseArabicCharacters) {
            processedAraText = reverseWordChars(processedAraText);
          }
          
          const finalAraToken = { ...currentAraToken, text: processedAraText };

          if (idx < arabicIndices.length - 1) {
            const nextAraIdx = arabicIndices[idx + 1];
            // English/punctuation/numbers between currentAraIdx and nextAraIdx
            const betweenTokens = contentTokens.slice(currentAraIdx + 1, nextAraIdx);
            
            // Format the English block between them
            const formattedEnglish = betweenTokens.map(t => {
              if (t.type === 'english' && settings.reverseEnglishWords) {
                return { ...t, text: reverseWordChars(t.text) };
              }
              return t;
            });

            // "right to left : first Arabic word --> the English sentence between them --> second Arabic word"
            // We append: [First Arabic] [English middle]
            processedLine.push(finalAraToken);
            processedLine.push(...formattedEnglish);
          } else {
            // This is the last Arabic word. Add it, and then add any trailing tokens
            processedLine.push(finalAraToken);
            
            const postamble = contentTokens.slice(currentAraIdx + 1).map(t => {
              if (t.type === 'english' && settings.reverseEnglishWords) {
                return { ...t, text: reverseWordChars(t.text) };
              }
              return t;
            });
            if (postamble.length > 0) {
              processedLine.push(...postamble);
            }
          }
        }
      }
    }

    // Now, let's assemble processedLine into token sequence with spacing
    const lineWithSpaces: Token[] = [];
    for (let i = 0; i < processedLine.length; i++) {
      lineWithSpaces.push(processedLine[i]);
      if (i < processedLine.length - 1) {
        lineWithSpaces.push({
          id: `space-${lIdx}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          text: ' ',
          type: 'space'
        });
      }
    }

    rearrangedLineTokens.push(...lineWithSpaces);

    // If it's not the last line, insert a newline
    if (lIdx < lines.length - 1) {
      rearrangedLineTokens.push({
        id: `newline-${lIdx}-${Math.random().toString(36).substring(2, 6)}`,
        text: '\n',
        type: 'space'
      });
    }
  }

  return rearrangedLineTokens;
}

/**
 * Formats an Arabic token block according to correction settings
 */
function formatArabicBlock(tokens: Token[], settings: RearrangeSettings): Token[] {
  let list = [...tokens];

  // 1. Reverse Word Order in the block if requested (PDF extraction frequently reverses word orders in RTL runs)
  if (settings.reverseArabicWords) {
    list.reverse();
  }

  // 2. Reverse Character Order within Arabic words if requested
  return list.map(t => {
    if (t.type === 'arabic') {
      let text = t.text;
      if (settings.reverseArabicCharacters) {
        text = reverseWordChars(text);
      }
      return { ...t, text };
    }
    return t;
  });
}

/**
 * Reconstructs string text from tokens, with optional Unicode BiDi markings
 */
export function tokensToText(tokens: Token[], settings: RearrangeSettings): string {
  // LRM (Left-to-Right Mark): \u200E
  // RLM (Right-to-Left Mark): \u200F
  // LRE (Left-to-Right Embedding): \u202A ... PDF (Pop Directional Formatting): \u202C
  // RLE (Right-to-Left Embedding): \u202B ... PDF: \u202C
  
  let result = '';
  
  for (const token of tokens) {
    if (settings.addBidiMarkers) {
      if (token.type === 'arabic') {
        // Enclose Arabic text block in RTL markers or append RLM
        result += `\u200F${token.text}\u200F`;
      } else if (token.type === 'english') {
        // Enclose English text block in LTR markers or append LRM
        result += `\u200E${token.text}\u200E`;
      } else {
        result += token.text;
      }
    } else {
      result += token.text;
    }
  }
  
  return result;
}

/**
 * Core processing orchestrator for paragraphs, lines and options.
 */
export function processFullText(text: string, settings: RearrangeSettings): ProcessingResult {
  // Split into paragraphs to analyze individually
  const rawParagraphs = text.split(/\n{2,}/);
  const paragraphAnalyses: ParagraphAnalysis[] = [];
  
  let totalRearrangedText = '';

  for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
    const rawParagraph = rawParagraphs[pIdx];
    if (!rawParagraph.trim()) continue;

    // Split paragraph into lines or analyze the whole paragraph
    let linesToProcess: string[] = [];
    if (settings.granularity === 'line') {
      linesToProcess = rawParagraph.split('\n');
    } else {
      linesToProcess = [rawParagraph];
    }

    const lineAnalyses: LineAnalysis[] = [];
    let pRearrangedLines: string[] = [];

    for (let lIdx = 0; lIdx < linesToProcess.length; lIdx++) {
      const rawLine = linesToProcess[lIdx];
      const originalTokens = tokenizeText(rawLine);
      const rearrangedTokens = processTokens(originalTokens, settings);
      const lineRearrangedText = tokensToText(rearrangedTokens, settings);

      lineAnalyses.push({
        id: `line-${pIdx}-${lIdx}`,
        originalText: rawLine,
        rearrangedText: lineRearrangedText,
        tokens: originalTokens,
        rearrangedTokens: rearrangedTokens,
      });

      pRearrangedLines.push(lineRearrangedText);
    }

    const paragraphRearrangedText = pRearrangedLines.join(settings.granularity === 'line' ? '\n' : '\n\n');
    
    paragraphAnalyses.push({
      id: `paragraph-${pIdx}`,
      originalText: rawParagraph,
      rearrangedText: paragraphRearrangedText,
      lines: lineAnalyses,
    });
  }

  totalRearrangedText = paragraphAnalyses.map(p => p.rearrangedText).join('\n\n');

  return {
    originalText: text,
    rearrangedText: totalRearrangedText,
    paragraphs: paragraphAnalyses,
  };
}
