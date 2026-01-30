import React from 'react';
import {
    Home, Plane, Key, Utensils, User, CircleEllipsis,
    Zap, BookOpen, ShoppingCart, Heart, Smartphone, Gift,
    Banknote, Award, Code, TrendingUp, Percent, ArrowLeftRight, Plus,
    CreditCard, ShoppingBag, Coffee, Car, ShieldCheck, Briefcase
} from 'lucide-react-native';

export const CATEGORY_ICONS: any = {
    // Expense
    'Family': Home,
    'Travel': Plane,
    'Rent': Key,
    'Food & Drink': Utensils,
    'Personal': User,
    'Other Expenses': CircleEllipsis,
    'Bills': Zap,
    'Education': BookOpen,
    'Grocery': ShoppingCart,
    'Fitness': Heart,
    'Mobile': Smartphone,
    'Donations': Gift,
    'Shopping': ShoppingBag,
    'Coffee': Coffee,
    'Fuel': Car,
    'Entertainment': ShieldCheck,
    'Business': Briefcase,

    // Income
    'Salary': Banknote,
    'Bonus': Award,
    'Freelance': Code,
    'Other Income': TrendingUp,
    'Commission': Percent,

    // Special
    'Transfer': ArrowLeftRight,
    'People': Plus
};

export const getCategoryIcon = (category: string, size = 20, color = '#000') => {
    const IconComponent = CATEGORY_ICONS[category] || CircleEllipsis;
    return <IconComponent size={size} color={color} />;
};
