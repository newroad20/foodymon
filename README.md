<div align="center">

![header](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12&height=180&section=header&text=Foodimon&fontSize=65&fontColor=ffffff)

**캐릭터를 돌보며 식사·수면·감정을 기록하는 습관 형성 앱**

![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)

[데모 체험하기](https://example.com) · [기획서](./docs/plan.md)

</div>

---

## 📖 소개

사용자가 식사·수면·감정을 기록하면 캐릭터가 함께 성장합니다.
기록이라는 지루한 행위를 돌봄이라는 동기로 바꾸는 것이 목표입니다.

## ✨ 주요 기능

| 기능 | 설명 | 상태 |
|---|---|---|
| 식사 기록 | 사진·시간 기반 기록 | ✅ 완료 |
| 수면 기록 | 취침/기상 시간 입력 | ✅ 완료 |
| 감정 기록 | 5단계 감정 선택 | ✅ 완료 |
| 캐릭터 성장 | 기록량에 따른 단계별 진화 | 🚧 개발 중 |
| 꾸미기 | 포인트로 아이템 구매 | 🚧 개발 중 |
| 메타버스 웹 | 캐릭터 공간 공유 | 📋 기획 단계 |

## 📱 화면

<div align="center">
<table>
  <tr>
    <td><img src="./docs/home.png" width="220"></td>
    <td><img src="./docs/meal.png" width="220"></td>
    <td><img src="./docs/grow.png" width="220"></td>
  </tr>
</table>
</div>

<details>
<summary><b>🛠 실행 방법</b></summary>

<br>

터미널에서 아래 명령을 차례로 실행합니다.

</details>

## 🗂 프로젝트 구조

\`\`\`
src/
├── screens/     # 화면 컴포넌트
├── components/  # 공통 UI
├── hooks/       # 커스텀 훅
└── utils/       # 보상·레벨 계산 로직
\`\`\`
