import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, useColorScheme, Animated, Dimensions, FlatList } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Check, ArrowRight, Sparkles, Image as ImageIcon, LayoutGrid, Plus, DollarSign, Wallet, Target, CreditCard, PieChart, TrendingUp, ShieldCheck } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';

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

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR'];

const GOALS = [
    { id: 'track', label: 'Track Expenses', icon: PieChart, desc: 'Know where every penny goes.' },
    { id: 'save', label: 'Save Money', icon: Wallet, desc: 'Build your savings faster.' },
    { id: 'invest', label: 'Invest Better', icon: TrendingUp, desc: 'Grow your wealth over time.' },
    { id: 'debt', label: 'Manage Debt', icon: CreditCard, desc: 'Get debt-free efficiently.' },
];

const SLIDES = [
    {
        id: 1,
        title: 'Track Every Penny',
        subtitle: 'Gain total control over your spending habits with intuitive tracking.',
        icon: Target,
        color: '#4F46E5'
    },
    {
        id: 2,
        title: 'Visualize Wealth',
        subtitle: 'See your financial health at a glance with beautiful charts.',
        icon: PieChart,
        color: '#10B981'
    },
    {
        id: 3,
        title: 'Achieve Goals',
        subtitle: 'Plan for your future and hit your financial milestones.',
        icon: Sparkles,
        color: '#F59E0B'
    }
];

