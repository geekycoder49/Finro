import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import { Search, X, Filter } from 'lucide-react-native';
import { searchTransactions, Transaction } from '../db/database';
import { format } from 'date-fns';

import { TransactionCard } from '../components/TransactionCard';

const FILTERS = ['ALL', 'EXPENSE', 'INCOME', 'TRANSFER'];

const SearchScreen = ({ navigation }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const { themeColors } = useTheme();

    const [query, setQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [results, setResults] = useState<Transaction[]>([]);

    useEffect(() => {
        handleSearch();
    }, [query, activeFilter]);

    const handleSearch = () => {
        const res = searchTransactions(query, activeFilter);
        setResults(res);
    };

    const renderTransaction = ({ item }: { item: Transaction }) => (
        <TransactionCard
            item={item}
            onPress={(t) => navigation.navigate('EditTransaction', { transaction: t })}
        />
    );

    return (
        <ScreenWrapper scroll={false}>
            <View style={styles.header}>
                <View style={[styles.searchBar, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                    <Search color={themeColors.textSecondary} size={20} />
                    <TextInput
                        style={[styles.input, { color: themeColors.text }]}
                        placeholder="Search transactions..."
                        placeholderTextColor={themeColors.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                    />
                    {query.length > 0 ? (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <X color={themeColors.textSecondary} size={18} />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                    <Text style={{ color: accentColor, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filters}>
                <FlatList
                    data={FILTERS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => setActiveFilter(item)}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: activeFilter === item ? accentColor : themeColors.surface,
                                    borderColor: activeFilter === item ? accentColor : themeColors.border
                                }
                            ]}
                        >
                            <Text style={{
                                color: activeFilter === item ? 'white' : themeColors.textSecondary,
                                fontSize: 12, fontWeight: '600'
                            }}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            <FlatList
                data={results}
                renderItem={renderTransaction}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{ gap: 10, paddingBottom: 50 }}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Search color={themeColors.textSecondary} size={48} opacity={0.2} />
                        <Text style={{ color: themeColors.textSecondary, marginTop: 10 }}>No transactions found</Text>
                    </View>
                }
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44, // Slightly taller
        borderRadius: 12,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
    },
    filters: {
        marginBottom: 16,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    }
});

export default SearchScreen;
