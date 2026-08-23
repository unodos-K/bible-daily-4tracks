"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Kakao: any;
  }
}

export default function KakaoInit() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.Kakao) {
      const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || process.env.NEXT_PUBLIC_KAKAO_API_KEY;
      
      if (!kakaoKey) {
        console.warn("카카오 API 키가 누락되었습니다.");
        return;
      }

      try {
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(kakaoKey);
        }
      } catch (e) {
        console.error("카카오 SDK 초기화 중 오류 발생:", e);
      }
    }
  }, []);

  return null;
}
