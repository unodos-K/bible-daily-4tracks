"use client";

import React, { useEffect, useState } from "react";
import { fetchReadingSettings } from "@/lib/storage";
import NicknameOnboardingModal from "./NicknameOnboardingModal";
import { useAuth } from "./AuthProvider";

export default function NicknameGuard() {
  const { authUser, isAuthLoading } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const [cancellable, setCancellable] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    const checkNickname = async () => {
      if (authUser && !authUser.nickname) {
        const settings = await fetchReadingSettings(authUser.id);
        if (settings?.hasStarted) {
          setCancellable(true);
        }
        setShowModal(true);
      } else {
        setCancellable(false);
        setShowModal(false);
      }
    };
    void checkNickname();
  }, [authUser, isAuthLoading]);

  const handleComplete = (nickname: string) => {
    if (authUser) {
      authUser.nickname = nickname;
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
