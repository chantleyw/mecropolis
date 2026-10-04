// Every language the picker offers: BCP 47 code and English name. The English name goes to the
// translation script's instruction; the picker shows each language's own name from Intl when the
// browser knows it. South Africa's official languages come first after English.
export const LANGUAGES: readonly (readonly [code: string, english: string])[] = [
  ["en", "English"],
  ["af", "Afrikaans"],
  ["xh", "isiXhosa"],
  ["zu", "isiZulu"],
  ["nso", "Sepedi"],
  ["st", "Sesotho"],
  ["tn", "Setswana"],
  ["ts", "Xitsonga"],
  ["ss", "siSwati"],
  ["ve", "Tshivenda"],
  ["nr", "isiNdebele"],
  ["ak", "Akan"],
  ["sq", "Albanian"],
  ["am", "Amharic"],
  ["ar", "Arabic"],
  ["hy", "Armenian"],
  ["as", "Assamese"],
  ["ay", "Aymara"],
  ["az", "Azerbaijani"],
  ["bm", "Bambara"],
  ["eu", "Basque"],
  ["be", "Belarusian"],
  ["bn", "Bengali"],
  ["bs", "Bosnian"],
  ["bg", "Bulgarian"],
  ["my", "Burmese"],
  ["ca", "Catalan"],
  ["ceb", "Cebuano"],
  ["ny", "Chichewa"],
  ["zh-CN", "Chinese (Simplified)"],
  ["zh-TW", "Chinese (Traditional)"],
  ["co", "Corsican"],
  ["hr", "Croatian"],
  ["cs", "Czech"],
  ["da", "Danish"],
  ["nl", "Dutch"],
  ["eo", "Esperanto"],
  ["et", "Estonian"],
  ["ee", "Ewe"],
  ["fil", "Filipino"],
  ["fi", "Finnish"],
  ["fr", "French"],
  ["fy", "Frisian"],
  ["ff", "Fula"],
  ["gl", "Galician"],
  ["lg", "Ganda"],
  ["ka", "Georgian"],
  ["de", "German"],
  ["el", "Greek"],
  ["gn", "Guarani"],
  ["gu", "Gujarati"],
  ["ht", "Haitian Creole"],
  ["ha", "Hausa"],
  ["haw", "Hawaiian"],
  ["he", "Hebrew"],
  ["hi", "Hindi"],
  ["hmn", "Hmong"],
  ["hu", "Hungarian"],
  ["is", "Icelandic"],
  ["ig", "Igbo"],
  ["id", "Indonesian"],
  ["ga", "Irish"],
  ["it", "Italian"],
  ["ja", "Japanese"],
  ["jv", "Javanese"],
  ["kn", "Kannada"],
  ["kk", "Kazakh"],
  ["km", "Khmer"],
  ["rw", "Kinyarwanda"],
  ["ko", "Korean"],
  ["kri", "Krio"],
  ["ku", "Kurdish"],
  ["ky", "Kyrgyz"],
  ["lo", "Lao"],
  ["la", "Latin"],
  ["lv", "Latvian"],
  ["ln", "Lingala"],
  ["lt", "Lithuanian"],
  ["lb", "Luxembourgish"],
  ["mk", "Macedonian"],
  ["mg", "Malagasy"],
  ["ms", "Malay"],
  ["ml", "Malayalam"],
  ["mt", "Maltese"],
  ["mi", "Maori"],
  ["mr", "Marathi"],
  ["mn", "Mongolian"],
  ["ne", "Nepali"],
  ["nb", "Norwegian"],
  ["or", "Odia"],
  ["om", "Oromo"],
  ["ps", "Pashto"],
  ["fa", "Persian"],
  ["pl", "Polish"],
  ["pt", "Portuguese"],
  ["pa", "Punjabi"],
  ["qu", "Quechua"],
  ["ro", "Romanian"],
  ["ru", "Russian"],
  ["sm", "Samoan"],
  ["gd", "Scottish Gaelic"],
  ["sr", "Serbian"],
  ["sn", "Shona"],
  ["sd", "Sindhi"],
  ["si", "Sinhala"],
  ["sk", "Slovak"],
  ["sl", "Slovenian"],
  ["so", "Somali"],
  ["es", "Spanish"],
  ["su", "Sundanese"],
  ["sw", "Swahili"],
  ["sv", "Swedish"],
  ["tg", "Tajik"],
  ["ta", "Tamil"],
  ["tt", "Tatar"],
  ["te", "Telugu"],
  ["th", "Thai"],
  ["ti", "Tigrinya"],
  ["tr", "Turkish"],
  ["tk", "Turkmen"],
  ["uk", "Ukrainian"],
  ["ur", "Urdu"],
  ["ug", "Uyghur"],
  ["uz", "Uzbek"],
  ["vi", "Vietnamese"],
  ["cy", "Welsh"],
  ["wo", "Wolof"],
  ["yi", "Yiddish"],
  ["yo", "Yoruba"],
]

const RTL = new Set(["ar", "he", "fa", "ur", "ps", "sd", "yi", "ug"])

export function isRtl(code: string): boolean {
  return RTL.has(code)
}

export function isLanguage(code: string): boolean {
  return LANGUAGES.some(([c]) => c === code)
}

/** The language's name in that language, or its English name when the browser does not know it. */
export function nativeName(code: string, english: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code)
    return name && name !== code ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : english
  } catch {
    // Intl rejects a code it cannot parse; the English name still identifies the language.
    return english
  }
}

/** The best listed match for the browser's languages, or English. */
export function browserLanguage(preferred: readonly string[]): string {
  for (const tag of preferred) {
    if (isLanguage(tag)) return tag
    const base = tag.split("-")[0] ?? ""
    if (base === "zh") return /TW|HK|MO|Hant/i.test(tag) ? "zh-TW" : "zh-CN"
    if (base === "no" || base === "nn") return "nb"
    if (base === "tl") return "fil"
    if (isLanguage(base)) return base
  }
  return "en"
}
