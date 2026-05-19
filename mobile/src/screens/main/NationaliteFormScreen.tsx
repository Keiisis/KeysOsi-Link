import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Switch
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
} from 'react-native-reanimated';
import { ArrowLeft, Check, ChevronRight, UploadCloud, FileText, X, Sparkles, Feather, Scale, Fingerprint, ShieldCheck } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
// expo-file-system : on utilise l'API legacy pour readAsStringAsync + EncodingType
// (la nouvelle API class-based File n'a pas encore d'équivalent simple sur React Native)
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LangContext';
import { supabase } from '../../config/supabase';
import { fetchWithTimeout } from '../../lib/fetch';
import KkiapayModal from '../../components/KkiapayModal';
import { LinearGradient } from 'expo-linear-gradient';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj';

// DA VINCI RENAISSANCE PALETTE (NO BLACK)
const davinci = {
    parchment: '#FAF4E8',
    antiqueWhite: '#FDFCF8',
    sepiaInk: '#2C1E16',
    sienna: '#A0522D',
    gold: '#D4AF37',
    deepEmerald: '#0B3B24',
    softGold: '#E6C975',
    shadowWood: '#5C4033',
    terracotta: '#D16643'
};

// Document slots — alignés sur le formulaire web
const DEFAULT_DOC_SLOTS = [
    { key: 'identite', label: "Pièce d'identité en cours de validité", required: true, multi: false },
    { key: 'domicile', label: "Justificatif de domicile", required: true, multi: false },
    { key: 'profession', label: "Preuve de profession", required: true, multi: false },
    { key: 'afro_descendance', label: "Preuve d'afro descendance (ADN, archives, généalogie…)", required: true, multi: true },
    { key: 'casier', label: "Casier judiciaire", required: true, multi: false },
    { key: 'photo', label: "Photo d'identité récente", required: true, multi: false },
    { key: 'naissance_pere', label: "Extrait de naissance du père", required: false, multi: false, ancestral: true },
    { key: 'naissance_mere', label: "Extrait de naissance de la mère", required: false, multi: false, ancestral: true },
    { key: 'livret_parents', label: "Livret de famille des parents", required: false, multi: false },
    { key: 'agp_paternel', label: "Acte de naissance — AG paternel", required: false, multi: false, ancestral: true },
    { key: 'agm_paternelle', label: "Acte de naissance — AGM paternelle", required: false, multi: false, ancestral: true },
    { key: 'agp_maternel', label: "Acte de naissance — AG maternel", required: false, multi: false, ancestral: true },
    { key: 'agm_maternelle', label: "Acte de naissance — AGM maternelle", required: false, multi: false, ancestral: true },
    { key: 'autres', label: "Autres documents", required: false, multi: true },
];

const FadeInView = ({ children, delay = 0, style }: any) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
        translateY.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 80 }));
    }, [delay, opacity, translateY]);

    const animStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
};

