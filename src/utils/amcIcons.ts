import { ImageSourcePropType } from 'react-native';
import { getSetting } from '../db/database';

export const AMC_ICON_MAP: Record<string, any> = {
    'ABL Asset Management Company Limited': require('../../assets/amc_icons/ablfunds_logo.jpg'),
    'AKD Investment Management Limited': require('../../assets/amc_icons/akd.jpg'),
    'AL Habib Asset Management Limited': require('../../assets/amc_icons/alhabibasset_logo.jpg'),
    'Al Meezan Investment Management Limited': require('../../assets/amc_icons/al_meezan.jpg'),
    'Alfalah Asset Management Limited': require('../../assets/amc_icons/alfalah.png'),
    'Atlas Asset Management Limited': require('../../assets/amc_icons/aaml_logo.jpg'),
    'AWT Investments Limited': require('../../assets/amc_icons/awt.jpg'),
    'Faysal Asset Management Limited': require('../../assets/amc_icons/faysal.png'),
    'First Capital Investments Limited': require('../../assets/amc_icons/FCIL-logo.png'),
    'HBL Asset Management Limited': require('../../assets/amc_icons/hbl_asset_management_limited_logo.jpg'),
    'JS Investments Limited': require('../../assets/amc_icons/js.png'),
    'Lakson Investments Limited': require('../../assets/amc_icons/laksons.png'),
    'Lucky Investments Limited': require('../../assets/amc_icons/lucky.jpg'),
    'Magnus Investments Limited': require('../../assets/amc_icons/magnus_investment_advisors_ltd_logo.jpg'),
    'Mahaana Wealth Limited': require('../../assets/amc_icons/mahana.jpg'),
    'MCB Investment Management Limited': require('../../assets/amc_icons/mcbfunds_logo.jpg'),
    'National Investment Trust Limited': require('../../assets/amc_icons/nit.png'),
    'NBP Fund Management Limited': require('../../assets/amc_icons/nbpfunds.png'),
    'Pak Oman Asset Management Company Limited': require('../../assets/amc_icons/pak_oman_asset_management_ltd_logo.jpg'),
    'Pak-Qatar Asset Management Company Limited': require('../../assets/amc_icons/pak-qatar.jpg'),
    'UBL Fund Managers Limited': require('../../assets/amc_icons/ubl.png'),
    '786 Investments Limited': require('../../assets/amc_icons/786_logo.jpg'),
};

export const AMC_COLORS: Record<string, string[]> = {
    'ABL': ['#0054a6', '#003d7a'],
    'AKD': ['#002244', '#001122'],
    'AL Habib': ['#0054a6', '#003d7a'],
    'Al Meezan': ['#8c1d2f', '#6b1624'],
    'Alfalah': ['#ed1c24', '#b0151a'],
    'Atlas': ['#0054a6', '#003d7a'],
    'AWT': ['#005a32', '#004022'],
    'Faysal': ['#ed1c24', '#0054a6'],
    'HBL': ['#008269', '#005f4c'],
    'JS': ['#0054a6', '#003d7a'],
    'Lakson': ['#0054a6', '#003d7a'],
    'Lucky': ['#ef4444', '#b91c1c'],
    'Mahaana': ['#22c55e', '#15803d'],
    'MCB': ['#009639', '#00702b'],
    'NIT': ['#0054a6', '#003d7a'],
    'NBP': ['#006a4d', '#004d38'],
    'UBL': ['#0054a6', '#003d7a'],
};

export const getAMCIconSource = (amcName?: string): ImageSourcePropType | undefined => {
    if (!amcName) return undefined;

    // 1. Check static local map
    if (AMC_ICON_MAP[amcName]) {
        return AMC_ICON_MAP[amcName];
    }

    return undefined;
};
