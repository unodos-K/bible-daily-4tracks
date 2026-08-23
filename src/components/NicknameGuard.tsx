"use client";

import React, { useEffect, useState } from "react";
import { getAuthUser, AuthUser } from "@/lib/auth";
import { fetchReadingSettings } from "@/lib/storage";
import NicknameOnboardingModal from "./NicknameOnboardingModal";

export default function NicknameGuard() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [cancellable, setCancellable] = useState(false);

  useEffect(() => {
    getAuthUser().then(async (user) => {
      setAuthUser(user);
      if (user && !user.nickname) {
        const settings = await fetchReadingSettings();
        if (settings?.hasStarted) {
          setCancellable(true);
        }
        setShowModal(true);
      }
    });
  }, []);

  const handleComplete = (nickname: string) => {
    if (authUser) {
      authUser.nickname = nickname;
      setAuthUser({ ...authUser });
    }
    setShowModal(false);
    // 상태 반영을 위해 약간의 딜레이 후 새로고침
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <NicknameOnboardingModal 
      isOpen={showModal} 
      onComplete={handleComplete} 
      cancellable={cancellable}
      onCancel={() => setShowModal(false)}
    />
  );
}
