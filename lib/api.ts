import { Platform } from 'react-native';

export const API_BASE = Platform.OS === 'web' ? '' : 'https://drnohan-snapchef.expo.app';
