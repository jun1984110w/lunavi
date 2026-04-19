"use client";

import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { useEffect } from "react";

type Locale = "vi" | "ko" | "en";

type Props = {
  locale: string;
};

/**
 * 로그인 상태가 바뀔 때 장바구니를 Supabase carts 테이블과 맞춥니다.
 */
export function CartAuthSync({ locale }: Props) {
  const loc = (["vi", "ko", "en"].includes(locale) ? locale : "vi") as Locale;

  useEffect(() => {
    const supabase = createClient();

    const runSync = (userId: string) =>
      void useCartStore.getState().syncWithSupabase(userId, loc);

    void supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (uid) runSync(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.id) {
        runSync(session.user.id);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [loc]);

  return null;
}
