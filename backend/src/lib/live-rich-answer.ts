/** Keep old plain answers readable while counting words in rich answer documents. */
export const LIVE_RICH_ANSWER_PREFIX='@@LIVE_RICH_V1@@';

export function liveAnswerPlainText(value:string) {
  if(!value.startsWith(LIVE_RICH_ANSWER_PREFIX))return value;
  return value.slice(LIVE_RICH_ANSWER_PREFIX.length)
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<\/(?:p|div|li|ol|ul|pre|blockquote)>/gi,'\n')
    .replace(/<[^>]*>/g,'')
    .replace(/&(?:nbsp|#160);/gi,' ')
    .replace(/&(?:lt|#60);/gi,'<')
    .replace(/&(?:gt|#62);/gi,'>')
    .replace(/&(?:quot|#34);/gi,'"')
    .replace(/&(?:apos|#39);/gi,"'")
    .replace(/&amp;/gi,'&')
    .trim();
}

export function liveAnswerWordCount(value:string) {
  const plain=liveAnswerPlainText(value).trim();
  return plain?plain.split(/\s+/).length:0;
}
