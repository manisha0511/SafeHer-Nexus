import { SafetyCategory, SafetyTipItem } from '../types/safety';
import { apiRequest } from './apiClient';

export const FALLBACK_HELPLINES: SafetyTipItem[] = [
  {
    id: 1,
    category: 'HELPLINES',
    title: 'National Emergency Number',
    content:
      'Single unified emergency number for Police, Fire, and Medical assistance across India.',
    emergencyNumber: '112',
    helpline: true,
    displayOrder: 1,
  },
  {
    id: 2,
    category: 'HELPLINES',
    title: 'Women Helpline (All India)',
    content: '24x7 dedicated emergency response helpline for women in distress.',
    emergencyNumber: '1091',
    helpline: true,
    displayOrder: 2,
  },
  {
    id: 3,
    category: 'HELPLINES',
    title: 'Women Helpline (Domestic Abuse)',
    content:
      'National commission helpline providing counseling and emergency shelter assistance.',
    emergencyNumber: '181',
    helpline: true,
    displayOrder: 3,
  },
  {
    id: 4,
    category: 'HELPLINES',
    title: 'Women Power Line (Anti-Harassment)',
    content:
      'Confidential reporting helpline for harassment, stalking, and unsolicited calls.',
    emergencyNumber: '1090',
    helpline: true,
    displayOrder: 4,
  },
  {
    id: 5,
    category: 'HELPLINES',
    title: 'National Cyber Crime Helpline',
    content:
      'Official reporting helpline for online harassment, stalking, and cyber fraud.',
    emergencyNumber: '1930',
    helpline: true,
    displayOrder: 5,
  },
];

export const FALLBACK_SAFETY_TIPS: SafetyTipItem[] = [
  ...FALLBACK_HELPLINES,
  {
    id: 6,
    category: 'TRAVEL',
    title: 'Verify Driver & License Plate Before Boarding',
    content:
      'Always match the car registration plate, driver photo, and car model with the ride-sharing app before entering. Never get into a car where details differ.',
    emergencyNumber: null,
    helpline: false,
    displayOrder: 10,
  },
  {
    id: 7,
    category: 'TRAVEL',
    title: 'Share Ride Status & Track Route',
    content:
      'Share your live ride status with a trusted contact. Keep your mobile GPS enabled and observe if the vehicle deviates from standard routes.',
    emergencyNumber: null,
    helpline: false,
    displayOrder: 11,
  },
  {
    id: 8,
    category: 'TRAVEL',
    title: 'Sit in the Rear Seat',
    content:
      'Sitting in the rear right or left seat creates physical distance, gives visibility of both sides, and allows exiting from either door in an emergency.',
    emergencyNumber: null,
    helpline: false,
    displayOrder: 12,
  },
  {
    id: 9,
    category: 'COMMUTE',
    title: 'Wait in Well-Lit, Populated Zones',
    content:
      'At bus stops, metro stations, or railway platforms, choose well-lit areas near ticket booths, CCTV cameras, or official security personnel.',
    emergencyNumber: null,
    helpline: false,
    displayOrder: 20,
  },
  {
    id: 10,
    category: 'COMMUTE',
    title: 'Keep One Ear Free from Headphones',
    content:
      'Avoid wearing noise-canceling headphones over both ears during street walks or transit commutes so you stay alert to approaching vehicles or footsteps.',
    emergencyNumber: null,
    helpline: false,
    displayOrder: 21,
  },
  {
    id: 11,
    category: 'NIGHT_SAFETY',
    title: 'Walk with Purpose and Awareness',
    content:
      'Keep your head up, maintain steady eye contact with surroundings, and walk with confident body language. Avoid looking down at your screen continuously.',
    emergencyNumber: null,
    helpline: false,
    displayOrder: 30,
  },
  {
    id: 12,
    category: 'NIGHT_SAFETY',
    title: 'Have Keys & Safety App Ready',
    content:
      'Have your house or car keys in hand before reaching your doorstep or vehicle. Keep SafeHer Nexus on quick standby.',
    emergencyNumber: null,
    helpline: false,
    displayOrder: 31,
  },
  {
    id: 13,
    category: 'DIGITAL',
    title: 'Limit Real-Time Location on Social Media',
    content:
      'Avoid tagging exact current locations or sharing daily route routines publicly on social media. Share check-ins after leaving a venue.',
    emergencyNumber: null,
    helpline: false,
    displayOrder: 40,
  },
  {
    id: 14,
    category: 'DIGITAL',
    title: 'Lock Device & Secure Screen Previews',
    content:
      'Disable sensitive lock-screen notifications and set up biometric or secure PIN protection on your phone to protect trusted contacts and personal data.',
    emergencyNumber: null,
    helpline: false,
    displayOrder: 41,
  },
];

export async function fetchSafetyTips(
  category?: SafetyCategory
): Promise<{ tips: SafetyTipItem[]; isOffline: boolean }> {
  try {
    let endpoint = '/api/safety-tips';
    if (category && category !== 'ALL') {
      endpoint += `?category=${encodeURIComponent(category)}`;
    }
    const data = await apiRequest<SafetyTipItem[]>(endpoint, {
      method: 'GET',
      timeoutMs: 4000,
    });
    return { tips: data, isOffline: false };
  } catch {
    // Graceful offline fallback
    if (!category || category === 'ALL') {
      return { tips: FALLBACK_SAFETY_TIPS, isOffline: true };
    }
    const filtered = FALLBACK_SAFETY_TIPS.filter(
      (tip) => tip.category.toUpperCase() === category.toUpperCase()
    );
    return { tips: filtered, isOffline: true };
  }
}

export async function fetchHelplines(): Promise<{
  helplines: SafetyTipItem[];
  isOffline: boolean;
}> {
  try {
    const data = await apiRequest<SafetyTipItem[]>('/api/safety-tips/helplines', {
      method: 'GET',
      timeoutMs: 4000,
    });
    return { helplines: data, isOffline: false };
  } catch {
    return { helplines: FALLBACK_HELPLINES, isOffline: true };
  }
}
