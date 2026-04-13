import React from 'react'
import { Text, type TextProps } from 'react-native'
import { useLang } from '../contexts/LangContext'

/**
 * Composant <T> — Traduction inline pour React Native
 * Usage identique au site web :
 *   <T>Texte en français</T>
 *   <T style={{ fontWeight: 'bold' }}>Texte gras traduit</T>
 * 
 * Le texte est automatiquement traduit via l'API Groq
 * si la langue active n'est pas le français.
 */
export function T({ children, style, ...props }: TextProps & { children: string }) {
    const { t } = useLang()

    if (typeof children !== 'string') {
        return <Text style={style} {...props}>{children}</Text>
    }

    return <Text style={style} {...props}>{t(children)}</Text>
}

export default T
