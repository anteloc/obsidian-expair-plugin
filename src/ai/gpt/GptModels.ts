// TODO Add other supported models
// Models set in order of preference due to its accuracy, performance, etc.
export const OPENAI_MODELS = [
    {
        name: "GPT-4o Mini",
        model: "gpt-4o-mini",
    },
    {
        name: "GPT-4 Turbo",
        model: "gpt-4-turbo",
    },
];

export const DEFAULT_SYSTEM_PROMPT = `You are an specialist in quick-note taking, using word abbreviations`;

export const DEFAULT_EXPAND_TEXT_PROMPT = `Translate the following text to it's non-abbreviated form`;

// Abbreviation text for: I'm a specialist in quick-note taking, using word abbreviations
// is: I'm a spec in q-n taking, using w abbrevs
export const DEFAULT_ABBREV_TEXT = `I'm a spec in q-n taking, using w abbrevs`;
export const DEFAULT_EXPANDED_TEXT = `I'm a specialist in quick-note taking, using word abbreviations`;
export const DEFAULT_LANG = "English";

export const DEFAULT_GPT_MODEL = OPENAI_MODELS[0];
export const DEFAULT_MAX_WORDS = 500;

export const SUPPORTED_LANGS = ["Afrikaans","Albanian","Amharic","Arabic","Armenian","Aymara","Azerbaijani","Belarusian","Bengali","Berber","Bislama","Bosnian","Bulgarian","Burmese","Catalan","Chichewa","Comorian","Croatian","Czech","Danish","Dari","Dhivehi","Dutch","Dzongkha","English","Estonian","Fijian","Filipino","Finnish","French","Georgian","German","Greek","Guarani","Haitian Creole","Hebrew","Hindi","Hiri Motu","Hungarian","Icelandic","Indonesian","Irish","Italian","Japanese","Kazakh","Khmer","Kinyarwanda","Kirundi","Korean","Kurdish","Kyrgyz","Lao","Latvian","Lithuanian","Luxembourgish","Malagasy","Malay","Maltese","Mandarin","Marshallese","Mongolian","Montenegrin","Māori","Nauruan","Ndebele","Nepali","Norwegian","Palauan","Pashto","Persian","Polish","Portuguese","Quechua","Romanian","Romansh","Russian","Samoan","Sango","Serbian","Sesotho","Seychellois Creole","Shona","Sinhala","Slovak","Slovene","Somali","Sotho","Spanish","Swahili","Swati","Swedish","Tajik","Tamazight","Tamil","Tetum","Thai","Tigrinya","Tok Pisin","Tongan","Tsonga","Tswana","Turkish","Turkmen","Tuvaluan","Ukrainian","Urdu","Uzbek","Venda","Vietnamese","Xhosa","Zulu"];

