'use client';

import { LegalPage } from '@/components/shared/legal-page';

const SECTIONS = [
  { titleKey: 'legal.t1t', bodyKey: 'legal.t1d' },
  { titleKey: 'legal.t2t', bodyKey: 'legal.t2d' },
  { titleKey: 'legal.t3t', bodyKey: 'legal.t3d' },
  { titleKey: 'legal.t4t', bodyKey: 'legal.t4d' },
  { titleKey: 'legal.t5t', bodyKey: 'legal.t5d' },
];

export default function TermsPage() {
  return <LegalPage titleKey="legal.termsTitle" sections={SECTIONS} />;
}
