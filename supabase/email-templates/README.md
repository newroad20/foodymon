# Supabase 메일 템플릿 (한국어)

Supabase → Authentication → Emails → Templates 에서 각 항목의 Subject와 Body(HTML)에 붙여넣기.
`{{ .ConfirmationURL }}` 은 Supabase가 링크로 바꿔 넣는 자리라 그대로 둔다.

| 템플릿 | Subject | Body |
|---|---|---|
| Confirm signup | `[푸디몬] 이메일 인증을 완료해 주세요` | `confirm-signup.html` |
| Reset password | `[푸디몬] 비밀번호 다시 정하기` | `reset-password.html` |
