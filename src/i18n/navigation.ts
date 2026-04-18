import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * 로케일 접두사가 붙는 Link·redirect·useRouter 등을 라우팅 설정과 맞춥니다.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
