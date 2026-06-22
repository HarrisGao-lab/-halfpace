'use client';
import { useEffect, useState } from 'react';
import Onboarding, { isOnboarded } from './Onboarding';

export default function OnboardingGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isOnboarded()) setShow(true);
  }, []);

  if (!show) return null;
  return <Onboarding onDone={() => setShow(false)} />;
}
