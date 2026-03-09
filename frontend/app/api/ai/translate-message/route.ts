import { NextRequest, NextResponse } from "next/server";
import { fetchWithGroqRotation } from '@/lib/groq';
const SYSTEM_PROMPT = `Tu es un traducteur expert pour Retour Gagnant Bénin.
Ton seul rôle est de traduire du texte, ou de détecter la langue et de traduire.

Règles:
1. Si mode = "detect_and_translate":
    - Tu dois renvoyer UNIQUEMENT un objet JSON avec deux clés : "sourceLanguage" (la langue détectée du message d'origine, par exemple "English", "Español", "Fon", etc.) et "translated" (le message traduit en Français).
    - Exemple: {"sourceLanguage": "English", "translated": "Bonjour"}

2. Si mode = "translate_to":
    - Tu dois renvoyer UNIQUEMENT la traduction du texte dans la langue cible spécifiée, sans aucun JSON, ni guillemets ajoutés.

NE RAJOUTE AUCUN TEXTE, SEULEMENT LE RÉSULTAT DEMANDÉ.`;

export async function POST(request: NextRequest) {
    try {
        const { text, mode, targetLanguage } = await request.json();
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "La clé API Groq n'est pas configurée." },
                { status: 500 }
            );
        }

        let instruction = "";
        if (mode === "detect_and_translate") {
            instruction = `Détecte la langue du texte suivant et traduis-le en Français. Formate ta réponse en JSON exactement comme suit : {"sourceLanguage": "NomDeLaLangue", "translated": "TexteTraduit"} . NE METS RIEN D'AUTRE QUE LE JSON.
            
Texte : ${text}`;
        } else if (mode === "translate_to") {
            if (!targetLanguage) {
                return NextResponse.json({ error: "Langue cible non spécifiée." }, { status: 400 });
            }
            instruction = `Traduis le texte suivant en ${targetLanguage}. Ne renvoie QUE la traduction exacte, sans guillemets, sans commentaires.
            
Texte : ${text}`;
        } else {
            return NextResponse.json({ error: "Mode invalide." }, { status: 400 });
        }

        const response = await fetchWithGroqRotation({
            model: mode === "detect_and_translate" ? "llama-3.1-8b-instant" : "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: instruction },
            ],
            temperature: 0.1, // Low temperature for more deterministic translation
            max_tokens: 1500,
        }, apiKey);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API error:", errorText);
            return NextResponse.json(
                { error: "Erreur technique de traduction." },
                { status: 500 }
            );
        }

        const data = await response.json();
        const output = data.choices?.[0]?.message?.content?.trim() || "";

        if (mode === "detect_and_translate") {
            try {
                // Sometime LLMs wrap json in markdown
                const cleanedOutput = output.replace(/```json/g, "").replace(/```/g, "").trim();
                const json = JSON.parse(cleanedOutput);
                return NextResponse.json(json); // { sourceLanguage: "...", translated: "..." }
            } catch {
                console.error("Failed to parse JSON translation:", output);
                // Fallback if the AI didn't follow JSON format correctly but gave text
                return NextResponse.json({ sourceLanguage: "Inconnue", translated: output });
            }
        } else {
            return NextResponse.json({ translated: output });
        }

    } catch (error) {
        console.error("Translation Message Error:", error);
        return NextResponse.json(
            { error: "Serveur erreur" },
            { status: 500 }
        );
    }
}
