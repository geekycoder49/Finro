import React from 'react';
import {
    Home, Plane, Key, Utensils, User, CircleEllipsis,
    Zap, BookOpen, ShoppingCart, Heart, Smartphone, Gift,
    Banknote, Award, Code, TrendingUp, Percent, ArrowLeftRight, Plus,
    CreditCard, ShoppingBag, Coffee, Car, ShieldCheck, Briefcase,
    Activity, Wallet, Building, Monitor, Bus, Wrench, Droplets
} from 'lucide-react-native';

export const CATEGORY_ICONS: any = {
    // Income
    'Salary': Banknote,
    'Bonus': Award,
    'Freelance': Code,
    'Allowance': Wallet,
    'Other Income': TrendingUp,
    'Commission': Percent,
    'Gifts': Gift,

    // Expense
    'Travel': Plane,
    'Food & Drink': Utensils,
    'Grocery': ShoppingCart,
    'Medical': Activity,
    'Other Expenses': CircleEllipsis,
    'Rent Paid': Key,
    'Bills & Utilities': Zap,
    'Mobile': Smartphone,
    'Education': BookOpen,
    'Personal': User,
    'Donations / Charity': Gift,
    'Family': Home,
    'Office': Briefcase,
    'Electronics': Monitor,
    'Transport': Bus,
    'Health & Fitness': Heart,
    'Shopping': ShoppingBag,

    // Legacy/Fallback mapping
    'Rent': Key,
    'Bills': Zap,
    'Fitness': Heart,
    'Donations': Gift,
    'Entertainment': ShieldCheck,
    'Business': Briefcase,
    'Coffee': Coffee,

    // Special
    'Transfer': ArrowLeftRight,
    'People': Plus
};

export const getCategoryIcon = (category: string, size = 20, color = '#000') => {
    const IconComponent = CATEGORY_ICONS[category] || CircleEllipsis;
    return <IconComponent size={size} color={color} />;
};