export default function NationaliteFormScreen({ navigation }: any) {
    const { profile } = useAuth();
    const { t } = useLang();

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showKkiapay, setShowKkiapay] = useState(false);
    const [savedRef, setSavedRef] = useState<string | null>(null);

    const [lawAccepted, setLawAccepted] = useState(false);
    const [formAmount, setFormAmount] = useState(150000);
    const [formCurrency, setFormCurrency] = useState('XOF');

    // ── Charger settings depuis page_sections ──
    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('page_sections')
                .select('content')
                .eq('page', 'nationalite')
                .eq('section_key', 'form_settings')
                .single();
            if (data?.content) {
                const c = data.content as Record<string, unknown>;
                if (c.amount) setFormAmount(Number(c.amount));
                if (c.currency) setFormCurrency(String(c.currency));
            }
        };
        fetchSettings();
    }, []);

    // ── Form data — schéma complet aligné sur le web /api/nationality ──
    const [formData, setFormData] = useState({
        // Loi
        knows_about_law: false,
        // Afro-descendance
        is_afro_descendant: true,
        afro_descendant_description: '',
        // Ancêtre 1 (requis)
        ancestor1_nom: '', ancestor1_prenom: '', ancestor1_date_naissance: '',
        ancestor1_lien_parente: '', ancestor1_vivant: true, ancestor1_nationalite: '',
        ancestor1_pays_residence: '', ancestor1_autres_infos: '',
        // Ancêtre 2 (optionnel)
        ancestor2_nom: '', ancestor2_prenom: '', ancestor2_date_naissance: '',
        ancestor2_lien_parente: '', ancestor2_vivant: true, ancestor2_nationalite: '',
        ancestor2_pays_residence: '', ancestor2_autres_infos: '',
        // Identité — pré-remplie depuis profile (champs corrects: nom/prenom)
        nom: profile?.nom || '',
        prenom: profile?.prenom || '',
        genre: '',
        date_naissance: '',
        pays_naissance: '',
        ville_naissance: '',
        nationalite: '',
        pays_residence: profile?.pays || '',
        adresse_residence: '',
        telephone: profile?.phone || '',
        email: profile?.email || '',
        profession: '',
        demande_depuis_benin: false,
        situation_matrimoniale: '',
        nombre_enfants: 0,
        // Document identité
        type_document_identite: '',
        numero_document: '',
        date_expiration_document: '',
        pays_delivrance: '',
        lieu_delivrance: '',
        autorite_delivrance: '',
        // Parents
        pere_nom: '', pere_prenom: '', pere_date_naissance: '',
        mere_nom: '', mere_prenom: '', mere_date_naissance: '',
        // Motivation + RGPD
        motivation_lettre: '',
        consentement_rgpd: false,
    });

    const [rawDocs, setRawDocs] = useState<{ key: string; file: any; name: string }[]>([]);

    const updateField = (field: keyof typeof formData, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

    const handleFilePick = async (slotKey: string, multi: boolean) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: multi });
            if (!result.canceled && result.assets) {
                const newDocs = result.assets.map(asset => ({ key: slotKey, file: asset, name: asset.name }));
                setRawDocs(prev => {
                    const filtered = multi ? prev : prev.filter(d => d.key !== slotKey);
                    return [...filtered, ...newDocs];
                });
            }
        } catch {
            Alert.alert(t('Erreur'), t('Impossible de sélectionner le fichier.'));
        }
    };

    const removeFile = (index: number) => setRawDocs(prev => prev.filter((_, i) => i !== index));

    const validateStep = () => {
        switch (currentStep) {
            case 0:
                if (!lawAccepted) {
                    Alert.alert(t('Attention'), t("L'accord de la Loi N° 2024-31 est requis."));
                    return false;
                }
                break;
            case 1:
                if (!formData.afro_descendant_description.trim() || !formData.ancestor1_nom.trim() || !formData.ancestor1_lien_parente.trim()) {
                    Alert.alert(t('Attention'), t('Veuillez décrire votre ascendance et remplir les infos de votre ancêtre.'));
                    return false;
                }
                break;
            case 2:
                if (!formData.nom.trim() || !formData.prenom.trim() || !formData.email.trim() ||
                    !formData.genre || !formData.date_naissance || !formData.pays_residence.trim() ||
                    !formData.nationalite.trim()) {
                    Alert.alert(t('Attention'), t('Champs personnels incomplets.'));
                    return false;
                }
                break;
            case 3:
                if (!formData.type_document_identite.trim() || !formData.consentement_rgpd) {
                    Alert.alert(t('Attention'), t('Type de document et consentement RGPD requis.'));
                    return false;
                }
                break;
            case 4: {
                const uploadedKeys = rawDocs.map(d => d.key);
                const strictRequired = DEFAULT_DOC_SLOTS.filter(s => s.required);
                for (const slot of strictRequired) {
                    if (!uploadedKeys.includes(slot.key)) {
                        Alert.alert(t('Attention'), t('Le document "{label}" est manquant.', { label: slot.label }));
                        return false;
                    }
                }
                break;
            }
        }
        return true;
    };

    const nextStep = () => {
        if (!validateStep()) return;
        if (currentStep === 5) setShowKkiapay(true);
        else setCurrentStep(prev => prev + 1);
    };
    const prevStep = () => setCurrentStep(prev => Math.max(0, prev - 1));

    /* ── Soumission finale après paiement Kkiapay ──
       Flow :
       1. Upload des documents dans Storage `nationality_documents`
       2. POST /api/nationality avec tous les champs + payment_ref
          → le serveur vérifie Kkiapay, insère dans nationality_applications,
            crée le tracking (dossier_tracking + 7 étapes Nexus), envoie l'email
            de confirmation IA, et retourne la référence officielle.
    */
    const handlePaymentSuccess = async (transactionId: string) => {
        setShowKkiapay(false);
        setLoading(true);

        try {
            // 1. Upload documents
            const uploadedUrls: string[] = [];
            const folder = `nat-${Date.now()}`;
            for (let i = 0; i < rawDocs.length; i++) {
                const doc = rawDocs[i];
                try {
                    const base64 = await FileSystem.readAsStringAsync(doc.file.uri, { encoding: FileSystem.EncodingType.Base64 });
                    const ext = doc.name.split('.').pop() || 'bin';
                    const filename = `${folder}/${doc.key}_${i}.${ext}`;
                    const { data, error } = await supabase.storage
                        .from('nationality_documents')
                        .upload(filename, decode(base64), {
                            contentType: doc.file.mimeType || 'application/octet-stream',
                            upsert: false,
                        });
                    if (data && !error) {
                        uploadedUrls.push(`${doc.key}: ${filename}`);
                    } else {
                        uploadedUrls.push(`${doc.key}: ${doc.name} (upload échoué)`);
                    }
                } catch (e) {
                    console.warn('[Nationalité] Upload échoué pour', doc.name, e);
                    uploadedUrls.push(`${doc.key}: ${doc.name} (erreur lecture)`);
                }
            }

            // 2. Soumission via /api/nationality (même endpoint que le web)
            //    → vérification Kkiapay serveur + insertion + email + tracking
            const cleanedForm: Record<string, unknown> = { ...formData };
            const dateFields = [
                'date_naissance', 'ancestor1_date_naissance', 'ancestor2_date_naissance',
                'pere_date_naissance', 'mere_date_naissance', 'date_expiration_document',
            ];
            dateFields.forEach(key => {
                if (!cleanedForm[key]) cleanedForm[key] = null;
            });

            const res = await fetchWithTimeout(`${API_BASE}/api/nationality`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 30000,
                body: JSON.stringify({
                    ...cleanedForm,
                    documents: uploadedUrls,
                    documents_uploaded: uploadedUrls,
                    payment_method: 'kkiapay',
                    payment_ref: transactionId,
                    payment_status: 'payé',
                    amount: formAmount,
                    currency: formCurrency,
                    last_step_completed: 6,
                    source: 'mobile',
                }),
            });

            const result = await res.json().catch(() => ({}));

            if (!res.ok || !result.success) {
                throw new Error(result.error || `Erreur serveur (${res.status})`);
            }

            setSavedRef(result.reference || null);
            setCurrentStep(6);
        } catch (e: any) {
            console.error('[Nationalité] Submit failed:', e);
            Alert.alert(
                t('Erreur enregistrement'),
                t('Le paiement a été reçu (réf : {tx}) mais la soumission du dossier a échoué : {err}. Contactez le support.', {
                    tx: transactionId,
                    err: e?.message || 'inconnue',
                })
            );
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <FadeInView delay={0} style={styles.card3D}>
                        <View style={styles.iconBadge}><Scale color={davinci.gold} size={32} /></View>
                        <Text style={styles.titleSerif}>{t('Loi N° 2024-31')}</Text>
                        <Text style={styles.descText}>{t('Portant reconnaissance de la nationalité béninoise aux afro-descendants.')}</Text>

                        <View style={styles.parchmentBox}>
                            <Text style={styles.parchmentText}>
                                {t('"La reconnaissance est un acte de mémoire et de justice pour les descendants des Africains déportés lors de la traite négrière."')}
                            </Text>
                        </View>

                        <FadeInView delay={200} style={[styles.switchCard, { marginTop: 30 }]}>
                            <Text style={styles.switchLabel}>{t("Je reconnais avoir lu et compris l'esprit de cette loi.")}</Text>
                            <Switch
                                value={lawAccepted}
                                onValueChange={(v) => { setLawAccepted(v); updateField('knows_about_law', v); }}
                                trackColor={{ false: '#E2D9C8', true: davinci.gold }}
                                thumbColor={davinci.antiqueWhite}
                            />
                        </FadeInView>
                    </FadeInView>
                );
            case 1:
                return (
                    <FadeInView delay={0} style={styles.card3D}>
                        <View style={styles.iconBadge}><Fingerprint color={davinci.gold} size={32} /></View>
                        <Text style={styles.titleSerif}>{t("L'Héritage")}</Text>
                        <Text style={styles.descText}>{t('Renseignez vos racines et vos ancêtres.')}</Text>

                        <FadeInView delay={100}>
                            <Input
                                label={t("Comment êtes-vous afro-descendant(e) ? *")}
                                value={formData.afro_descendant_description}
                                onChangeText={(v: string) => updateField('afro_descendant_description', v)}
                                multiline textArea
                            />
                        </FadeInView>

                        {[1, 2].map((n, i) => (
                            <FadeInView delay={200 + i * 150} key={n} style={styles.ancestorCard}>
                                <Text style={styles.subTitleSerif}>
                                    {n === 1 ? t('1er Ancêtre (Requis)') : t('2ème Ancêtre (Optionnel)')}
                                </Text>
                                <Input label={t('Nom *')} value={(formData as any)[`ancestor${n}_nom`]} onChangeText={(v: string) => updateField(`ancestor${n}_nom` as any, v)} />
                                <Input label={t('Prénom')} value={(formData as any)[`ancestor${n}_prenom`]} onChangeText={(v: string) => updateField(`ancestor${n}_prenom` as any, v)} />
                                <Input label={t('Date de naissance')} value={(formData as any)[`ancestor${n}_date_naissance`]} onChangeText={(v: string) => updateField(`ancestor${n}_date_naissance` as any, v)} placeholder="JJ/MM/AAAA" />
                                <Input label={t('Lien de parenté *')} value={(formData as any)[`ancestor${n}_lien_parente`]} onChangeText={(v: string) => updateField(`ancestor${n}_lien_parente` as any, v)} placeholder={t('Ex: Grand-père')} />
                                <Input label={t('Nationalité')} value={(formData as any)[`ancestor${n}_nationalite`]} onChangeText={(v: string) => updateField(`ancestor${n}_nationalite` as any, v)} />
                                <Input label={t('Pays de résidence')} value={(formData as any)[`ancestor${n}_pays_residence`]} onChangeText={(v: string) => updateField(`ancestor${n}_pays_residence` as any, v)} />
                                <Input label={t('Autres informations')} value={(formData as any)[`ancestor${n}_autres_infos`]} onChangeText={(v: string) => updateField(`ancestor${n}_autres_infos` as any, v)} multiline textArea />
                                <View style={styles.switchCard}>
                                    <Text style={styles.switchLabel}>{t('Toujours vivant(e) ?')}</Text>
                                    <Switch value={(formData as any)[`ancestor${n}_vivant`]} onValueChange={(v: boolean) => updateField(`ancestor${n}_vivant` as any, v)} trackColor={{ true: davinci.gold }} />
                                </View>
                            </FadeInView>
                        ))}
                    </FadeInView>
                );
            case 2:
                return (
                    <FadeInView delay={0} style={styles.card3D}>
                        <Text style={styles.titleSerif}>{t("L'Identité")}</Text>
                        <FadeInView delay={100}><Input label={t('Nom *')} value={formData.nom} onChangeText={(v: string) => updateField('nom', v)} /></FadeInView>
                        <FadeInView delay={130}><Input label={t('Prénom *')} value={formData.prenom} onChangeText={(v: string) => updateField('prenom', v)} /></FadeInView>
                        <FadeInView delay={160}><Input label={t('Email *')} value={formData.email} onChangeText={(v: string) => updateField('email', v)} keyboardType="email-address" /></FadeInView>
                        <FadeInView delay={190}><Input label={t('Genre *')} value={formData.genre} onChangeText={(v: string) => updateField('genre', v)} placeholder={t('Masculin, Féminin…')} /></FadeInView>
                        <FadeInView delay={220}><Input label={t('Date de naissance *')} value={formData.date_naissance} onChangeText={(v: string) => updateField('date_naissance', v)} placeholder="JJ/MM/AAAA" /></FadeInView>
                        <FadeInView delay={250}><Input label={t('Pays de naissance')} value={formData.pays_naissance} onChangeText={(v: string) => updateField('pays_naissance', v)} /></FadeInView>
                        <FadeInView delay={280}><Input label={t('Ville de naissance')} value={formData.ville_naissance} onChangeText={(v: string) => updateField('ville_naissance', v)} /></FadeInView>
                        <FadeInView delay={310}><Input label={t('Nationalité actuelle *')} value={formData.nationalite} onChangeText={(v: string) => updateField('nationalite', v)} /></FadeInView>
                        <FadeInView delay={340}><Input label={t('Pays de résidence *')} value={formData.pays_residence} onChangeText={(v: string) => updateField('pays_residence', v)} /></FadeInView>
                        <FadeInView delay={370}><Input label={t('Adresse de résidence')} value={formData.adresse_residence} onChangeText={(v: string) => updateField('adresse_residence', v)} multiline textArea /></FadeInView>
                        <FadeInView delay={400}><Input label={t('Téléphone')} value={formData.telephone} onChangeText={(v: string) => updateField('telephone', v)} keyboardType="phone-pad" /></FadeInView>
                        <FadeInView delay={430}><Input label={t('Profession')} value={formData.profession} onChangeText={(v: string) => updateField('profession', v)} /></FadeInView>
                        <FadeInView delay={460}><Input label={t('Situation matrimoniale')} value={formData.situation_matrimoniale} onChangeText={(v: string) => updateField('situation_matrimoniale', v)} placeholder={t('Célibataire, Marié(e)…')} /></FadeInView>
                        <FadeInView delay={490}><Input label={t("Nombre d'enfants")} value={String(formData.nombre_enfants)} onChangeText={(v: string) => updateField('nombre_enfants', parseInt(v, 10) || 0)} keyboardType="phone-pad" /></FadeInView>

                        <FadeInView delay={520} style={[styles.switchCard, { marginTop: 8 }]}>
                            <Text style={styles.switchLabel}>{t('Demande depuis le Bénin ?')}</Text>
                            <Switch value={formData.demande_depuis_benin} onValueChange={(v) => updateField('demande_depuis_benin', v)} trackColor={{ true: davinci.gold }} />
                        </FadeInView>
                    </FadeInView>
                );
            case 3:
                return (
                    <FadeInView delay={0} style={styles.card3D}>
                        <Text style={styles.titleSerif}>{t('Le Lien')}</Text>
                        <Text style={styles.descText}>{t("Document d'identité et parents.")}</Text>

                        <FadeInView delay={100}><Input label={t("Type de document d'identité *")} value={formData.type_document_identite} onChangeText={(v: string) => updateField('type_document_identite', v)} placeholder={t('Passeport, CNI…')} /></FadeInView>
                        <FadeInView delay={130}><Input label={t('Numéro du document')} value={formData.numero_document} onChangeText={(v: string) => updateField('numero_document', v)} /></FadeInView>
                        <FadeInView delay={160}><Input label={t("Date d'expiration")} value={formData.date_expiration_document} onChangeText={(v: string) => updateField('date_expiration_document', v)} placeholder="JJ/MM/AAAA" /></FadeInView>
                        <FadeInView delay={190}><Input label={t('Pays de délivrance')} value={formData.pays_delivrance} onChangeText={(v: string) => updateField('pays_delivrance', v)} /></FadeInView>
                        <FadeInView delay={220}><Input label={t('Lieu de délivrance')} value={formData.lieu_delivrance} onChangeText={(v: string) => updateField('lieu_delivrance', v)} /></FadeInView>
                        <FadeInView delay={250}><Input label={t('Autorité de délivrance')} value={formData.autorite_delivrance} onChangeText={(v: string) => updateField('autorite_delivrance', v)} /></FadeInView>

                        <FadeInView delay={280} style={styles.ancestorCard}>
                            <Text style={styles.subTitleSerif}>{t('Le Père')}</Text>
                            <Input label={t('Nom du père')} value={formData.pere_nom} onChangeText={(v: string) => updateField('pere_nom', v)} />
                            <Input label={t('Prénom du père')} value={formData.pere_prenom} onChangeText={(v: string) => updateField('pere_prenom', v)} />
                            <Input label={t('Date de naissance du père')} value={formData.pere_date_naissance} onChangeText={(v: string) => updateField('pere_date_naissance', v)} placeholder="JJ/MM/AAAA" />
                        </FadeInView>

                        <FadeInView delay={310} style={styles.ancestorCard}>
                            <Text style={styles.subTitleSerif}>{t('La Mère')}</Text>
                            <Input label={t('Nom de la mère')} value={formData.mere_nom} onChangeText={(v: string) => updateField('mere_nom', v)} />
                            <Input label={t('Prénom de la mère')} value={formData.mere_prenom} onChangeText={(v: string) => updateField('mere_prenom', v)} />
                            <Input label={t('Date de naissance de la mère')} value={formData.mere_date_naissance} onChangeText={(v: string) => updateField('mere_date_naissance', v)} placeholder="JJ/MM/AAAA" />
                        </FadeInView>

                        <FadeInView delay={340}>
                            <Input label={t('Plume (Lettre de motivation)')} value={formData.motivation_lettre} onChangeText={(v: string) => updateField('motivation_lettre', v)} multiline textArea placeholder={t('Exprimez votre volonté de retrouver vos racines…')} />
                        </FadeInView>

                        <FadeInView delay={370} style={[styles.switchCard, { marginTop: 15 }]}>
                            <ShieldCheck color={davinci.gold} size={20} style={{ marginRight: 10 }} />
                            <Text style={[styles.switchLabel, { flex: 1 }]}>{t('Je consens au traitement RGPD de mes données historiques. *')}</Text>
                            <Switch value={formData.consentement_rgpd} onValueChange={(v) => updateField('consentement_rgpd', v)} trackColor={{ true: davinci.gold }} />
                        </FadeInView>
                    </FadeInView>
                );
            case 4:
                return (
                    <FadeInView delay={0} style={styles.card3D}>
                        <View style={styles.iconBadge}><Feather color={davinci.gold} size={32} /></View>
                        <Text style={styles.titleSerif}>{t('Les Preuves')}</Text>
                        <Text style={styles.descText}>{t('Scellez votre dossier en joignant vos parchemins et preuves matérielles.')}</Text>

                        {DEFAULT_DOC_SLOTS.map((slot, index) => {
                            const uploadedFiles = rawDocs.filter(d => d.key === slot.key);
                            return (
                                <FadeInView key={slot.key} delay={100 + index * 50} style={styles.documentSlotBox}>
                                    <View style={styles.docSlotHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.docSlotTitle}>
                                                {t(slot.label)} {slot.required && <Text style={{ color: davinci.terracotta }}>*</Text>}
                                            </Text>
                                            {slot.ancestral && <Text style={styles.tagAncestral}>{t('ORIGINE ANCESTRALE')}</Text>}
                                        </View>
                                        <TouchableOpacity style={styles.uploadBtn3D} onPress={() => handleFilePick(slot.key, slot.multi)}>
                                            <UploadCloud size={16} color={davinci.sepiaInk} />
                                            <Text style={styles.uploadBtnText3D}>
                                                {uploadedFiles.length > 0 ? t('Ajouter') : t('Parcourir')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    {uploadedFiles.length > 0 && (
                                        <View style={styles.uploadedList}>
                                            {uploadedFiles.map((f, idx) => {
                                                const globalIndex = rawDocs.findIndex(d => d === f);
                                                return (
                                                    <View key={idx} style={styles.uploadedFileItem}>
                                                        <FileText size={16} color={davinci.deepEmerald} />
                                                        <Text style={styles.uploadedFileName} numberOfLines={1}>{f.name}</Text>
                                                        <TouchableOpacity onPress={() => removeFile(globalIndex)}>
                                                            <X size={16} color={davinci.terracotta} />
                                                        </TouchableOpacity>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}
                                </FadeInView>
                            );
                        })}
                    </FadeInView>
                );
            case 5:
                return (
                    <FadeInView delay={0} style={styles.card3D}>
                        <Text style={styles.titleSerif}>{t("L'Édit Final")}</Text>
                        <Text style={styles.descText}>
                            {t("Revoyez votre dossier avant d'apposer le sceau de paiement de {amount} {currency}.", { amount: formAmount, currency: formCurrency })}
                        </Text>

                        <View style={styles.recapSection}>
                            <Text style={styles.recapHeader}>{t('LE DEMANDEUR')}</Text>
                            <InfoRow label={t('Nom complet')} value={`${formData.prenom} ${formData.nom}`} />
                            <InfoRow label={t('Email')} value={formData.email} />
                            <InfoRow label={t('Nationalité actuelle')} value={formData.nationalite} />
                            <InfoRow label={t('Pays de résidence')} value={formData.pays_residence} />
                        </View>

                        <View style={styles.recapSection}>
                            <Text style={styles.recapHeader}>{t('LES RACINES')}</Text>
                            <InfoRow label={t('1er Ancêtre')} value={`${formData.ancestor1_prenom} ${formData.ancestor1_nom}`} />
                            <InfoRow label={t('Lien')} value={formData.ancestor1_lien_parente} />
                            {formData.ancestor2_nom ? (
                                <InfoRow label={t('2ème Ancêtre')} value={`${formData.ancestor2_prenom} ${formData.ancestor2_nom}`} />
                            ) : null}
                        </View>

                        <View style={styles.recapSection}>
                            <Text style={styles.recapHeader}>{t('LES PREUVES')}</Text>
                            <InfoRow label={t('Documents scellés')} value={t('{n} pièce(s) jointe(s)', { n: rawDocs.length })} />
                        </View>

                        <FadeInView delay={300} style={styles.priceBadge}>
                            <Sparkles size={20} color={davinci.gold} style={{ marginRight: 8 }} />
                            <Text style={styles.priceBadgeText}>
                                {t('Droit de chancellerie : {amount} {currency}', { amount: formAmount, currency: formCurrency })}
                            </Text>
                        </FadeInView>
                    </FadeInView>
                );
            case 6:
                return (
                    <FadeInView delay={0} style={[styles.card3D, { alignItems: 'center', paddingVertical: 60 }]}>
                        <View style={styles.royalSeal}>
                            <Check size={50} color={davinci.antiqueWhite} />
                        </View>
                        <Text style={[styles.titleSerif, { textAlign: 'center', marginTop: 30, fontSize: 32 }]}>
                            {t('Dossier Scellé')}
                        </Text>
                        <Text style={[styles.descText, { textAlign: 'center', marginTop: 15 }]}>
                            {t('Votre noble requête a été transmise à nos agents et est désormais gravée dans nos archives pour étude. Un email de confirmation vous a été envoyé.')}
                        </Text>
                        {savedRef && (
                            <View style={[styles.parchmentBox, { marginTop: 20, width: '100%' }]}>
                                <Text style={[styles.parchmentText, { textAlign: 'center', fontSize: 14 }]}>
                                    {t('Référence officielle')}
                                </Text>
                                <Text style={{
                                    fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22,
                                    color: davinci.deepEmerald, textAlign: 'center', marginTop: 6, letterSpacing: 2,
                                }}>
                                    {savedRef}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[styles.goldButton, { marginTop: 40, width: '100%' }]}
                            onPress={() => navigation.navigate('Main')}
                        >
                            <Text style={styles.goldButtonText}>{t("Retourner à l'Accueil")}</Text>
                        </TouchableOpacity>
                    </FadeInView>
                );
            default:
                return null;
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <LinearGradient colors={[davinci.antiqueWhite, davinci.parchment]} style={StyleSheet.absoluteFillObject} />

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => (currentStep > 0 && currentStep < 6 ? prevStep() : navigation.goBack())}
                >
                    <ArrowLeft color={davinci.sepiaInk} size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('Nationalité VIP')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {currentStep < 6 && (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <Animated.View style={[styles.progressBarFill, { width: `${(currentStep / 5) * 100}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{t('Chapitre {n} sur 5', { n: currentStep })}</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {renderStepContent()}
            </ScrollView>

            {currentStep < 6 && (
                <View style={styles.footer}>
                    <TouchableOpacity style={[styles.goldButton, loading && { opacity: 0.7 }]} onPress={nextStep} disabled={loading}>
                        {loading ? <ActivityIndicator color={davinci.sepiaInk} /> : (
                            <>
                                <Text style={styles.goldButtonText}>
                                    {currentStep === 5
                                        ? t('Apposer le sceau ({amount} {currency})', { amount: formAmount, currency: formCurrency })
                                        : t('Poursuivre')}
                                </Text>
                                {currentStep < 5 && <ChevronRight color={davinci.sepiaInk} size={22} />}
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            <KkiapayModal
                visible={showKkiapay}
                amount={String(formAmount)}
                serviceName="Nationalité VIP"
                onClose={() => setShowKkiapay(false)}
                onSuccess={handlePaymentSuccess}
            />
        </KeyboardAvoidingView>
    );
}

const Input = ({ label, textArea, ...props }: any) => (
    <View style={styles.inputWrap}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={[styles.input, textArea && styles.textArea]}
            placeholderTextColor={davinci.shadowWood + '80'}
            {...props}
        />
    </View>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15, paddingHorizontal: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: davinci.antiqueWhite, shadowColor: davinci.shadowWood, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    headerTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: davinci.deepEmerald },
    progressContainer: { paddingHorizontal: 20, paddingBottom: 10 },
    progressBarBg: { height: 8, backgroundColor: davinci.shadowWood + '15', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: davinci.gold, borderRadius: 4 },
    progressText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: davinci.sienna, marginTop: 8, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
    scrollContent: { padding: 20, paddingBottom: 120 },

    card3D: {
        backgroundColor: davinci.antiqueWhite,
        padding: 24, borderRadius: 28,
        borderWidth: 1, borderColor: davinci.gold + '30',
        shadowColor: davinci.shadowWood, shadowOpacity: 0.12, shadowRadius: 25, shadowOffset: { width: 0, height: 12 }, elevation: 8,
        marginBottom: 20,
    },
    iconBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: davinci.parchment, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: davinci.gold + '50' },
    titleSerif: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: davinci.deepEmerald, marginBottom: 10 },
    subTitleSerif: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: davinci.sienna, marginBottom: 15, marginTop: 5 },
    descText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: davinci.sepiaInk, lineHeight: 24, opacity: 0.8, marginBottom: 20 },

    parchmentBox: { backgroundColor: davinci.parchment, padding: 20, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: davinci.sienna },
    parchmentText: { fontFamily: 'PlayfairDisplay_400Regular', fontStyle: 'italic', fontSize: 16, color: davinci.sepiaInk, lineHeight: 26 },

    inputWrap: { marginBottom: 18 },
    label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: davinci.sepiaInk, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: davinci.parchment, borderWidth: 1, borderColor: davinci.gold + '40', borderRadius: 16, paddingHorizontal: 18, height: 56, color: davinci.deepEmerald, fontFamily: 'Inter_500Medium', fontSize: 16 },
    textArea: { height: 120, paddingTop: 18, textAlignVertical: 'top' },

    switchCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: davinci.parchment, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: davinci.gold + '40' },
    switchLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: davinci.sepiaInk, maxWidth: '80%' },

    ancestorCard: { backgroundColor: davinci.antiqueWhite, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: davinci.sienna + '20', marginTop: 15, shadowColor: davinci.sienna, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },

    documentSlotBox: { backgroundColor: davinci.parchment, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: davinci.gold + '40', marginBottom: 12 },
    docSlotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    docSlotTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: davinci.sepiaInk, marginBottom: 4 },
    tagAncestral: { fontFamily: 'Inter_700Bold', fontSize: 9, color: davinci.sienna, letterSpacing: 0.5 },
    uploadBtn3D: { flexDirection: 'row', alignItems: 'center', backgroundColor: davinci.antiqueWhite, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, shadowColor: davinci.shadowWood, shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2, gap: 6 },
    uploadBtnText3D: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: davinci.sepiaInk },
    uploadedList: { marginTop: 12, gap: 8, borderTopWidth: 1, borderColor: davinci.gold + '30', paddingTop: 12 },
    uploadedFileItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: davinci.antiqueWhite, padding: 10, borderRadius: 12, shadowColor: davinci.shadowWood, shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, gap: 10 },
    uploadedFileName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: davinci.deepEmerald },

    recapSection: { borderBottomWidth: 1, borderBottomColor: davinci.gold + '30', paddingBottom: 15, marginBottom: 15 },
    recapHeader: { fontFamily: 'Inter_700Bold', fontSize: 11, color: davinci.sienna, letterSpacing: 1.5, marginBottom: 10 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    infoLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, color: davinci.sepiaInk, opacity: 0.8, flex: 1 },
    infoValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: davinci.deepEmerald, flex: 1, textAlign: 'right' },

    priceBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: davinci.deepEmerald, padding: 16, borderRadius: 16, marginTop: 10, shadowColor: davinci.deepEmerald, shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
    priceBadgeText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 16, color: davinci.gold },

    royalSeal: { width: 100, height: 100, borderRadius: 50, backgroundColor: davinci.deepEmerald, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: davinci.gold, shadowColor: davinci.deepEmerald, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: davinci.antiqueWhite, borderTopWidth: 1, borderTopColor: davinci.gold + '20', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
    goldButton: { backgroundColor: davinci.gold, height: 60, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: davinci.gold, shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
    goldButtonText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: davinci.sepiaInk, textTransform: 'uppercase', letterSpacing: 1 },
});
