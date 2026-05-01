const DEVANAGARI_RE = /[\u0900-\u097F]/;
const LATIN_WORD_RE = /[A-Za-z]+/g;
const LETTER_RE = /[a-z]/;

const independentVowels = {
  a: "अ",
  aa: "आ",
  i: "इ",
  ee: "ई",
  ii: "ई",
  u: "उ",
  oo: "ऊ",
  uu: "ऊ",
  e: "ए",
  ai: "ऐ",
  o: "ओ",
  au: "औ",
  ri: "ऋ"
};

const vowelSigns = {
  a: "",
  aa: "ा",
  i: "ि",
  ee: "ी",
  ii: "ी",
  u: "ु",
  oo: "ू",
  uu: "ू",
  e: "े",
  ai: "ै",
  o: "ो",
  au: "ौ",
  ri: "ृ"
};

const consonants = [
  ["ksh", "क्ष"],
  ["gy", "ज्ञ"],
  ["gn", "ज्ञ"],
  ["chh", "छ"],
  ["kh", "ख"],
  ["gh", "घ"],
  ["jh", "झ"],
  ["th", "थ"],
  ["dh", "ध"],
  ["ph", "फ"],
  ["bh", "भ"],
  ["sh", "श"],
  ["ch", "च"],
  ["q", "क"],
  ["k", "क"],
  ["g", "ग"],
  ["c", "क"],
  ["j", "ज"],
  ["z", "ज"],
  ["t", "त"],
  ["d", "द"],
  ["n", "न"],
  ["p", "प"],
  ["f", "फ"],
  ["b", "ब"],
  ["m", "म"],
  ["y", "य"],
  ["r", "र"],
  ["l", "ल"],
  ["v", "व"],
  ["w", "व"],
  ["s", "स"],
  ["h", "ह"]
];

const vowelTokens = ["ai", "au", "aa", "ee", "ii", "oo", "uu", "ri", "a", "e", "i", "o", "u"];

const acronymLetters = {
  A: "ए",
  B: "बी",
  C: "सी",
  D: "डी",
  E: "ई",
  F: "एफ",
  G: "जी",
  H: "एच",
  I: "आई",
  J: "जे",
  K: "के",
  L: "एल",
  M: "एम",
  N: "एन",
  O: "ओ",
  P: "पी",
  Q: "क्यू",
  R: "आर",
  S: "एस",
  T: "टी",
  U: "यू",
  V: "वी",
  W: "डब्ल्यू",
  X: "एक्स",
  Y: "वाई",
  Z: "जेड"
};

const commonNameOverrides = {
  ajay: "अजय",
  amit: "अमित",
  anil: "अनिल",
  ankit: "अंकित",
  deepak: "दीपक",
  dinesh: "दिनेश",
  ganesh: "गणेश",
  geeta: "गीता",
  gita: "गीता",
  gupta: "गुप्ता",
  kavita: "कविता",
  kumar: "कुमार",
  mahendra: "महेंद्र",
  mahesh: "महेश",
  manoj: "मनोज",
  meena: "मीना",
  mina: "मीना",
  mukesh: "मुकेश",
  narendra: "नरेंद्र",
  neha: "नेहा",
  pankaj: "पंकज",
  patel: "पटेल",
  pooja: "पूजा",
  pradeep: "प्रदीप",
  priya: "प्रिया",
  puja: "पूजा",
  rahul: "राहुल",
  raj: "राज",
  rakesh: "राकेश",
  ram: "राम",
  ramesh: "रमेश",
  rani: "रानी",
  rekha: "रेखा",
  rohit: "रोहित",
  sandeep: "संदीप",
  sanjay: "संजय",
  savita: "सविता",
  seema: "सीमा",
  sharma: "शर्मा",
  singh: "सिंह",
  sita: "सीता",
  sumit: "सुमित",
  sunil: "सुनील",
  suresh: "सुरेश",
  verma: "वर्मा",
  vijay: "विजय",
  yadav: "यादव"
};

const devanagariToLatin = {
  अ: "a",
  आ: "aa",
  इ: "i",
  ई: "i",
  उ: "u",
  ऊ: "u",
  ऋ: "ri",
  ए: "e",
  ऐ: "ai",
  ओ: "o",
  औ: "au",
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  च: "ch",
  छ: "chh",
  ज: "j",
  झ: "jh",
  ट: "t",
  ठ: "th",
  ड: "d",
  ढ: "dh",
  ण: "n",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "ph",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  व: "v",
  श: "sh",
  ष: "sh",
  स: "s",
  ह: "h",
  ळ: "l"
};