const OnboardingScreen = ({ navigation }: any) => {
    const { setUserName, setTheme, setAccentColor, setProfileImage, setCurrency, setGoal, completeOnboarding } = useSettingsStore();
    const systemScheme = useColorScheme();

    // 0: Intro Slides, 1: Goal, 2: Profile, 3: Theme, 4: Finish
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('PKR');
    const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
    const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>('system');
    const [selectedColor, setSelectedColor] = useState('#4F46E5');
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [customAvatar, setCustomAvatar] = useState<string | null>(null);
    const [avatarSource, setAvatarSource] = useState<'PRESET' | 'CUSTOM'>('PRESET');

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const confettiRef = useRef<any>(null);

    // Intro Slide State
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (step === 4) {
            startFloatingAnim();
            setTimeout(() => {
                if (confettiRef.current) confettiRef.current.start();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }, 500);
        }
    }, [step]);

    const startFloatingAnim = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -15,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                })
            ])
        ).start();
    };

    const transitionTo = (nextStep: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -20,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            setStep(nextStep);
            slideAnim.setValue(20);
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

    const pickCustomImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setCustomAvatar(result.assets[0].uri);
            setAvatarSource('CUSTOM');
            Haptics.selectionAsync();
        }
    };

    const handleFinish = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Final Save
        setUserName(name || 'User');
        setCurrency(selectedCurrency);
        if (selectedGoal) setGoal(selectedGoal);
        setTheme(selectedTheme);
        setAccentColor(selectedColor);

        // Smart Default Avatar Logic
        // If user picked nothing, we leave it null. The new Dashboard can handle initials if implemented, 
        // but for now let's default to the first bear if really nothing is picked?
        // Actually, let's respect their choice. If null, apps usually show initials.
        // Dashboard code already handles profileImage logic:
        // {profileImage ? <Image .../> : <View><Text>{userName.charAt(0)}</Text></View>}
        // So sending null is perfect for "Initials" default.

        let finalImage = null;
        if (avatarSource === 'CUSTOM') finalImage = customAvatar;
        else if (selectedAvatar) finalImage = selectedAvatar;

        setProfileImage(finalImage);

        setTimeout(() => {
            completeOnboarding();
        }, 500); // 500ms is enough for the haptic and button press feedback
    };

    const isDark = selectedTheme === 'system' ? systemScheme === 'dark' : selectedTheme === 'dark';
    const bg = isDark ? '#0F172A' : '#F8FAFC';
    const text = isDark ? '#F1F5F9' : '#1E293B';
    const surface = isDark ? '#1E293B' : '#FFFFFF';
    const border = isDark ? '#334155' : '#E2E8F0';

    // --- RENDERERS ---

    const renderIntro = () => {
        return (
            <View style={{ flex: 1, justifyContent: 'space-between', paddingBottom: 40 }}>
                <View style={{ height: height * 0.65 }}>
                    <Animated.FlatList
                        data={SLIDES}
                        keyExtractor={item => item.id.toString()}
                        horizontal
                        pagingEnabled
                        scrollEventThrottle={32}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                            { useNativeDriver: false }
                        )}
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(ev) => {
                            const index = Math.round(ev.nativeEvent.contentOffset.x / width);
                            setCurrentSlideIndex(index);
                        }}
                        renderItem={({ item }) => (
                            <View style={{ width, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                                <View style={[styles.slideIconCircle, { backgroundColor: item.color + '20' }]}>
                                    <item.icon size={80} color={item.color} />
                                </View>
                                <Text style={[styles.slideTitle, { color: text }]}>{item.title}</Text>
                                <Text style={[styles.slideSubtitle, { color: text }]}>{item.subtitle}</Text>
                            </View>
                        )}
                    />
                </View>

                <View style={{ gap: 30, alignItems: 'center' }}>
                    <View style={styles.pagination}>
                        {SLIDES.map((_, i) => {
                            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                            const dotWidth = scrollX.interpolate({
                                inputRange,
                                outputRange: [8, 24, 8],
                                extrapolate: 'clamp',
                            });
                            const opacity = scrollX.interpolate({
                                inputRange,
                                outputRange: [0.3, 1, 0.3],
                                extrapolate: 'clamp',
                            });
                            return (
                                <Animated.View
                                    key={i}
                                    style={[styles.dot, { width: dotWidth, opacity, backgroundColor: selectedColor }]}
                                />
                            );
                        })}
                    </View>

                    <TouchableOpacity
                        style={[styles.nextBtn, { backgroundColor: selectedColor, width: width * 0.8 }]}
                        onPress={() => transitionTo(1)}
                    >
                        <Text style={styles.btnText}>Get Started</Text>
                        <ArrowRight color="white" size={20} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderStep1_Goal = () => (
        <View style={styles.stepContainer}>
            <View style={styles.contentBox}>
                <Text style={[styles.title, { color: text }]}>What brings you here?</Text>
                <Text style={[styles.subtitle, { color: text, opacity: 0.7 }]}>Select your primary goal.</Text>

                <View style={{ gap: 15 }}>
                    {GOALS.map((goal) => (
                        <TouchableOpacity
                            key={goal.id}
                            style={[
                                styles.goalCard,
                                { backgroundColor: surface, borderColor: selectedGoal === goal.id ? selectedColor : border }
                            ]}
                            onPress={() => {
                                setSelectedGoal(goal.id);
                                Haptics.selectionAsync();
                            }}
                        >
                            <View style={[styles.goalIconBox, { backgroundColor: selectedGoal === goal.id ? selectedColor : (isDark ? '#334155' : '#F1F5F9') }]}>
                                <goal.icon size={24} color={selectedGoal === goal.id ? 'white' : text} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.goalLabel, { color: text }]}>{goal.label}</Text>
                                <Text style={[styles.goalDesc, { color: text, opacity: 0.6 }]}>{goal.desc}</Text>
                            </View>
                            {selectedGoal === goal.id ? <Check size={20} color={selectedColor} /> : null}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.footerRow}>
                <TouchableOpacity onPress={() => transitionTo(0)} style={styles.backBtn}>
                    <Text style={{ color: text, fontWeight: '600' }}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: selectedColor, opacity: selectedGoal ? 1 : 0.5 }]}
                    disabled={!selectedGoal}
                    onPress={() => transitionTo(2)}
                >
                    <Text style={styles.btnText}>Next</Text>
                    <ArrowRight color="white" size={20} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStep2_Profile = () => (
        <View style={styles.stepContainer}>
            <View style={styles.contentBox}>
                <Text style={[styles.title, { color: text }]}>About You</Text>
                <Text style={[styles.subtitle, { color: text, opacity: 0.7 }]}>Let's personalize your experience.</Text>

                {/* Name */}
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

                {/* Currency */}
                <View style={{ marginBottom: 30 }}>
                    <Text style={[styles.label, { color: text }]}>Currency</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {CURRENCIES.map((curr) => (
                            <TouchableOpacity
                                key={curr}
                                style={[
                                    styles.currencyChip,
                                    { backgroundColor: selectedCurrency === curr ? selectedColor : surface, borderColor: border }
                                ]}
                                onPress={() => {
                                    setSelectedCurrency(curr);
                                    Haptics.selectionAsync();
                                }}
                            >
                                <Text style={{ color: selectedCurrency === curr ? 'white' : text, fontWeight: '700' }}>{curr}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Avatar Preview & Selection */}
                <View>
                    <Text style={[styles.label, { color: text }]}>Avatar (Optional)</Text>
                    <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => setAvatarSource('PRESET')}>
                            <View style={[styles.avatarSelector, { backgroundColor: surface, borderColor: avatarSource === 'PRESET' ? selectedColor : border }]}>
                                {selectedAvatar ? <Image source={{ uri: selectedAvatar }} style={{ width: 40, height: 40 }} /> : <LayoutGrid size={24} color={text} />}
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={pickCustomImage}>
                            <View style={[styles.avatarSelector, { backgroundColor: surface, borderColor: avatarSource === 'CUSTOM' ? selectedColor : border }]}>
                                {customAvatar ? <Image source={{ uri: customAvatar }} style={{ width: 40, height: 40, borderRadius: 20 }} /> : <ImageIcon size={24} color={text} />}
                            </View>
                        </TouchableOpacity>

                        <Text style={{ fontSize: 12, color: text, opacity: 0.5, flex: 1 }}>
                            {avatarSource === 'PRESET' ? 'Tap below to choose a character.' : 'Tap to upload your own photo.'}
                        </Text>
                    </View>

                    {avatarSource === 'PRESET' ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginTop: 15 }}>
                            {AVATARS.map(url => (
                                <TouchableOpacity
                                    key={url}
                                    style={[
                                        styles.miniAvatarOption,
                                        { borderColor: selectedAvatar === url ? selectedColor : 'transparent' }
                                    ]}
                                    onPress={() => {
                                        setSelectedAvatar(url);
                                        Haptics.selectionAsync();
                                    }}
                                >
                                    <Image source={{ uri: url }} style={styles.miniAvatarImg} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : null}
                </View>
            </View>

            <View style={styles.footerRow}>
                <TouchableOpacity onPress={() => transitionTo(1)} style={styles.backBtn}>
                    <Text style={{ color: text, fontWeight: '600' }}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: selectedColor, opacity: name ? 1 : 0.5 }]}
                    disabled={!name}
                    onPress={() => transitionTo(3)}
                >
                    <Text style={styles.btnText}>Next</Text>
                    <ArrowRight color="white" size={20} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStep3_Theme = () => (
        <View style={styles.stepContainer}>
            <View style={styles.contentBox}>
                <Text style={[styles.title, { color: text }]}>Make it Yours</Text>
                <Text style={[styles.subtitle, { color: text, opacity: 0.7 }]}>Choose your vibe.</Text>

                <Text style={[styles.label, { color: text, marginTop: 10 }]}>Theme</Text>
                <View style={styles.row}>
                    {['light', 'dark', 'system'].map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[
                                styles.optionChip,
                                { backgroundColor: surface, borderColor: selectedTheme === t ? selectedColor : border, borderWidth: 1 }
                            ]}
                            onPress={() => {
                                setSelectedTheme(t as any);
                                Haptics.selectionAsync();
                            }}
                        >
                            <Text style={{ color: text, textTransform: 'capitalize', fontWeight: '600' }}>{t}</Text>
                            {selectedTheme === t ? <Check size={16} color={selectedColor} /> : null}
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.label, { color: text, marginTop: 32 }]}>Brand Accent</Text>
                <View style={styles.colorGrid}>
                    {COLORS.map(c => (
                        <TouchableOpacity
                            key={c}
                            style={[styles.colorCircle, { backgroundColor: c, borderColor: selectedColor === c ? 'white' : 'transparent', borderWidth: 3 }]}
                            onPress={() => {
                                setSelectedColor(c);
                                Haptics.selectionAsync();
                            }}
                        >
                            {selectedColor === c ? <Check color="white" size={20} /> : null}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.footerRow}>
                <TouchableOpacity onPress={() => transitionTo(2)} style={styles.backBtn}>
                    <Text style={{ color: text, fontWeight: '600' }}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: selectedColor }]}
                    onPress={() => transitionTo(4)}
                >
                    <Text style={styles.btnText}>Finish</Text>
                    <Sparkles color="white" size={20} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStep4_Finish = () => (
        <View style={[styles.stepContainer, { justifyContent: 'center', alignItems: 'center' }]}>
            <ConfettiCannon
                count={200}
                origin={{ x: width / 2, y: 0 }}
                autoStart={false}
                ref={confettiRef}
                fadeOut={true}
            />

            <Animated.View style={[
                styles.welcomeCircle,
                { backgroundColor: selectedColor + '20', transform: [{ translateY: floatAnim }] }
            ]}>
                {(avatarSource === 'CUSTOM' ? customAvatar : selectedAvatar) ? (
                    <Image source={{ uri: avatarSource === 'CUSTOM' ? customAvatar! : selectedAvatar! }} style={styles.welcomeAvatar} />
                ) : (
                    <Text style={{ fontSize: 40, fontWeight: '900', color: selectedColor }}>
                        {name ? name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                )}
            </Animated.View>

            <Text style={[styles.welcomeTitle, { color: text }]}>You're all set!</Text>
            <Text style={[styles.welcomeSubtitle, { color: text, opacity: 0.7 }]}>
                Welcome to Finro, {name}. Your dashboard is ready.
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
                {(step > 0 && step < 4) ? (
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${(step / 3) * 100}%`, backgroundColor: selectedColor }]} />
                    </View>
                ) : null}

                <Animated.View style={[
                    styles.animContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateX: slideAnim }]
                    }
                ]}>
                    {step === 0 ? renderIntro() : null}
                    {step === 1 ? renderStep1_Goal() : null}
                    {step === 2 ? renderStep2_Profile() : null}
                    {step === 3 ? renderStep3_Theme() : null}
                    {step === 4 ? renderStep4_Finish() : null}
                </Animated.View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    animContainer: { flex: 1 },
    stepContainer: { flex: 1, padding: 30, paddingTop: 60 },
    contentBox: { flex: 1 },
    title: { fontSize: 32, fontWeight: '900', marginBottom: 8, letterSpacing: -1 },
    subtitle: { fontSize: 16, marginBottom: 40, lineHeight: 24 },

    // Intro Slides
    slideIconCircle: { width: 160, height: 160, borderRadius: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
    slideTitle: { fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
    slideSubtitle: { fontSize: 16, textAlign: 'center', opacity: 0.7, lineHeight: 24, maxWidth: '80%' },
    pagination: { flexDirection: 'row', height: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },

    // Inputs
    inputContainer: { marginBottom: 30 },
    label: { fontSize: 13, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.8 },
    input: { fontSize: 24, borderBottomWidth: 2, paddingVertical: 10, fontWeight: '600' },

    // Buttons
    nextBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 28, paddingVertical: 18, borderRadius: 100,
        elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
        gap: 12
    },
    btnText: { color: 'white', fontSize: 18, fontWeight: '700' },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
    backBtn: { padding: 15 },

    // Options
    row: { flexDirection: 'row', gap: 12, marginTop: 10 },
    optionChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, gap: 10 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
    colorCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

    // Goal Cards
    goalCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, gap: 15 },
    goalIconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    goalLabel: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    goalDesc: { fontSize: 12 },

    // Currency
    currencyChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginRight: 10 },

    // Avatar
    avatarSelector: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    miniAvatarOption: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, padding: 2 },
    miniAvatarImg: { width: '100%', height: '100%' },

    // Progress
    progressBar: { height: 4, backgroundColor: 'rgba(0,0,0,0.05)', width: '100%', position: 'absolute', top: 0, zIndex: 10 },
    progressFill: { height: '100%' },

    // Finish Screen
    welcomeCircle: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    welcomeAvatar: { width: 120, height: 120, borderRadius: 60 },
    welcomeTitle: { fontSize: 32, fontWeight: '900', marginBottom: 15, textAlign: 'center' },
    welcomeSubtitle: { fontSize: 18, textAlign: 'center', paddingHorizontal: 20, lineHeight: 28, marginBottom: 50 },
    getStartedBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 40, paddingVertical: 20, borderRadius: 40, gap: 15, elevation: 8 },
    getStartedText: { color: 'white', fontSize: 20, fontWeight: '900' }
});

export default OnboardingScreen;
