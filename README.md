# 고전 읽기
GitHub Pages에 게시하는 개인 고전문학 리더. 본문·도표는 이 저장소에 포함하지 않습니다.

Supabase Auth 및 private Storage로 승인된 사용자에게 콘텐츠를 제공하고, RLS로 개인 하이라이트를 보호합니다. 하이라이트는 기기에 먼저 저장한 뒤 변경분만 전송합니다. 삭제 기록은 서버에 남겨 오래된 기기의 표시가 되살아나지 않도록 합니다.

설정: `supabase/schema.sql`을 적용하고, 승인할 인증 사용자를 `reader_members`에 추가합니다. `reader-private` 비공개 버킷에 `catalogue.json`을 업로드합니다. `src/config.js`에는 프로젝트 URL과 공개 publishable/anon 키만 설정합니다.

`npm ci`, `npm test`, `npm run build` 후 `docs`를 GitHub Pages로 게시합니다. 비밀 키와 본문 파일은 커밋하지 않습니다.
