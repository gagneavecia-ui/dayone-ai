'use client';

import { LegalPage } from '@/components/shared/legal-page';

const SECTIONS = [
  { titleKey: 'legal.p1t', bodyKey: 'legal.p1d' },
  { titleKey: 'legal.p2t', bodyKey: 'legal.p2d' },
  { titleKey: 'legal.p3t', bodyKey: 'legal.p3d' },
  { titleKey: 'legal.p4t', bodyKey: 'legal.p4d' },
  { titleKey: 'legal.p5t', bodyKey: 'legal.p5d' },
];

export default function PrivacyPolicyPage() {
  return <LegalPage titleKey="legal.privacyTitle" sections={SECTIONS} />;
}
