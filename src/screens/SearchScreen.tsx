import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { DARK_THEME, LIGHT_THEME } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Search, X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plus, Filter } from 'lucide-react-native';
import { searchTransactions, Transaction } from '../db/database';
import { format } from 'date-fns';

const FILTERS = ['ALL', 'EXPENSE', 'INCOME', 'TRANSFER'];

const SearchScreen = ({ navigation }: any) => {
    const { currency, theme, accentColor } = useSettingsStore();
    const themeColors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

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

    const renderTransaction = ({ item }: { item: Transaction }) => {
        const isExpense = item.type === 'EXPENSE';
        const isIncome = item.type === 'INCOME';
        const isTransfer = item.type === 'TRANSFER';

        return (
            <TouchableOpacity
                style={[styles.transactionRow, { backgroundColor: themeColors.surface }]}
                onPress={() => navigation.navigate('EditTransaction', { transaction: item })}
            >
                <View style={[styles.transIconBox, { backgroundColor: themeColors.background }]}>
                    {isExpense ? <ArrowUpRight color="#EF4444" size={20} /> : null}
                    {isIncome ? <ArrowDownLeft color="#10B981" size={20} /> : null}
                    {isTransfer ? <ArrowLeftRight color={accentColor} size={20} /> : null}
                    {item.type === 'PEOPLE' ? <Plus color={accentColor} size={20} /> : null}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.transCategory, { color: themeColors.text }]}>{item.category}</Text>
                    {item.description ? <Text style={{ fontSize: 11, color: themeColors.textSecondary }} numberOfLines={1}>{item.description}</Text> : null}
                    <Text style={[styles.transDate, { color: themeColors.textSecondary }]}>{format(new Date(item.date), 'dd MMM yyyy')}</Text>
                </View>
                <Text style={[styles.transAmount, { color: isExpense ? '#EF4444' : isIncome ? '#10B981' : themeColors.text }]}>
                    {isExpense ? '-' : isIncome ? '+' : ''}{currency} {item.amount.toLocaleString()}
                </Text>
            </TouchableOpacity>
        );
    };

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
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <X color={themeColors.textSecondary} size={18} />
                        </TouchableOpacity>
                    )}
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
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    transIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transCategory: { fontSize: 15, fontWeight: '500' },
    transDate: { fontSize: 11 },
    transAmount: { fontSize: 15, fontWeight: '600' },
});

export default SearchScreen;
