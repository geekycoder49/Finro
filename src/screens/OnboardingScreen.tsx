import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, useColorScheme, Animated, Dimensions } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Check, ArrowRight, Sparkles } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const AVATARS = [
    'https://img.icons8.com/color/96/bear.png',
    'https://img.icons8.com/color/96/cat.png',
    'https://img.icons8.com/color/96/corgi.png',
    'https://img.icons8.com/color/96/rabbit.png',
    'https://img.icons8.com/color/96/lion.png',
    'https://img.icons8.com/color/96/panda.png',
    'https://img.icons8.com/color/96/sloth.png',
    'https://img.icons8.com/color/96/koala.png',
];

const COLORS = [
    '#4F46E5', // Indigo
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#0EA5E9', // Sky
];

const OnboardingScreen = ({ navigation }: any) => {
    const { setUserName, setTheme, setAccentColor, setProfileImage, completeOnboarding } = useSettingsStore();
    const systemScheme = useColorScheme();

    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>('system');
    const [selectedColor, setSelectedColor] = useState('#4F46E5');
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    const transitionTo = (nextStep: number) => {
        // Fade out
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -50,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            setStep(nextStep);
            slideAnim.setValue(50);
            // Fade in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        });
    };

    const handleFinish = () => {
        setUserName(name || 'User');
        setTheme(selectedTheme);
        setAccentColor(selectedColor);
        setProfileImage(selectedAvatar);
        completeOnboarding();
    };

    const isDark = selectedTheme === 'system' ? systemScheme === 'dark' : selectedTheme === 'dark';
    const bg = isDark ? '#0F172A' : '#F8FAFC';
    const text = isDark ? '#F1F5F9' : '#1E293B';
    const surface = isDark ? '#1E293B' : '#FFFFFF';
    const border = isDark ? '#334155' : '#E2E8F0';

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.contentBox}>
                <Text style={[styles.title, { color: text }]}>Welcome to HysabKytab</Text>
                <Text style={[styles.subtitle, { color: text, opacity: 0.7 }]}>Let's get to know you.</Text>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: text }]}>What should we call you?</Text>
                    <TextInput
                        style={[styles.input, { color: text, borderBottomColor: selectedColor }]}
                        placeholder="Your Name"
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        value={name}
                        onChangeText={setName}
                    />
                </View>
            </View>

            <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: selectedColor, opacity: name ? 1 : 0.5 }]}
                disabled={!name}
                onPress={() => transitionTo(2)}
            >
                <Text style={styles.btnText}>Next</Text>
                <ArrowRight color="white" size={20} />
            </TouchableOpacity>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.contentBox}>
                <Text style={[styles.title, { color: text }]}>Style Selection</Text>
                <Text style={[styles.subtitle, { color: text, opacity: 0.7 }]}>Make it yours.</Text>

                <Text style={[styles.label, { color: text, marginTop: 10 }]}>Theme</Text>
                <View style={styles.row}>
                    {['light', 'dark', 'system'].map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[
                                styles.optionChip,
                                { backgroundColor: surface, borderColor: selectedTheme === t ? selectedColor : border, borderWidth: 1 }
                            ]}
                            onPress={() => setSelectedTheme(t as any)}
                        >
                            <Text style={{ color: text, textTransform: 'capitalize', fontWeight: '600' }}>{t}</Text>
                            {selectedTheme === t && <Check size={16} color={selectedColor} />}
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.label, { color: text, marginTop: 32 }]}>Brand Accent</Text>
                <View style={styles.colorGrid}>
                    {COLORS.map(c => (
                        <TouchableOpacity
                            key={c}
                            style={[styles.colorCircle, { backgroundColor: c, borderColor: selectedColor === c ? 'white' : 'transparent', borderWidth: 3 }]}
                            onPress={() => setSelectedColor(c)}
                        >
                            {selectedColor === c && <Check color="white" size={20} />}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.footerRow}>
                <TouchableOpacity onPress={() => transitionTo(1)} style={styles.backBtn}>
                    <Text style={{ color: text, fontWeight: '600' }}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: selectedColor }]}
                    onPress={() => transitionTo(3)}
                >
                    <Text style={styles.btnText}>Next</Text>
                    <ArrowRight color="white" size={20} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.contentBox}>
                <Text style={[styles.title, { color: text }]}>Profile Avatar</Text>
                <Text style={[styles.subtitle, { color: text, opacity: 0.7 }]}>Represent yourself.</Text>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.avatarGrid}>
                    {AVATARS.map(url => (
                        <TouchableOpacity
                            key={url}
                            style={[
                                styles.avatarOption,
                                { borderColor: selectedAvatar === url ? selectedColor : border, backgroundColor: surface }
                            ]}
                            onPress={() => setSelectedAvatar(url)}
                        >
                            <Image source={{ uri: url }} style={styles.avatarImg} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.footerRow}>
                <TouchableOpacity onPress={() => transitionTo(2)} style={styles.backBtn}>
                    <Text style={{ color: text, fontWeight: '600' }}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: selectedColor }]}
                    onPress={() => transitionTo(4)}
                >
                    <Text style={styles.btnText}>Done</Text>
                    <ArrowRight color="white" size={20} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStep4 = () => (
        <View style={[styles.stepContainer, { justifyContent: 'center', alignItems: 'center' }]}>
            <View style={[styles.welcomeCircle, { backgroundColor: selectedColor + '20' }]}>
                {selectedAvatar ? (
                    <Image source={{ uri: selectedAvatar }} style={styles.welcomeAvatar} />
                ) : (
                    <Sparkles size={60} color={selectedColor} />
                )}
            </View>
            <Text style={[styles.welcomeTitle, { color: text }]}>Welcome, {name}!</Text>
            <Text style={[styles.welcomeSubtitle, { color: text, opacity: 0.7 }]}>
                Your personal finance journey begins today. Let's make every penny count.
            </Text>

            <TouchableOpacity
                style={[styles.getStartedBtn, { backgroundColor: selectedColor }]}
                onPress={handleFinish}
            >
                <Text style={styles.getStartedText}>Enter Dashboard</Text>
                <ArrowRight color="white" size={20} />
            </TouchableOpacity>
        </View>
    );

    return (
        <ScreenWrapper scroll={false} fullScreen noPadding>
            <View style={[styles.container, { backgroundColor: bg }]}>
                <Animated.View style={[
                    styles.animContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }
                ]}>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </Animated.View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    animContainer: { flex: 1 },
    stepContainer: { flex: 1, padding: 30, paddingTop: 100 },
    contentBox: { flex: 1 },
    title: { fontSize: 36, fontWeight: '900', marginBottom: 12, letterSpacing: -1 },
    subtitle: { fontSize: 18, marginBottom: 50, lineHeight: 26 },
    inputContainer: { marginBottom: 40 },
    label: { fontSize: 14, fontWeight: '700', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 },
    input: { fontSize: 28, borderBottomWidth: 3, paddingVertical: 15, fontWeight: '600' },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 35,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        gap: 12
    },
    btnText: { color: 'white', fontSize: 18, fontWeight: '800' },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
    backBtn: { padding: 15 },
    row: { flexDirection: 'row', gap: 12, marginTop: 10 },
    optionChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 10
    },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginTop: 10 },
    colorCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20, paddingBottom: 50 },
    avatarOption: {
        width: width * 0.35,
        height: width * 0.35,
        borderRadius: 25,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5
    },
    avatarImg: { width: '80%', height: '80%', resizeMode: 'contain' },

    // Step 4 Welcome
    welcomeCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30
    },
    welcomeAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60
    },
    welcomeTitle: {
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 15,
        textAlign: 'center'
    },
    welcomeSubtitle: {
        fontSize: 18,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 28,
        marginBottom: 50
    },
    getStartedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 20,
        borderRadius: 40,
        gap: 15,
        elevation: 8
    },
    getStartedText: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900'
    }
});

export default OnboardingScreen;