const matraToLatin = {
  "ा": "a",
  "ि": "i",
  "ी": "i",
  "ु": "u",
  "ू": "u",
  "ृ": "ri",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au"
};

const clean = (value) => String(value || "").trim();
const isHindiLanguage = (language) => String(language || "").toLowerCase().startsWith("hi");
const hasDevanagariText = (value) => DEVANAGARI_RE.test(String(value || ""));

const matchToken = (value, index, tokens) => tokens.find((token) => value.startsWith(token, index));
const matchConsonant = (value, index) => consonants.find(([token]) => value.startsWith(token, index));

const nextIsLatinConsonant = (value, index) => {
  if (!LETTER_RE.test(value[index] || "")) return false;
  return !matchToken(value, index, vowelTokens);
};

const shouldUseLongA = (value, indexAfterA) => {
  const next = value[indexAfterA] || "";
  return indexAfterA >= value.length || (next === "r" && indexAfterA === value.length - 1);
};

const transliterateWord = (word) => {
  if (DEVANAGARI_RE.test(word)) return word;
  if (/^[A-Z]{2,4}$/.test(word)) return word.split("").map((letter) => acronymLetters[letter] || letter).join("");

  const lower = word.toLowerCase();
  if (commonNameOverrides[lower]) return commonNameOverrides[lower];

  let output = "";
  let index = 0;

  while (index < lower.length) {
    const vowel = matchToken(lower, index, vowelTokens);
    if (vowel) {
      output += independentVowels[vowel];
      index += vowel.length;
      continue;
    }

    const consonant = matchConsonant(lower, index);
    if (!consonant) {
      output += word[index] || "";
      index += 1;
      continue;
    }

    const [consonantToken, consonantLetter] = consonant;
    const afterConsonant = index + consonantToken.length;
    const nextVowel = matchToken(lower, afterConsonant, vowelTokens);

    if ((consonantToken === "n" || consonantToken === "m") && nextIsLatinConsonant(lower, afterConsonant)) {
      output += "ं";
      index = afterConsonant;
      continue;
    }

    if (nextVowel) {
      const sign = nextVowel === "a" && shouldUseLongA(lower, afterConsonant + 1) ? "ा" : vowelSigns[nextVowel];
      output += consonantLetter + sign;
      index = afterConsonant + nextVowel.length;
      continue;
    }

    output += consonantLetter;
    if (nextIsLatinConsonant(lower, afterConsonant)) {
      output += "्";
    }
    index = afterConsonant;
  }

  return output;
};

const transliterateToHindi = (value) => {
  const text = clean(value);
  if (!text) return "";
  return text.replace(LATIN_WORD_RE, (word) => transliterateWord(word));
};

const transliterateHindiToLatin = (value) => {
  const text = clean(value);
  if (!text) return "";

  let output = "";

  for (const char of text.normalize("NFC")) {
    if (devanagariToLatin[char]) {
      output += devanagariToLatin[char];
    } else if (matraToLatin[char]) {
      output += matraToLatin[char];
    } else if (char === "ं" || char === "ँ") {
      output += "n";
    } else if (char === "ः" || char === "्" || char === "़") {
      output += "";
    } else {
      output += char;
    }
  }

  return output.replace(/\s+/g, " ").trim();
};

const getDisplayCustomerName = (customer, language) => {
  if (!customer) return "-";

  const name = clean(customer.name);
  const nameHindi = clean(customer.nameHindi);

  if (isHindiLanguage(language)) {
    return nameHindi || transliterateToHindi(name) || name || "-";
  }

  return name || nameHindi || "-";
};

const buildHindiSearchTerms = (search) => {
  const term = clean(search);
  if (!term) return [];

  const terms = new Set([term]);

  if (hasDevanagariText(term)) {
    terms.add(transliterateHindiToLatin(term));
  } else {
    terms.add(transliterateToHindi(term));
  }

  return Array.from(terms).filter(Boolean);
};

module.exports = {
  buildHindiSearchTerms,
  getDisplayCustomerName,
  hasDevanagariText,
  isHindiLanguage,
  transliterateHindiToLatin,
  transliterateToHindi
};

